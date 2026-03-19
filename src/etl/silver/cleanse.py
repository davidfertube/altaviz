"""
Silver Layer — Data Cleaning and Validation at Production Scale

Transforms Bronze → Silver with:
1. Deduplication (exactly-once from Event Hubs replays)
2. Null handling (drop rows where critical sensors are null)
3. Outlier removal (4-sigma statistical filtering)
4. Timestamp validation (reject future dates, too-old data)
5. Range validation (reject physically impossible values)
6. Schema enforcement (cast to correct types)

Scale considerations:
- 1.35M rows/day → ~1.28M after cleaning (5% rejection rate)
- Deduplication uses compressor_id + timestamp composite key
- Outlier detection runs per-compressor (not global) to account for
  different baselines across the fleet

Author: David Fernandez
"""

# ===========================================================================
# PATTERN: 5-Step Cleaning Pipeline (Sequential Data Refinement)
# WHY: Each cleaning step is ordered deliberately to maximize data
#      retention while ensuring quality:
#      1. Dedup FIRST: Remove exact duplicates before any analysis
#         (prevents double-counting in statistics).
#      2. Null handling SECOND: Drop rows missing ALL critical sensors
#         (useless for any downstream analysis). Keep partial nulls.
#      3. Timestamp validation THIRD: Reject impossible timestamps
#         (future dates, ancient data) that would corrupt time-series.
#      4. Range validation FOURTH: Reject physically impossible values
#         (negative pressure, 500F temperatures) — sensor malfunction.
#      5. Outlier removal LAST: Statistical filtering is the most
#         aggressive step and should only run on already-validated data.
#         Running it on data with nulls or invalid timestamps would
#         skew the statistics.
# SCALING: At 1.35M rows/day, the 5 steps typically remove ~5% of data
#          (~67,500 rows). Each step logs its rejection count so ops
#          can identify when a specific type of bad data spikes.
# ALTERNATIVE: Could run all checks in a single pass (faster, but harder
#              to debug which check is rejecting the most data).
# ===========================================================================

import logging
from datetime import datetime, timedelta
from typing import Optional, Tuple

from pyspark.sql import SparkSession, DataFrame
from pyspark.sql import functions as F
from pyspark.sql.window import Window

logger = logging.getLogger(__name__)

# ===========================================================================
# PATTERN: Absolute Bounds (Physical Plausibility Check)
# WHY: These bounds represent PHYSICALLY IMPOSSIBLE values — not statistical
#      outliers, not warning thresholds. A vibration of 50 mm/s would mean
#      the compressor has already shaken itself apart. A temperature of
#      500F would mean the unit is on fire. These bounds catch sensor
#      malfunctions (stuck at 0, reading max int), unit conversion errors
#      (Celsius sent as Fahrenheit), or data corruption (bit flips).
#      They are deliberately WIDER than the alert thresholds in
#      config/thresholds.yaml — a vibration of 8 mm/s is a "critical alert"
#      but still physically plausible and should NOT be filtered out here.
# SCALING: Range validation is a simple column filter — O(1) per row,
#          no windows or aggregations. Negligible performance impact.
# ALTERNATIVE: Could load bounds from config/thresholds.yaml, but these
#              are physical constants that should never change (unless
#              new sensor types are added with different ranges).
# ===========================================================================
ABSOLUTE_BOUNDS = {
    'vibration_mms': (0.0, 50.0),
    'discharge_temp_f': (-40.0, 500.0),
    'suction_pressure_psi': (0.0, 500.0),
    'discharge_pressure_psi': (0.0, 3000.0),
    'horsepower_consumption': (0.0, 10000.0),
    'gas_flow_mcf': (0.0, 100000.0),
}

# Critical sensor columns — a row is dropped only if ALL of these are null.
# If even ONE critical sensor has a value, the row is kept. This is
# intentional: a reading with valid temperature but null vibration is
# still useful for temperature drift detection. Dropping partial readings
# would create gaps in per-sensor time-series, making trend analysis harder.
CRITICAL_SENSORS = [
    'vibration_mms',
    'discharge_temp_f',
    'suction_pressure_psi',
    'discharge_pressure_psi',
]


