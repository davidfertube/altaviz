"""Integration tests for the ETL pipeline stages."""
import pytest
from datetime import datetime, timedelta
from pyspark.sql.types import (
    StructType, StructField, StringType, DoubleType, TimestampType,
)
from pyspark.sql.functions import col


@pytest.fixture
def bronze_df(spark):
    """Create a Bronze-layer-like DataFrame simulating raw sensor data."""
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

    base = datetime(2026, 1, 1, 0, 0)
    data = []
    # Generate 2 hours of 10-minute data for 2 compressors
    for comp_id in ["COMP-001", "COMP-002"]:
        for i in range(12):
            ts = base + timedelta(minutes=i * 10)
            vib = 2.5 if comp_id == "COMP-001" else 3.0
            temp = 200.0 if comp_id == "COMP-001" else 210.0
            data.append((
                comp_id, ts,
                vib + i * 0.05,
                temp + i * 0.5,
                60.0, 1100.0, 1400.0, 10000.0, 100.0 + i,
            ))

    # Add one outlier row (will have null vibration for quality test)
    data.append((
        "COMP-003", datetime(2026, 1, 1, 0, 0),
        None, None, None, None, None, None, None,
    ))

    return spark.createDataFrame(data, schema)


def test_silver_layer_removes_nulls(spark, bronze_df):
    """Test that Silver layer filters out rows with null critical fields."""
    from src.etl.data_quality import create_silver_layer

    silver_df = create_silver_layer(bronze_df)

    # The null row for COMP-003 should be removed
    assert silver_df.filter(col("compressor_id") == "COMP-003").count() == 0
    # Valid rows preserved
    assert silver_df.count() == 24  # 12 per compressor * 2


def test_silver_to_gold_pipeline(spark, bronze_df):
    """Test Silver -> Gold transformation pipeline end-to-end."""
    from src.etl.data_quality import create_silver_layer
    from src.etl.transformations import (
        add_rolling_window_features,
        add_rate_of_change_features,
        add_derived_metrics,
        add_threshold_flags,
        add_time_features,
    )

    # Silver layer
    silver_df = create_silver_layer(bronze_df)
    assert silver_df.count() > 0

    # Gold layer transformations (applied sequentially like the real pipeline)
    gold_df = add_rolling_window_features(silver_df)
    gold_df = add_rate_of_change_features(gold_df)
    gold_df = add_derived_metrics(gold_df)
    gold_df = add_threshold_flags(gold_df)
    gold_df = add_time_features(gold_df)

    # Should have all Gold features
    assert "vibration_1hr_mean" in gold_df.columns
    assert "temp_1hr_delta" in gold_df.columns
    assert "pressure_differential" in gold_df.columns
    assert "vibration_status" in gold_df.columns
    assert "hour_of_day" in gold_df.columns
    assert "date" in gold_df.columns

    # Row count should be preserved (no rows dropped in Gold)
    assert gold_df.count() == silver_df.count()


def test_gold_to_alerts_pipeline(spark, bronze_df):
    """Test Gold -> Alert generation pipeline."""
    from src.etl.data_quality import create_silver_layer
    from src.etl.transformations import (
        add_rolling_window_features,
        add_rate_of_change_features,
        add_derived_metrics,
        add_threshold_flags,
        add_time_features,
    )
    from src.etl.database_writer import generate_alerts

    silver_df = create_silver_layer(bronze_df)
    gold_df = add_rolling_window_features(silver_df)
    gold_df = add_rate_of_change_features(gold_df)
    gold_df = add_derived_metrics(gold_df)
    gold_df = add_threshold_flags(gold_df)
    gold_df = add_time_features(gold_df)

    alerts = generate_alerts(gold_df)

    # With normal-range data, all statuses should be "normal" -> 0 alerts
    assert alerts.count() == 0


def test_gold_aggregation(spark, bronze_df):
    """Test Gold -> Dashboard aggregation."""
    from src.etl.data_quality import create_silver_layer
    from src.etl.transformations import (
        add_rolling_window_features,
        add_rate_of_change_features,
        add_derived_metrics,
        add_threshold_flags,
        add_time_features,
        aggregate_for_dashboard,
    )

    silver_df = create_silver_layer(bronze_df)
    gold_df = add_rolling_window_features(silver_df)
    gold_df = add_rate_of_change_features(gold_df)
    gold_df = add_derived_metrics(gold_df)
    gold_df = add_threshold_flags(gold_df)
    gold_df = add_time_features(gold_df)

    agg_df = aggregate_for_dashboard(gold_df, window_type="1hr")

    # Should reduce rows (hourly aggregation of 10-min data)
    assert agg_df.count() < gold_df.count()
    # Should have window_type column
    assert "window_type" in agg_df.columns
    assert agg_df.first()["window_type"] == "1hr"
    # Should have required aggregation columns
    assert "vibration_mean" in agg_df.columns
    assert "discharge_temp_mean" in agg_df.columns
    assert "reading_count" in agg_df.columns


def test_quality_metrics_calculation(spark, bronze_df):
    """Test quality metrics are calculated correctly."""
    from src.etl.data_quality import create_silver_layer, calculate_quality_metrics

    silver_df = create_silver_layer(bronze_df)
    metrics = calculate_quality_metrics(bronze_df, silver_df, max_missing_rate=0.1)

    assert "freshness" in metrics
    assert "completeness" in metrics
    assert "consistency" in metrics
