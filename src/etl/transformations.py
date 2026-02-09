"""
Gold Layer Feature Engineering Transformations

This module implements feature engineering for the Gold layer:
- Rolling window aggregations (1hr, 4hr, 24hr) for time-series analysis
- Rate of change calculations (temperature and pressure gradients)
- Threshold status flags (normal, warning, critical)
- Time features (hour, day of week, weekend flag)
- Derived metrics (pressure differential)

Why multiple time windows?
- 1-hour window: Detects sudden anomalies (bearing failure starting)
- 4-hour window: Captures developing trends (gradual degradation)
- 24-hour window: Identifies long-term patterns (predictive of failure days ahead)

This enables ML models to learn both short-term and long-term degradation patterns.

Author: David Fernandez
"""

from pyspark.sql import DataFrame, Window
from pyspark.sql.functions import (
    col, avg, stddev, max as spark_max, min as spark_min,
    lag, when, hour, dayofweek, date_format,
    to_date, current_timestamp, lit
)
from typing import Dict
import logging

from src.etl.utils import load_config


logger = logging.getLogger('CompressorHealthETL')


# Load configurations
etl_config = load_config('etl_config.yaml')
thresholds = load_config('thresholds.yaml')


# ============================================================================
# ROLLING WINDOW AGGREGATIONS
# ============================================================================

def add_rolling_window_features(
    df: DataFrame,
    window_1hr: int = 3600,
    window_4hr: int = 14400,
    window_24hr: int = 86400
) -> DataFrame:
    """
    Add rolling window statistics for vibration, temperature, and pressure.

    Creates features capturing statistical patterns over different time horizons:
    - Mean: Average value over window (trend)
    - Std: Standard deviation over window (volatility)
    - Max: Maximum value over window (peaks)

    Args:
        df: Silver layer DataFrame
        window_1hr: 1-hour window in seconds (default 3600)
        window_4hr: 4-hour window in seconds (default 14400)
        window_24hr: 24-hour window in seconds (default 86400)

    Returns:
        DataFrame: Data with rolling window features added

    Example:
        >>> gold_df = add_rolling_window_features(silver_df)
        >>> # Creates vibration_1hr_mean, vibration_1hr_std, vibration_1hr_max, etc.
    """
    logger.info("Adding rolling window features...")

    # Define window specifications ONCE (critical for performance)
    # rangeBetween uses time-based windows (in seconds)
    # -3600 to 0 means "from 3600 seconds ago to current row"
    window_spec_1hr = Window \
        .partitionBy("compressor_id") \
        .orderBy(col("timestamp").cast("long")) \
        .rangeBetween(-window_1hr, 0)

    window_spec_4hr = Window \
        .partitionBy("compressor_id") \
        .orderBy(col("timestamp").cast("long")) \
        .rangeBetween(-window_4hr, 0)

    window_spec_24hr = Window \
        .partitionBy("compressor_id") \
        .orderBy(col("timestamp").cast("long")) \
        .rangeBetween(-window_24hr, 0)

    # Apply ALL transformations in SINGLE select() call (critical for performance)
    # This gives Catalyst optimizer full visibility for optimization
    df_with_features = df.select(
        col("*"),  # Keep all existing columns

        # === 1-HOUR WINDOW FEATURES ===
        # Vibration statistics
        avg("vibration_mms").over(window_spec_1hr).alias("vibration_1hr_mean"),
        stddev("vibration_mms").over(window_spec_1hr).alias("vibration_1hr_std"),
        spark_max("vibration_mms").over(window_spec_1hr).alias("vibration_1hr_max"),

        # Temperature statistics
        avg("discharge_temp_f").over(window_spec_1hr).alias("temp_1hr_mean"),
        stddev("discharge_temp_f").over(window_spec_1hr).alias("temp_1hr_std"),

        # Pressure statistics (discharge pressure)
        avg("discharge_pressure_psi").over(window_spec_1hr).alias("pressure_1hr_mean"),

        # === 4-HOUR WINDOW FEATURES ===
        avg("vibration_mms").over(window_spec_4hr).alias("vibration_4hr_mean"),
        avg("discharge_temp_f").over(window_spec_4hr).alias("temp_4hr_mean"),
        avg("discharge_pressure_psi").over(window_spec_4hr).alias("pressure_4hr_mean"),

        # === 24-HOUR WINDOW FEATURES ===
        avg("vibration_mms").over(window_spec_24hr).alias("vibration_24hr_mean"),
        avg("discharge_temp_f").over(window_spec_24hr).alias("temp_24hr_mean"),
        avg("discharge_pressure_psi").over(window_spec_24hr).alias("pressure_24hr_mean"),
    )

    logger.info("Rolling window features added (1hr, 4hr, 24hr)")
    return df_with_features


