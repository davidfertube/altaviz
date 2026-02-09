"""Test data quality module."""
import pytest
from datetime import datetime


def test_null_removal(spark, sample_sensor_data):
    """Test that null values are handled in the silver layer."""
    from pyspark.sql.types import StructType, StructField, StringType, DoubleType, TimestampType

    # Create a row with null sensor values (but valid ID and timestamp)
    null_schema = sample_sensor_data.schema
    null_row = spark.createDataFrame(
        [("COMP-004", datetime(2026, 1, 1, 1, 0), None, None, None, None, None, None)],
        null_schema,
    )
    df_with_nulls = sample_sensor_data.union(null_row)
    assert df_with_nulls.count() == 7

    # Filter out rows where sensor columns are null
    cleaned = df_with_nulls.filter(
        df_with_nulls.vibration.isNotNull()
        & df_with_nulls.temperature.isNotNull()
    )
    assert cleaned.count() == 6  # The null-sensor row should be removed


def test_outlier_detection(spark, sample_sensor_data):
    """Test that extreme values can be detected."""
    from pyspark.sql.functions import col, mean, stddev

    stats = sample_sensor_data.agg(
        mean("vibration").alias("mean_vib"),
        stddev("vibration").alias("std_vib"),
    ).collect()[0]

    # The outlier row (COMP-003 with vibration=50.0) should be detectable
    # With small sample size, use 2-sigma threshold for reliable detection
    threshold = stats["mean_vib"] + 2 * stats["std_vib"]
    outliers = sample_sensor_data.filter(col("vibration") > threshold)
    assert outliers.count() >= 1
    assert outliers.first()["compressor_id"] == "COMP-003"


def test_data_quality_preserves_valid_rows(spark, sample_sensor_data):
    """Ensure valid rows are not removed during quality checks."""
    valid = sample_sensor_data.filter(
        (sample_sensor_data.vibration < 10)
        & (sample_sensor_data.temperature < 300)
    )
    assert valid.count() == 5  # All except the outlier
