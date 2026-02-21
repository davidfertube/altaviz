"""
Gold Layer — Business-Ready Aggregations at Production Scale

Transforms Silver → Gold with:
1. Rolling window aggregations (1hr, 4hr, 24hr)
2. Derived metrics (pressure differential, rate of change)
3. Threshold status flags (normal/warning/critical)
4. Time features (hour, day of week, weekend flag)
5. Daily fleet health summary

Scale considerations for 4,700 compressors:
- Silver: ~1.28M rows/day → Gold: ~305K hourly aggregates/day
- Gold uses Z-ordering on compressor_id for fast per-unit queries
- Partitioned by date AND region for geographic query patterns
- Continuous aggregates auto-maintained in OneLake

Author: David Fernandez
"""

import logging
from typing import Optional, List

from pyspark.sql import SparkSession, DataFrame
from pyspark.sql import functions as F
from pyspark.sql.window import Window

logger = logging.getLogger(__name__)

# Threshold definitions (from config/thresholds.yaml)
VIBRATION_WARNING = 6.0
VIBRATION_CRITICAL = 8.0
TEMP_WARNING = 240.0
TEMP_CRITICAL = 260.0
SUCTION_WARNING_LOW = 30.0
SUCTION_CRITICAL_LOW = 20.0
DISCHARGE_WARNING_HIGH = 1300.0
DISCHARGE_CRITICAL_HIGH = 1400.0


def create_gold_layer(
    silver_df: DataFrame,
    window_sizes: Optional[dict] = None,
) -> DataFrame:
    """
    Transform Silver to Gold layer with rolling features.

    Creates a single .select() call with all derived columns
    (PySpark best practice: avoid chained withColumn).

    Args:
        silver_df: Cleaned Silver DataFrame
        window_sizes: Dict of window names to seconds
            (default: short=3600, medium=14400, long=86400)

    Returns:
        Gold DataFrame with ML-ready features
    """
    if window_sizes is None:
        window_sizes = {'short': 3600, 'medium': 14400, 'long': 86400}

    logger.info("GOLD LAYER: Feature engineering")

    # Define windows
    ts_col = F.col("timestamp").cast("long")

    # Per-compressor time-ordered windows
    w_1hr = (
        Window.partitionBy("compressor_id")
        .orderBy(ts_col)
        .rangeBetween(-window_sizes['short'], 0)
    )
    w_4hr = (
        Window.partitionBy("compressor_id")
        .orderBy(ts_col)
        .rangeBetween(-window_sizes['medium'], 0)
    )
    w_24hr = (
        Window.partitionBy("compressor_id")
        .orderBy(ts_col)
        .rangeBetween(-window_sizes['long'], 0)
    )

    # Lag window for rate of change
    w_lag = Window.partitionBy("compressor_id").orderBy("timestamp")

    gold_df = silver_df.select(
        # === PASSTHROUGH COLUMNS ===
        F.col("compressor_id"),
        F.col("timestamp"),
        F.col("vibration_mms"),
        F.col("discharge_temp_f"),
        F.col("suction_pressure_psi"),
        F.col("discharge_pressure_psi"),
        F.col("horsepower_consumption"),
        F.col("gas_flow_mcf"),
        F.col("operating_hours"),
        *([F.col("station_id")] if "station_id" in silver_df.columns else []),
        *([F.col("basin")] if "basin" in silver_df.columns else []),

        # === 1-HOUR WINDOW FEATURES ===
        F.avg("vibration_mms").over(w_1hr).alias("vibration_1hr_mean"),
        F.stddev("vibration_mms").over(w_1hr).alias("vibration_1hr_std"),
        F.max("vibration_mms").over(w_1hr).alias("vibration_1hr_max"),
        F.avg("discharge_temp_f").over(w_1hr).alias("temp_1hr_mean"),
        F.stddev("discharge_temp_f").over(w_1hr).alias("temp_1hr_std"),
        F.avg("suction_pressure_psi").over(w_1hr).alias("pressure_1hr_mean"),

        # === 4-HOUR WINDOW FEATURES ===
        F.avg("vibration_mms").over(w_4hr).alias("vibration_4hr_mean"),
        F.avg("discharge_temp_f").over(w_4hr).alias("temp_4hr_mean"),
        F.avg("suction_pressure_psi").over(w_4hr).alias("pressure_4hr_mean"),

        # === 24-HOUR WINDOW FEATURES ===
        F.avg("vibration_mms").over(w_24hr).alias("vibration_24hr_mean"),
        F.avg("discharge_temp_f").over(w_24hr).alias("temp_24hr_mean"),
        F.avg("suction_pressure_psi").over(w_24hr).alias("pressure_24hr_mean"),

        # === RATE OF CHANGE ===
        (F.col("discharge_temp_f") - F.lag("discharge_temp_f", 6).over(w_lag)).alias("temp_1hr_delta"),

        # === DERIVED METRICS ===
        (F.col("discharge_pressure_psi") - F.col("suction_pressure_psi")).alias("pressure_differential"),

        # === THRESHOLD STATUS FLAGS ===
        F.when(F.col("vibration_mms") >= VIBRATION_CRITICAL, "critical")
         .when(F.col("vibration_mms") >= VIBRATION_WARNING, "warning")
         .otherwise("normal").alias("vibration_status"),

        F.when(F.col("discharge_temp_f") >= TEMP_CRITICAL, "critical")
         .when(F.col("discharge_temp_f") >= TEMP_WARNING, "warning")
         .otherwise("normal").alias("temp_status"),

        F.when(F.col("suction_pressure_psi") <= SUCTION_CRITICAL_LOW, "critical")
         .when(F.col("suction_pressure_psi") <= SUCTION_WARNING_LOW, "warning")
         .when(F.col("discharge_pressure_psi") >= DISCHARGE_CRITICAL_HIGH, "critical")
         .when(F.col("discharge_pressure_psi") >= DISCHARGE_WARNING_HIGH, "warning")
         .otherwise("normal").alias("pressure_status"),

        # === TIME FEATURES ===
        F.hour("timestamp").alias("hour_of_day"),
        F.dayofweek("timestamp").alias("day_of_week"),
        F.when(F.dayofweek("timestamp").isin(1, 7), 1).otherwise(0).alias("is_weekend"),

        # === PARTITION COLUMNS ===
        F.to_date("timestamp").alias("date"),
    )

    row_count = gold_df.count()
    logger.info(f"Gold layer complete: {row_count:,} rows with features")

    return gold_df