# ============================================================================
# RATE OF CHANGE FEATURES
# ============================================================================

def add_rate_of_change_features(df: DataFrame, lookback_periods: int = 6) -> DataFrame:
    """
    Add rate of change (gradient) features.

    Calculates how fast sensor values are changing:
    - Temperature gradient: °F per hour
    - Pressure gradient: PSI per hour

    Why this matters:
    A compressor with stable temp=220°F is healthy.
    A compressor with temp increasing 5°F/hour is degrading (failing in ~8 hours).

    Args:
        df: DataFrame with sensor readings
        lookback_periods: Number of readings to look back (default 6 = 1 hour at 10-min intervals)

    Returns:
        DataFrame: Data with rate of change features

    Example:
        >>> df_with_delta = add_rate_of_change_features(df, lookback_periods=6)
        >>> # temp_1hr_delta = (current_temp - temp_1hr_ago) / 1.0
    """
    logger.info("Adding rate of change features...")

    # Window for looking back N periods (ordered by timestamp)
    window_spec = Window \
        .partitionBy("compressor_id") \
        .orderBy("timestamp")

    # Get value from N periods ago using lag()
    df_with_delta = df.withColumn(
        "temp_prev",
        lag("discharge_temp_f", lookback_periods).over(window_spec)
    )

    # Calculate temperature change rate (°F per hour)
    # lookback_periods * 10 minutes = time span in minutes
    # Divide by 60 to get change per hour
    hours_span = (lookback_periods * 10) / 60.0

    df_with_delta = df_with_delta.withColumn(
        "temp_1hr_delta",
        when(
            col("temp_prev").isNotNull(),
            (col("discharge_temp_f") - col("temp_prev")) / lit(hours_span)
        ).otherwise(lit(None))
    )

    # Drop temporary column
    df_with_delta = df_with_delta.drop("temp_prev")

    logger.info("Rate of change features added")
    return df_with_delta


# ============================================================================
# DERIVED METRICS
# ============================================================================

def add_derived_metrics(df: DataFrame) -> DataFrame:
    """
    Add derived metrics calculated from primary sensors.

    Derived metrics:
    - Pressure differential: discharge_pressure - suction_pressure
      Indicates compression ratio and mechanical efficiency

    Args:
        df: DataFrame with sensor readings

    Returns:
        DataFrame: Data with derived metrics

    Example:
        >>> df_derived = add_derived_metrics(df)
        >>> # pressure_differential = discharge_pressure_psi - suction_pressure_psi
    """
    logger.info("Adding derived metrics...")

    df_derived = df.withColumn(
        "pressure_differential",
        col("discharge_pressure_psi") - col("suction_pressure_psi")
    )

    logger.info("Derived metrics added")
    return df_derived


# ============================================================================
# THRESHOLD STATUS FLAGS
# ============================================================================

