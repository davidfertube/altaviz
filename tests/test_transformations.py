"""Test Gold layer transformation functions."""
import pytest
from datetime import datetime, timedelta
from pyspark.sql.types import (
    StructType, StructField, StringType, DoubleType, TimestampType,
)
from pyspark.sql.functions import col, lit


@pytest.fixture
def silver_df(spark):
    """Create a small Silver-layer-like DataFrame for transformation tests."""
    schema = StructType([
        StructField("compressor_id", StringType(), False),
        StructField("timestamp", TimestampType(), False),
        StructField("vibration_mms", DoubleType(), True),
        StructField("discharge_temp_f", DoubleType(), True),
        StructField("suction_pressure_psi", DoubleType(), True),
        StructField("discharge_pressure_psi", DoubleType(), True),
        StructField("horsepower_consumption", DoubleType(), True),
        StructField("gas_flow_mcf", DoubleType(), True),
        StructField("operating_hours", DoubleType(), True),
    ])

    # 12 rows for COMP-001 at 10-minute intervals (2 hours) to test rolling windows
    base = datetime(2026, 1, 1, 0, 0)
    data = []
    for i in range(12):
        ts = base + timedelta(minutes=i * 10)
        data.append((
            "COMP-001", ts,
            2.5 + i * 0.1,      # vibration: gradually increasing
            200.0 + i * 1.0,     # temp: gradually increasing
            60.0,                 # suction pressure: constant
            1100.0,              # discharge pressure: constant
            1400.0,              # horsepower: constant
            10000.0,             # gas flow: constant
            100.0 + i,          # operating hours
        ))

    return spark.createDataFrame(data, schema)


def test_add_derived_metrics(silver_df):
    """Test pressure differential calculation."""
    from src.etl.transformations import add_derived_metrics

    result = add_derived_metrics(silver_df)
    assert "pressure_differential" in result.columns

    row = result.first()
    expected = 1100.0 - 60.0  # discharge - suction
    assert abs(row["pressure_differential"] - expected) < 0.01


def test_add_time_features(silver_df):
    """Test time feature extraction."""
    from src.etl.transformations import add_time_features

    result = add_time_features(silver_df)
    assert "hour_of_day" in result.columns
    assert "day_of_week" in result.columns
    assert "is_weekend" in result.columns
    assert "date" in result.columns

    row = result.first()
    assert row["hour_of_day"] == 0  # midnight


def test_add_threshold_flags(silver_df):
    """Test threshold status flag assignment."""
    from src.etl.transformations import add_threshold_flags

    result = add_threshold_flags(silver_df)
    assert "vibration_status" in result.columns
    assert "temp_status" in result.columns
    assert "pressure_status" in result.columns

    # All readings are in normal range
    statuses = [row["vibration_status"] for row in result.collect()]
    assert all(s == "normal" for s in statuses)


def test_add_rate_of_change_features(silver_df):
    """Test rate of change calculation."""
    from src.etl.transformations import add_rate_of_change_features

    # Use lookback of 6 (1 hour at 10-min intervals)
    result = add_rate_of_change_features(silver_df, lookback_periods=6)
    assert "temp_1hr_delta" in result.columns

    # First 6 rows should have null delta (no lookback data)
    rows = result.orderBy("timestamp").collect()
    for i in range(6):
        assert rows[i]["temp_1hr_delta"] is None

    # Row 6+ should have non-null delta
    assert rows[6]["temp_1hr_delta"] is not None
    # Temperature increases by 1.0 per 10 min = 6.0 per hour, delta = 6.0/1.0 = 6.0
    assert abs(rows[6]["temp_1hr_delta"] - 6.0) < 0.1


def test_add_rolling_window_features(silver_df):
    """Test rolling window aggregation features."""
    from src.etl.transformations import add_rolling_window_features

    result = add_rolling_window_features(
        silver_df,
        window_1hr=3600,
        window_4hr=14400,
        window_24hr=86400,
    )

    expected_cols = [
        "vibration_1hr_mean", "vibration_1hr_std", "vibration_1hr_max",
        "temp_1hr_mean", "temp_1hr_std", "pressure_1hr_mean",
        "vibration_4hr_mean", "temp_4hr_mean", "pressure_4hr_mean",
        "vibration_24hr_mean", "temp_24hr_mean", "pressure_24hr_mean",
    ]
    for c in expected_cols:
        assert c in result.columns

    # Check that mean is reasonable (should be close to the data range)
    last_row = result.orderBy(col("timestamp").desc()).first()
    assert last_row["vibration_1hr_mean"] is not None
    assert 2.0 < last_row["vibration_1hr_mean"] < 4.0
