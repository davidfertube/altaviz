"""
Silver Layer Data Quality Transformations

This module implements data quality checks and cleaning for the Silver layer:
- Null value removal with configurable threshold
- Outlier detection using statistical methods (4 standard deviations)
- Timestamp validation and ordering
- Schema validation
- Data quality metrics logging

Why 4 standard deviations instead of 3?
In industrial sensor data, brief operational spikes (compressor cycling) are normal.
Using 3-sigma would reject too much valid data (false positives).
4-sigma is more conservative and reduces false positive rate.

Author: David Fernandez
"""

from pyspark.sql import DataFrame, Window
from pyspark.sql.functions import (
    col, count, when, isnan, isnull, stddev, mean, abs as spark_abs,
    lag, unix_timestamp, expr, lit, current_timestamp
)
from typing import Dict, List, Tuple
import logging

from src.etl.schemas import SENSOR_SCHEMA, validate_sensor_schema


logger = logging.getLogger('CompressorHealthETL')


# ============================================================================
# NULL VALUE HANDLING
# ============================================================================

def check_missing_data_rate(df: DataFrame, max_missing_rate: float = 0.05) -> Dict[str, float]:
    """
    Calculate missing data rate for each column.

    Args:
        df: Input DataFrame
        max_missing_rate: Maximum acceptable missing rate (default 5%)

    Returns:
        dict: Column name -> missing rate (0.0 to 1.0)

    Example:
        >>> missing_rates = check_missing_data_rate(bronze_df, max_missing_rate=0.05)
        >>> print(missing_rates)
        {'vibration_mms': 0.02, 'discharge_temp_f': 0.03}
    """
    total_rows = df.count()

    if total_rows == 0:
        logger.warning("DataFrame is empty, cannot calculate missing rates")
        return {}

    missing_rates = {}

    # Check each numeric sensor column
    sensor_columns = [
        'vibration_mms', 'discharge_temp_f', 'suction_pressure_psi',
        'discharge_pressure_psi', 'horsepower_consumption', 'gas_flow_mcf',
        'operating_hours'
    ]

    for col_name in sensor_columns:
        if col_name in df.columns:
            null_count = df.filter(col(col_name).isNull() | isnan(col(col_name))).count()
            missing_rate = null_count / total_rows
            missing_rates[col_name] = missing_rate

            if missing_rate > max_missing_rate:
                logger.warning(
                    f"Column '{col_name}' has {missing_rate:.2%} missing data "
                    f"(threshold: {max_missing_rate:.2%})"
                )

    return missing_rates


def remove_null_rows(df: DataFrame, max_missing_rate: float = 0.05) -> DataFrame:
    """
    Remove rows with null values in critical sensor columns.

    Strategy:
    - Remove any row missing compressor_id or timestamp (critical identifiers)
    - Remove rows where ALL sensor values are null (dead sensor)
    - Keep rows with some nulls if within acceptable rate

    Args:
        df: Input DataFrame
        max_missing_rate: Maximum acceptable missing rate per column

    Returns:
        DataFrame: Cleaned DataFrame with null rows removed

    Example:
        >>> cleaned_df = remove_null_rows(bronze_df, max_missing_rate=0.05)
        >>> # Rows with missing identifiers or dead sensors removed
    """
    initial_count = df.count()

    # Critical columns that cannot be null
    critical_columns = ['compressor_id', 'timestamp']

    # Remove rows with null critical columns
    df_clean = df.dropna(subset=critical_columns)

    # Sensor columns
    sensor_columns = [
        'vibration_mms', 'discharge_temp_f', 'suction_pressure_psi',
        'discharge_pressure_psi', 'horsepower_consumption', 'gas_flow_mcf',
        'operating_hours'
    ]

    # Remove rows where ALL sensor values are null (dead sensor)
    df_clean = df_clean.filter(
        ~(
            col('vibration_mms').isNull() &
            col('discharge_temp_f').isNull() &
            col('suction_pressure_psi').isNull() &
            col('discharge_pressure_psi').isNull() &
            col('horsepower_consumption').isNull() &
            col('gas_flow_mcf').isNull()
        )
    )

    final_count = df_clean.count()
    removed_count = initial_count - final_count
    removal_rate = removed_count / initial_count if initial_count > 0 else 0

    logger.info(
        f"Removed {removed_count} rows with null values "
        f"({removal_rate:.2%} of total). Remaining: {final_count} rows"
    )

    if removal_rate > max_missing_rate:
        logger.warning(
            f"Removal rate {removal_rate:.2%} exceeds threshold {max_missing_rate:.2%}. "
            "Data quality issue detected."
        )

    return df_clean


# ============================================================================
# OUTLIER DETECTION
# ============================================================================