def add_threshold_flags(df: DataFrame) -> DataFrame:
    """
    Add status flags based on sensor thresholds.

    Status levels:
    - 'normal': Within normal operating range
    - 'warning': Exceeds warning threshold (schedule inspection)
    - 'critical': Exceeds critical threshold (immediate action required)

    Uses thresholds from config/thresholds.yaml

    Args:
        df: DataFrame with sensor readings

    Returns:
        DataFrame: Data with threshold status columns

    Example:
        >>> df_flagged = add_threshold_flags(df)
        >>> # vibration_status, temp_status, pressure_status columns added
    """
    logger.info("Adding threshold status flags...")

    # Get thresholds from config
    vib_warning = thresholds['sensor_thresholds']['vibration_mms']['warning_threshold']
    vib_critical = thresholds['sensor_thresholds']['vibration_mms']['critical_threshold']

    temp_warning = thresholds['sensor_thresholds']['discharge_temp_f']['warning_threshold']
    temp_critical = thresholds['sensor_thresholds']['discharge_temp_f']['critical_threshold']

    pressure_warning = thresholds['sensor_thresholds']['discharge_pressure_psi']['warning_threshold_high']
    pressure_critical = thresholds['sensor_thresholds']['discharge_pressure_psi']['critical_threshold_high']

    # Vibration status
    df_flagged = df.withColumn(
        "vibration_status",
        when(col("vibration_mms") >= vib_critical, lit("critical"))
        .when(col("vibration_mms") >= vib_warning, lit("warning"))
        .otherwise(lit("normal"))
    )

    # Temperature status
    df_flagged = df_flagged.withColumn(
        "temp_status",
        when(col("discharge_temp_f") >= temp_critical, lit("critical"))
        .when(col("discharge_temp_f") >= temp_warning, lit("warning"))
        .otherwise(lit("normal"))
    )

    # Pressure status
    df_flagged = df_flagged.withColumn(
        "pressure_status",
        when(col("discharge_pressure_psi") >= pressure_critical, lit("critical"))
        .when(col("discharge_pressure_psi") >= pressure_warning, lit("warning"))
        .otherwise(lit("normal"))
    )

    logger.info("Threshold status flags added")
    return df_flagged


# ============================================================================
# TIME FEATURES
# ============================================================================

def add_time_features(df: DataFrame) -> DataFrame:
    """
    Add time-based features for ML models.

    Time features:
    - hour_of_day: 0-23 (captures daily operational patterns)
    - day_of_week: 1-7 (Monday=1, Sunday=7)
    - is_weekend: 0 or 1 (operational patterns differ on weekends)
    - date: Date only (for partitioning Gold layer)

    Why time features matter:
    Compressors behave differently during:
    - Day vs night (load variations)
    - Weekday vs weekend (operational schedules)
    ML models need to learn these temporal patterns.

    Args:
        df: DataFrame with 'timestamp' column

    Returns:
        DataFrame: Data with time features

    Example:
        >>> df_time = add_time_features(df)
        >>> # hour_of_day, day_of_week, is_weekend, date columns added
    """
    logger.info("Adding time features...")

    df_time = df.select(
        col("*"),
        hour("timestamp").alias("hour_of_day"),
        dayofweek("timestamp").alias("day_of_week"),
        when(dayofweek("timestamp").isin([1, 7]), lit(1)).otherwise(lit(0)).alias("is_weekend"),
        to_date("timestamp").alias("date")
    )

    logger.info("Time features added")
    return df_time


# ============================================================================
# MAIN GOLD TRANSFORMATION
# ============================================================================

def create_gold_layer(
    silver_df: DataFrame,
    window_sizes: Dict[str, int] = None
) -> DataFrame:
    """
    Apply all Gold layer transformations to create ML-ready features.

    Transformation pipeline:
    1. Rolling window aggregations (1hr, 4hr, 24hr)
    2. Rate of change calculations
    3. Derived metrics (pressure differential)
    4. Threshold status flags
    5. Time features
    6. Add processing timestamp

    Args:
        silver_df: Cleaned Silver layer DataFrame
        window_sizes: Dict with 'short', 'medium', 'long' window sizes in seconds
                     If None, uses values from etl_config.yaml

    Returns:
        DataFrame: Gold layer with 24+ engineered features per reading

    Example:
        >>> from src.etl.utils import create_spark_session
        >>> spark = create_spark_session()
        >>> silver_df = spark.read.format("delta").load("data/processed/delta/sensors_silver/")
        >>> gold_df = create_gold_layer(silver_df)
        >>> gold_df.write.format("delta").mode("append").partitionBy("date") \\
        >>>     .save("data/processed/delta/sensors_gold/")
    """
    logger.info("=" * 80)
    logger.info("STARTING GOLD LAYER TRANSFORMATION")
    logger.info("=" * 80)

    initial_count = silver_df.count()
    logger.info(f"Silver layer input: {initial_count} rows")

    # Get window sizes from config if not provided
    if window_sizes is None:
        window_sizes = {
            'short': etl_config['feature_engineering']['window_sizes']['short'],
            'medium': etl_config['feature_engineering']['window_sizes']['medium'],
            'long': etl_config['feature_engineering']['window_sizes']['long']
        }

    # Apply transformations
    logger.info("Step 1: Adding rolling window features...")
    df = add_rolling_window_features(
        silver_df,
        window_1hr=window_sizes['short'],
        window_4hr=window_sizes['medium'],
        window_24hr=window_sizes['long']
    )

    logger.info("Step 2: Adding rate of change features...")
    lookback = etl_config['feature_engineering']['rate_of_change']['temp_lookback_periods']
    df = add_rate_of_change_features(df, lookback_periods=lookback)

    logger.info("Step 3: Adding derived metrics...")
    df = add_derived_metrics(df)

    logger.info("Step 4: Adding threshold status flags...")
    df = add_threshold_flags(df)

    logger.info("Step 5: Adding time features...")
    df = add_time_features(df)

    logger.info("Step 6: Adding Gold processing timestamp...")
    df = df.withColumn('gold_processed_at', current_timestamp())

    final_count = df.count()

    logger.info("=" * 80)
    logger.info("GOLD LAYER TRANSFORMATION COMPLETE")
    logger.info(f"Input:  {initial_count} rows")
    logger.info(f"Output: {final_count} rows")
    logger.info(f"Features: {len(df.columns)} total columns")
    logger.info("=" * 80)

    return df


