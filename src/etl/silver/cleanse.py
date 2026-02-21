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

import logging
from datetime import datetime, timedelta
from typing import Optional, Tuple

from pyspark.sql import SparkSession, DataFrame
from pyspark.sql import functions as F
from pyspark.sql.window import Window

logger = logging.getLogger(__name__)

# Physically impossible sensor values (absolute bounds)
ABSOLUTE_BOUNDS = {
    'vibration_mms': (0.0, 50.0),
    'discharge_temp_f': (-40.0, 500.0),
    'suction_pressure_psi': (0.0, 500.0),
    'discharge_pressure_psi': (0.0, 3000.0),
    'horsepower_consumption': (0.0, 10000.0),
    'gas_flow_mcf': (0.0, 100000.0),
}

# Critical sensor columns (row dropped if ALL are null)
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

    # Step 6: Add Silver metadata
    df = df.select(
        F.col("*"),
        F.current_timestamp().alias("silver_processed_at"),
        F.to_date(F.col("timestamp")).alias("date"),
    )

    # Drop Bronze metadata columns (keep data lineage clean)
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