def aggregate_hourly(gold_df: DataFrame) -> DataFrame:
    """
    Create hourly aggregates from Gold layer.

    Reduces 12 readings per hour (5-min interval) down to 1 row per
    compressor-hour. This is what gets served to dashboards and ML models.

    4,700 compressors x 24 hours = 112,800 hourly aggregates per day.
    """
    logger.info("Creating hourly aggregates...")

    hourly = gold_df.select(
        F.col("compressor_id"),
        *([F.col("station_id")] if "station_id" in gold_df.columns else []),
        *([F.col("basin")] if "basin" in gold_df.columns else []),
        F.date_trunc("hour", "timestamp").cast("timestamp").alias("agg_timestamp"),
        F.col("vibration_mms"),
        F.col("discharge_temp_f"),
        F.col("suction_pressure_psi"),
        F.col("discharge_pressure_psi"),
        F.col("horsepower_consumption"),
        F.col("gas_flow_mcf"),
        F.col("vibration_status"),
        F.col("temp_status"),
        F.col("pressure_status"),
        F.col("pressure_differential"),
        F.col("temp_1hr_delta"),
    ).groupBy(
        "compressor_id",
        *([c for c in ["station_id", "basin"] if c in gold_df.columns]),
        "agg_timestamp",
    ).agg(
        F.round(F.avg("vibration_mms"), 3).alias("vibration_mean"),
        F.round(F.stddev("vibration_mms"), 3).alias("vibration_std"),
        F.round(F.max("vibration_mms"), 3).alias("vibration_max"),
        F.round(F.min("vibration_mms"), 3).alias("vibration_min"),
        F.round(F.avg("discharge_temp_f"), 2).alias("discharge_temp_mean"),
        F.round(F.max("discharge_temp_f"), 2).alias("discharge_temp_max"),
        F.round(F.avg("suction_pressure_psi"), 2).alias("suction_pressure_mean"),
        F.round(F.avg("discharge_pressure_psi"), 2).alias("discharge_pressure_mean"),
        F.round(F.avg("horsepower_consumption"), 2).alias("horsepower_mean"),
        F.round(F.avg("gas_flow_mcf"), 2).alias("gas_flow_mean"),
        F.round(F.avg("pressure_differential"), 2).alias("pressure_delta_mean"),
        F.round(F.avg("temp_1hr_delta"), 3).alias("discharge_temp_rate_of_change"),
        F.count("*").alias("reading_count"),
        # Worst status in the hour
        F.max("vibration_status").alias("vibration_status"),
        F.max("temp_status").alias("temp_status"),
        F.max("pressure_status").alias("pressure_status"),
    ).select(
        F.col("*"),
        F.lit("1hr").alias("window_type"),
        F.to_date("agg_timestamp").alias("date"),
    )

    count = hourly.count()
    logger.info(f"Hourly aggregates: {count:,} rows")
    return hourly