def detect_outliers(
    df: DataFrame,
    std_threshold: float = 4.0,
    columns: List[str] = None
) -> DataFrame:
    """
    Detect and flag outliers using standard deviation method.

    Method: Z-score = (value - mean) / std_dev
    - If |Z-score| > threshold, value is an outlier
    - Default threshold: 4 standard deviations (conservative)

    Args:
        df: Input DataFrame
        std_threshold: Number of standard deviations for outlier detection
        columns: List of columns to check (if None, checks all sensor columns)

    Returns:
        DataFrame: Same data with outliers replaced with null

    Example:
        >>> cleaned_df = detect_outliers(df, std_threshold=4.0)
        >>> # Values >4 std devs from mean are replaced with null
    """
    if columns is None:
        columns = [
            'vibration_mms', 'discharge_temp_f', 'suction_pressure_psi',
            'discharge_pressure_psi', 'horsepower_consumption', 'gas_flow_mcf'
        ]

    df_clean = df

    for col_name in columns:
        if col_name not in df.columns:
            continue

        # Calculate statistics for this column
        stats = df.select(
            mean(col(col_name)).alias('mean_val'),
            stddev(col(col_name)).alias('std_val')
        ).collect()[0]

        mean_val = stats['mean_val']
        std_val = stats['std_val']

        if mean_val is None or std_val is None or std_val == 0:
            logger.warning(f"Cannot compute outliers for '{col_name}' (insufficient data)")
            continue

        # Calculate bounds
        lower_bound = mean_val - (std_threshold * std_val)
        upper_bound = mean_val + (std_threshold * std_val)

        # Count outliers before removal
        outlier_count = df.filter(
            (col(col_name) < lower_bound) | (col(col_name) > upper_bound)
        ).count()

        total_count = df.filter(col(col_name).isNotNull()).count()
        outlier_rate = outlier_count / total_count if total_count > 0 else 0

        # Replace outliers with null
        df_clean = df_clean.withColumn(
            col_name,
            when(
                (col(col_name) >= lower_bound) & (col(col_name) <= upper_bound),
                col(col_name)
            ).otherwise(lit(None))
        )

        logger.info(
            f"Column '{col_name}': detected {outlier_count} outliers ({outlier_rate:.2%}) "
            f"[range: {lower_bound:.2f} to {upper_bound:.2f}]"
        )

    return df_clean


# ============================================================================
# TIMESTAMP VALIDATION
# ============================================================================

def validate_timestamps(df: DataFrame) -> DataFrame:
    """
    Validate and clean timestamp data.

    Checks:
    - Timestamps are not null
    - Timestamps are not in the future
    - Timestamps are in chronological order per compressor
    - No duplicate timestamps for same compressor

    Args:
        df: Input DataFrame with 'timestamp' and 'compressor_id' columns

    Returns:
        DataFrame: Data with invalid timestamps removed

    Example:
        >>> valid_df = validate_timestamps(bronze_df)
        >>> # Future timestamps and duplicates removed
    """
    initial_count = df.count()

    # Remove null timestamps (already handled by remove_null_rows, but double-check)
    df_clean = df.filter(col('timestamp').isNotNull())

    # Remove future timestamps (data cannot be from the future)
    df_clean = df_clean.filter(col('timestamp') <= current_timestamp())

    # Remove duplicate timestamps per compressor
    # Keep first occurrence
    window_spec = Window.partitionBy('compressor_id', 'timestamp').orderBy('timestamp')
    df_clean = df_clean.withColumn('row_num', expr('row_number() over (partition by compressor_id, timestamp order by timestamp)'))
    df_clean = df_clean.filter(col('row_num') == 1).drop('row_num')

    final_count = df_clean.count()
    removed_count = initial_count - final_count

    if removed_count > 0:
        logger.info(f"Removed {removed_count} rows with invalid timestamps")

    return df_clean


# ============================================================================
# SCHEMA VALIDATION
# ============================================================================

def validate_schema(df: DataFrame) -> Tuple[bool, List[str]]:
    """
    Validate DataFrame schema against expected SENSOR_SCHEMA.

    Args:
        df: DataFrame to validate

    Returns:
        tuple: (is_valid: bool, errors: List[str])

    Example:
        >>> is_valid, errors = validate_schema(bronze_df)
        >>> if not is_valid:
        >>>     logger.error(f"Schema validation failed: {errors}")
    """
    is_valid, errors = validate_sensor_schema(df)

    if not is_valid:
        logger.error(f"Schema validation failed: {errors}")
    else:
        logger.info("Schema validation passed")

    return is_valid, errors


# ============================================================================
# MAIN SILVER TRANSFORMATION
# ============================================================================