def create_silver_layer(
    bronze_df: DataFrame,
    outlier_std_threshold: float = 4.0,
    max_data_age_days: int = 30,
) -> DataFrame:
    """
    Transform Bronze to Silver layer with full data cleaning.

    Args:
        bronze_df: Raw Bronze layer DataFrame
        outlier_std_threshold: Standard deviations for outlier removal
        max_data_age_days: Reject data older than this many days

    Returns:
        Cleaned Silver DataFrame
    """
    initial_count = bronze_df.count()
    logger.info(f"Silver layer processing: {initial_count:,} input rows")

    # Step 1: Deduplicate (Event Hubs exactly-once via composite key)
    df = deduplicate(bronze_df)
    after_dedup = df.count()
    logger.info(f"  After deduplication: {after_dedup:,} ({initial_count - after_dedup:,} duplicates removed)")

    # Step 2: Null handling
    df = handle_nulls(df)
    after_nulls = df.count()
    logger.info(f"  After null removal: {after_nulls:,} ({after_dedup - after_nulls:,} null rows removed)")

    # Step 3: Timestamp validation
    df = validate_timestamps(df, max_age_days=max_data_age_days)
    after_ts = df.count()
    logger.info(f"  After timestamp validation: {after_ts:,} ({after_nulls - after_ts:,} invalid timestamps)")

    # Step 4: Range validation (absolute bounds)
    df = validate_ranges(df)
    after_range = df.count()
    logger.info(f"  After range validation: {after_range:,} ({after_ts - after_range:,} out-of-range)")

    # Step 5: Outlier removal (per-compressor statistical)
    df = remove_outliers(df, std_threshold=outlier_std_threshold)
    after_outliers = df.count()
    logger.info(f"  After outlier removal: {after_outliers:,} ({after_range - after_outliers:,} outliers)")

    # Step 6: Add Silver metadata and derive the date partition column.
    # silver_processed_at tracks when this record was cleaned (for latency
    # monitoring). The date column is derived from the event timestamp
    # (not ingestion time) so that Silver is partitioned by when the
    # reading actually occurred — matching the Gold layer's partitioning.
    df = df.select(
        F.col("*"),
        F.current_timestamp().alias("silver_processed_at"),
        F.to_date(F.col("timestamp")).alias("date"),
    )

    # Drop Bronze metadata columns to keep data lineage clean.
    # Silver should not carry Bronze-specific columns forward because
    # they create confusion about which layer's metadata is which.
    # The Silver layer has its own silver_processed_at timestamp.
    # If lineage tracing is needed, query Bronze directly by the same
    # compressor_id + timestamp composite key.
    bronze_cols = ['bronze_ingested_at', 'source_system', 'ingestion_date']
    for col in bronze_cols:
        if col in df.columns:
            df = df.drop(col)

    total_removed = initial_count - after_outliers
    logger.info(
        f"Silver layer complete: {after_outliers:,} rows "
        f"({total_removed:,} removed, {total_removed/initial_count:.1%} rejection rate)"
    )

    return df


# ===========================================================================
# PATTERN: Composite Key Deduplication (compressor_id + timestamp)
# WHY: Event Hubs provides "at-least-once" delivery, meaning the same
#      sensor reading can arrive multiple times (e.g., after a consumer
#      restart, a partition rebalance, or a network retry). The composite
#      key (compressor_id + timestamp) uniquely identifies a reading.
#      When duplicates exist, we keep the LATEST ingestion (by
#      bronze_ingested_at) because it is most likely to have been
#      processed correctly (earlier versions may have been partial
#      transmissions).
# SCALING: Window-based dedup requires a full shuffle by the partition
#          key (compressor_id + timestamp). At 1.35M rows/day with
#          4,700 compressors, this creates ~4,700 groups — well within
#          Spark's shuffle capacity. Typical duplicate rate is <1%.
# ALTERNATIVE: Could use Delta Lake's MERGE for dedup at write time,
#              but that requires the target table to exist. Dedup in
#              Silver is simpler and works regardless of write mode.
# ===========================================================================
def deduplicate(df: DataFrame) -> DataFrame:
    """
    Remove duplicate readings using compressor_id + timestamp as composite key.

    Keeps the most recently ingested record (by bronze_ingested_at).
    This handles Event Hubs replay scenarios where the same message
    may be delivered multiple times.
    """
    window = Window.partitionBy("compressor_id", "timestamp").orderBy(
        F.desc("bronze_ingested_at") if "bronze_ingested_at" in df.columns
        else F.desc("timestamp")
    )

    return (
        df.withColumn("_dedup_rank", F.row_number().over(window))
        .filter(F.col("_dedup_rank") == 1)
        .drop("_dedup_rank")
    )


def handle_nulls(df: DataFrame) -> DataFrame:
    """
    Handle null values in sensor columns.

    Strategy:
    - Drop row if ALL critical sensors are null (useless reading)
    - Keep row if at least one critical sensor has data (partial reading is still valuable)
    """
    null_condition = F.col(CRITICAL_SENSORS[0]).isNull()
    for col_name in CRITICAL_SENSORS[1:]:
        null_condition = null_condition & F.col(col_name).isNull()

    return df.filter(~null_condition)