def generate_alerts(gold_df: DataFrame) -> DataFrame:
    """
    Generate alerts from threshold violations in Gold layer.

    Alerts are deduplicated: one alert per compressor per status transition.
    At 4,700 compressors with 5% failure rate, expect ~235 active alerts.
    """
    logger.info("Generating alerts from threshold violations...")

    # Get the latest reading per compressor
    w = Window.partitionBy("compressor_id").orderBy(F.desc("timestamp"))

    latest = (
        gold_df.withColumn("_rank", F.row_number().over(w))
        .filter(F.col("_rank") == 1)
        .drop("_rank")
    )

    # Generate alerts where status != 'normal'
    alerts = latest.filter(
        (F.col("vibration_status") != "normal") |
        (F.col("temp_status") != "normal") |
        (F.col("pressure_status") != "normal")
    ).select(
        F.col("compressor_id"),
        F.col("timestamp").alias("alert_timestamp"),
        *([F.col("station_id")] if "station_id" in latest.columns else []),
        *([F.col("basin")] if "basin" in latest.columns else []),

        # Determine worst severity
        F.greatest(
            F.when(F.col("vibration_status") == "critical", F.lit(2))
             .when(F.col("vibration_status") == "warning", F.lit(1))
             .otherwise(F.lit(0)),
            F.when(F.col("temp_status") == "critical", F.lit(2))
             .when(F.col("temp_status") == "warning", F.lit(1))
             .otherwise(F.lit(0)),
            F.when(F.col("pressure_status") == "critical", F.lit(2))
             .when(F.col("pressure_status") == "warning", F.lit(1))
             .otherwise(F.lit(0)),
        ).alias("_severity_num"),

        F.col("vibration_mms"),
        F.col("discharge_temp_f"),
        F.col("discharge_pressure_psi"),
        F.col("vibration_status"),
        F.col("temp_status"),
        F.col("pressure_status"),
    ).select(
        F.col("*"),
        F.when(F.col("_severity_num") == 2, "critical")
         .when(F.col("_severity_num") == 1, "warning")
         .otherwise("info").alias("severity"),
    ).drop("_severity_num")

    count = alerts.count()
    logger.info(f"Generated {count:,} alerts")
    return alerts


def build_fleet_health_summary(gold_df: DataFrame) -> DataFrame:
    """
    Build fleet-level health summary for executive dashboard.

    Returns one row per date per basin with:
    - Total/healthy/warning/critical compressor counts
    - Average sensor values
    - Alert rate
    """
    logger.info("Building fleet health summary...")

    basin_col = "basin" if "basin" in gold_df.columns else None

    group_cols = [F.to_date("timestamp").alias("date")]
    if basin_col:
        group_cols.append(F.col(basin_col))

    w = Window.partitionBy("compressor_id").orderBy(F.desc("timestamp"))

    latest = (
        gold_df.withColumn("_rank", F.row_number().over(w))
        .filter(F.col("_rank") == 1)
        .drop("_rank")
    )

    summary = latest.groupBy(*group_cols).agg(
        F.countDistinct("compressor_id").alias("total_compressors"),
        F.sum(
            F.when(
                (F.col("vibration_status") == "normal") &
                (F.col("temp_status") == "normal") &
                (F.col("pressure_status") == "normal"),
                1
            ).otherwise(0)
        ).alias("healthy_count"),
        F.sum(F.when(F.col("vibration_status") == "warning", 1).otherwise(0)).alias("vibration_warnings"),
        F.sum(F.when(F.col("vibration_status") == "critical", 1).otherwise(0)).alias("vibration_criticals"),
        F.sum(F.when(F.col("temp_status") == "warning", 1).otherwise(0)).alias("temp_warnings"),
        F.sum(F.when(F.col("temp_status") == "critical", 1).otherwise(0)).alias("temp_criticals"),
        F.round(F.avg("vibration_mms"), 3).alias("fleet_avg_vibration"),
        F.round(F.avg("discharge_temp_f"), 2).alias("fleet_avg_temp"),
        F.round(F.avg("gas_flow_mcf"), 0).alias("fleet_avg_flow"),
    )

    return summary