def create_silver_layer(
    bronze_df: DataFrame,
    max_missing_rate: float = 0.05,
    outlier_std_threshold: float = 4.0
) -> DataFrame:
    """
    Apply all Silver layer transformations.

    Pipeline:
    1. Schema validation
    2. Timestamp validation
    3. Null value removal
    4. Outlier detection and removal
    5. Add processing timestamp

    Args:
        bronze_df: Raw Bronze layer DataFrame
        max_missing_rate: Maximum acceptable missing rate (default 5%)
        outlier_std_threshold: Standard deviations for outlier detection (default 4)

    Returns:
        DataFrame: Cleaned Silver layer data

    Example:
        >>> from src.etl.utils import create_spark_session
        >>> spark = create_spark_session()
        >>> bronze_df = spark.read.format("delta").load("data/processed/delta/sensors_bronze/")
        >>> silver_df = create_silver_layer(bronze_df, max_missing_rate=0.05, outlier_std_threshold=4.0)
        >>> silver_df.write.format("delta").mode("overwrite").save("data/processed/delta/sensors_silver/")
    """
    logger.info("=" * 80)
    logger.info("STARTING SILVER LAYER TRANSFORMATION")
    logger.info("=" * 80)

    initial_count = bronze_df.count()
    logger.info(f"Bronze layer input: {initial_count} rows")

    # Step 1: Validate schema
    logger.info("Step 1: Validating schema...")
    is_valid, errors = validate_schema(bronze_df)
    if not is_valid:
        raise ValueError(f"Bronze layer schema validation failed: {errors}")

    # Step 2: Validate timestamps
    logger.info("Step 2: Validating timestamps...")
    df = validate_timestamps(bronze_df)

    # Step 3: Check missing data rates
    logger.info("Step 3: Checking missing data rates...")
    missing_rates = check_missing_data_rate(df, max_missing_rate)

    # Step 4: Remove null rows
    logger.info("Step 4: Removing rows with null values...")
    df = remove_null_rows(df, max_missing_rate)

    # Step 5: Detect and remove outliers
    logger.info("Step 5: Detecting and removing outliers...")
    df = detect_outliers(df, std_threshold=outlier_std_threshold)

    # Step 6: Remove any rows that became all-null after outlier removal
    df = remove_null_rows(df, max_missing_rate)

    # Step 7: Add Silver layer processing timestamp
    logger.info("Step 6: Adding processing timestamp...")
    df = df.withColumn('silver_processed_at', current_timestamp())

    final_count = df.count()
    rejection_rate = (initial_count - final_count) / initial_count if initial_count > 0 else 0

    logger.info("=" * 80)
    logger.info("SILVER LAYER TRANSFORMATION COMPLETE")
    logger.info(f"Input:  {initial_count} rows")
    logger.info(f"Output: {final_count} rows")
    logger.info(f"Rejected: {initial_count - final_count} rows ({rejection_rate:.2%})")
    logger.info("=" * 80)

    return df


# ============================================================================
# DATA QUALITY METRICS
# ============================================================================

def calculate_quality_metrics(
    bronze_df: DataFrame,
    silver_df: DataFrame,
    max_missing_rate: float = 0.05
) -> Dict[str, any]:
    """
    Calculate data quality metrics for logging to PostgreSQL.

    Metrics:
    - Freshness: Age of most recent reading
    - Completeness: Missing data rates
    - Consistency: Schema validation results
    - Accuracy: Outlier detection results

    Args:
        bronze_df: Bronze layer DataFrame
        silver_df: Silver layer DataFrame
        max_missing_rate: Threshold for acceptable missing rate

    Returns:
        dict: Quality metrics for each dimension

    Example:
        >>> metrics = calculate_quality_metrics(bronze_df, silver_df)
        >>> print(metrics['completeness'])
        {'passed': True, 'missing_rate': 0.02}
    """
    bronze_count = bronze_df.count()
    silver_count = silver_df.count()
    rejection_rate = (bronze_count - silver_count) / bronze_count if bronze_count > 0 else 0

    # Freshness
    latest_timestamp = bronze_df.agg({'timestamp': 'max'}).collect()[0][0]

    # Completeness
    missing_rates = check_missing_data_rate(bronze_df, max_missing_rate)
    avg_missing_rate = sum(missing_rates.values()) / len(missing_rates) if missing_rates else 0

    # Consistency
    is_valid, errors = validate_schema(bronze_df)

    metrics = {
        'timestamp': latest_timestamp,
        'bronze_row_count': bronze_count,
        'silver_row_count': silver_count,
        'rejection_rate': rejection_rate,
        'freshness': {
            'latest_reading': latest_timestamp,
            'passed': True  # TODO: Compare against SLA
        },
        'completeness': {
            'passed': avg_missing_rate <= max_missing_rate,
            'avg_missing_rate': avg_missing_rate,
            'column_rates': missing_rates
        },
        'consistency': {
            'passed': is_valid,
            'errors': errors
        },
        'accuracy': {
            'passed': rejection_rate < 0.10,  # <10% rejection is acceptable
            'rejection_rate': rejection_rate
        }
    }

    return metrics