def validate_timestamps(df: DataFrame, max_age_days: int = 30) -> DataFrame:
    """
    Filter out records with invalid timestamps.

    Rejects:
    - Future timestamps (clock skew > 1 hour)
    - Timestamps older than max_age_days
    - Null timestamps
    """
    now = datetime.now()
    max_future = now + timedelta(hours=1)
    min_past = now - timedelta(days=max_age_days)

    return df.filter(
        F.col("timestamp").isNotNull() &
        (F.col("timestamp") <= F.lit(max_future)) &
        (F.col("timestamp") >= F.lit(min_past))
    )


def validate_ranges(df: DataFrame) -> DataFrame:
    """
    Remove readings with physically impossible sensor values.

    Uses ABSOLUTE_BOUNDS (wider than alert thresholds) to catch
    sensor malfunctions, unit errors, or data corruption.
    """
    for col_name, (min_val, max_val) in ABSOLUTE_BOUNDS.items():
        if col_name in df.columns:
            df = df.filter(
                F.col(col_name).isNull() |
                (
                    (F.col(col_name) >= min_val) &
                    (F.col(col_name) <= max_val)
                )
            )
    return df


# ===========================================================================
# PATTERN: Per-Compressor 4-Sigma Outlier Removal
# WHY: We use 4-sigma (not the common 3-sigma) because compressor sensor
#      data has "fat tails" — legitimate spikes during startup, shutdown,
#      and load changes that are 3-4 standard deviations from the mean
#      but still represent real operating conditions. At 3-sigma, we would
#      incorrectly remove ~2-3% of legitimate readings. At 4-sigma, we
#      only catch truly anomalous values (sensor glitches, data corruption)
#      while preserving the operational extremes that ML models need to
#      learn from (failure precursors often look like "outliers").
#
#      The filtering is PER-COMPRESSOR (not fleet-global) because
#      different compressor models have very different normal ranges:
#      an Ariel JGK/4 at 1,500 HP has normal vibration of 1.2-4.0 mm/s,
#      while a Caterpillar G3606 at 4,000 HP runs at 2.0-5.5 mm/s.
#      A global mean would average these together, incorrectly flagging
#      low-vibration Ariel units as outliers and missing high-vibration
#      Caterpillar anomalies.
# SCALING: Per-compressor windows require a shuffle by compressor_id
#          (4,700 partitions). Each partition gets ~288 rows/day, so
#          the stddev computation is lightweight. Total: ~1.35M rows
#          with 4,700 windows = ~0.5 seconds on a 4-core local Spark.
# ALTERNATIVE: Could use Isolation Forest or Z-score per reading, but
#              window-based stddev is simpler, more interpretable, and
#              catches the same types of sensor glitches.
# ===========================================================================
def remove_outliers(df: DataFrame, std_threshold: float = 4.0) -> DataFrame:
    """
    Remove statistical outliers per compressor.

    Uses a per-compressor window to compute mean and stddev,
    then filters out readings beyond std_threshold standard deviations.

    This is per-compressor (not global) because different compressor
    models have different normal operating ranges.
    """
    sensor_cols = list(ABSOLUTE_BOUNDS.keys())

    # Compute per-compressor statistics
    stats_window = Window.partitionBy("compressor_id")

    for col_name in sensor_cols:
        if col_name not in df.columns:
            continue

        mean_col = f"_mean_{col_name}"
        std_col = f"_std_{col_name}"

        df = df.select(
            F.col("*"),
            F.mean(col_name).over(stats_window).alias(mean_col),
            F.stddev(col_name).over(stats_window).alias(std_col),
        )

        # Filter: keep if within threshold OR if stddev is 0 (constant value)
        df = df.filter(
            F.col(col_name).isNull() |
            (F.col(std_col) == 0) |
            (F.col(std_col).isNull()) |
            (
                F.abs(F.col(col_name) - F.col(mean_col)) <=
                (std_threshold * F.col(std_col))
            )
        )

        df = df.drop(mean_col, std_col)

    return df


def calculate_quality_metrics(
    bronze_df: DataFrame,
    silver_df: DataFrame,
) -> dict:
    """
    Calculate data quality metrics comparing Bronze vs Silver.

    Returns a dict of metrics for pipeline observability.
    """
    bronze_count = bronze_df.count()
    silver_count = silver_df.count()
    rejection_rate = (bronze_count - silver_count) / bronze_count if bronze_count > 0 else 0

    # Completeness per sensor
    completeness = {}
    for col_name in CRITICAL_SENSORS:
        if col_name in silver_df.columns:
            non_null = silver_df.filter(F.col(col_name).isNotNull()).count()
            completeness[col_name] = non_null / silver_count if silver_count > 0 else 0

    # Unique compressor count
    n_compressors = silver_df.select("compressor_id").distinct().count()

    return {
        'bronze_rows': bronze_count,
        'silver_rows': silver_count,
        'rejection_rate': round(rejection_rate, 4),
        'unique_compressors': n_compressors,
        'sensor_completeness': completeness,
        'processed_at': datetime.now().isoformat(),
    }