# ============================================================================
# AGGREGATION FOR POSTGRESQL
# ============================================================================

def aggregate_for_dashboard(
    gold_df: DataFrame,
    window_type: str = "1hr"
) -> DataFrame:
    """
    Aggregate Gold layer data for dashboard consumption.

    Creates hourly aggregates to reduce data volume for the database.
    Column names match the sensor_readings_agg table schema exactly.

    Args:
        gold_df: Gold layer DataFrame
        window_type: Window type for aggregation ('1hr', '4hr', '24hr')

    Returns:
        DataFrame: Aggregated data matching sensor_readings_agg schema
    """
    from pyspark.sql.functions import count, sum as spark_sum, when, isnull

    logger.info(f"Aggregating Gold layer for dashboard (window_type={window_type})...")

    initial_count = gold_df.count()

    # Group by compressor and hour, producing columns that match sensor_readings_agg table
    agg_df = gold_df.groupBy(
        "compressor_id",
        date_format("timestamp", "yyyy-MM-dd HH:00:00").cast("timestamp").alias("agg_timestamp")
    ).agg(
        # Vibration statistics (mm/s)
        avg("vibration_mms").alias("vibration_mean"),
        stddev("vibration_mms").alias("vibration_std"),
        spark_max("vibration_mms").alias("vibration_max"),
        spark_min("vibration_mms").alias("vibration_min"),

        # Temperature statistics (F)
        avg("discharge_temp_f").alias("discharge_temp_mean"),
        stddev("discharge_temp_f").alias("discharge_temp_std"),
        spark_max("discharge_temp_f").alias("discharge_temp_max"),
        avg("temp_1hr_delta").alias("discharge_temp_rate_of_change"),

        # Suction pressure statistics (PSI)
        avg("suction_pressure_psi").alias("suction_pressure_mean"),
        stddev("suction_pressure_psi").alias("suction_pressure_std"),
        spark_min("suction_pressure_psi").alias("suction_pressure_min"),

        # Discharge pressure statistics (PSI)
        avg("discharge_pressure_psi").alias("discharge_pressure_mean"),
        stddev("discharge_pressure_psi").alias("discharge_pressure_std"),
        spark_max("discharge_pressure_psi").alias("discharge_pressure_max"),

        # Derived metrics
        avg("pressure_differential").alias("pressure_delta_mean"),

        # Performance metrics
        avg("horsepower_consumption").alias("horsepower_mean"),
        stddev("horsepower_consumption").alias("horsepower_std"),
        avg("gas_flow_mcf").alias("gas_flow_mean"),

        # Data quality metrics
        count("*").alias("reading_count"),
        spark_sum(
            when(isnull("vibration_mms"), 1).otherwise(0)
        ).alias("missing_readings")
    )

    # Add window_type column
    agg_df = agg_df.withColumn("window_type", lit(window_type))

    final_count = agg_df.count()
    reduction = (1 - final_count / initial_count) * 100 if initial_count > 0 else 0

    logger.info(f"Aggregation complete: {initial_count} rows -> {final_count} rows ({reduction:.1f}% reduction)")

    return agg_df
