"""
Integration Tests — OneLake Connectivity and Pipeline End-to-End

Tests the full pipeline flow with local filesystem (no Azure required).
The OneLakeClient falls back to local paths when not in Fabric.

Author: David Fernandez
"""

import pytest
import os
import shutil
from datetime import datetime, timedelta

from pyspark.sql import SparkSession
from pyspark.sql import functions as F


@pytest.fixture(scope="module")
def spark():
    """Create a local SparkSession for testing."""
    session = (
        SparkSession.builder
        .master("local[2]")
        .appName("AltavizIntegrationTest")
        .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension")
        .config("spark.sql.catalog.spark_catalog", "org.apache.spark.sql.delta.catalog.DeltaCatalog")
        .config("spark.jars.packages", "io.delta:delta-spark_2.12:3.0.0")
        .config("spark.driver.memory", "2g")
        .getOrCreate()
    )
    yield session
    session.stop()


@pytest.fixture(scope="module")
def sample_data(spark):
    """Generate sample sensor data for testing."""
    from src.etl.schemas import SENSOR_SCHEMA

    rows = []
    base_time = datetime.now() - timedelta(days=2)

    for comp_idx in range(10):
        comp_id = f"COMP-{comp_idx+1:04d}"
        for reading_idx in range(288):
            ts = base_time + timedelta(minutes=reading_idx * 5)
            rows.append((
                comp_id, ts,
                3.0 + (comp_idx * 0.1),
                200.0 + (comp_idx * 2),
                60.0 + (comp_idx * 1.5),
                1050.0 + (comp_idx * 10),
                1400.0 + (comp_idx * 20),
                10000.0 + (comp_idx * 100),
                float(reading_idx * 5 / 60),
            ))

    return spark.createDataFrame(rows, schema=SENSOR_SCHEMA)


@pytest.fixture(autouse=True)
def cleanup_test_data():
    """Clean up test Delta tables after each test."""
    yield
    for path in ['data/test/delta/bronze', 'data/test/delta/silver', 'data/test/delta/gold']:
        if os.path.exists(path):
            shutil.rmtree(path)


class TestOneLakeClient:
    def test_client_initializes_in_local_mode(self, spark):
        from src.etl.onelake import OneLakeClient
        client = OneLakeClient(spark)
        assert not client.is_fabric

    def test_get_lakehouse_path_returns_local(self, spark):
        from src.etl.onelake import OneLakeClient
        client = OneLakeClient(spark)
        path = client.get_lakehouse_path("bronze")
        assert "data/processed/delta" in path

    def test_write_and_read_table(self, spark, sample_data):
        sample_data.write.format("delta").mode("overwrite").save("data/test/delta/bronze")
        df = spark.read.format("delta").load("data/test/delta/bronze")
        assert df.count() == sample_data.count()


class TestSilverCleansing:
    def test_deduplication(self, spark, sample_data):
        from src.etl.silver.cleanse import deduplicate
        duped = sample_data.union(sample_data)
        deduped = deduplicate(duped)
        assert deduped.count() == sample_data.count()

    def test_range_validation(self, spark, sample_data):
        from src.etl.silver.cleanse import validate_ranges
        bad = spark.createDataFrame(
            [("COMP-9999", datetime.now(), 100.0, 200.0, 60.0, 1050.0, 1400.0, 10000.0, 1.0)],
            schema=sample_data.schema
        )
        cleaned = validate_ranges(sample_data.union(bad))
        assert cleaned.count() == sample_data.count()

    def test_null_handling(self, spark):
        from src.etl.silver.cleanse import handle_nulls
        from src.etl.schemas import SENSOR_SCHEMA
        rows = [
            ("COMP-0001", datetime.now(), 3.0, 200.0, 60.0, 1050.0, 1400.0, 10000.0, 1.0),
            ("COMP-0002", datetime.now(), None, None, None, None, 1400.0, 10000.0, 1.0),
            ("COMP-0003", datetime.now(), 3.0, None, None, None, 1400.0, 10000.0, 1.0),
        ]
        df = spark.createDataFrame(rows, schema=SENSOR_SCHEMA)
        assert handle_nulls(df).count() == 2


class TestGoldAggregation:
    def test_creates_window_features(self, spark, sample_data):
        from src.etl.gold.aggregate import create_gold_layer
        gold = create_gold_layer(sample_data)
        for col in ["vibration_1hr_mean", "vibration_4hr_mean", "vibration_24hr_mean",
                     "pressure_differential", "vibration_status", "date"]:
            assert col in gold.columns

    def test_hourly_aggregation_reduces_rows(self, spark, sample_data):
        from src.etl.gold.aggregate import create_gold_layer, aggregate_hourly
        gold = create_gold_layer(sample_data)
        hourly = aggregate_hourly(gold)
        assert hourly.count() < gold.count()

    def test_alert_generation(self, spark):
        from src.etl.gold.aggregate import create_gold_layer, generate_alerts
        from src.etl.schemas import SENSOR_SCHEMA
        rows = [("COMP-0001", datetime.now(), 10.0, 200.0, 60.0, 1050.0, 1400.0, 10000.0, 1.0)]
        df = spark.createDataFrame(rows, schema=SENSOR_SCHEMA)
        gold = create_gold_layer(df)
        alerts = generate_alerts(gold)
        assert alerts.count() >= 1


class TestDataQuality:
    def test_quality_report_structure(self, spark, sample_data):
        from src.etl.silver.quality import run_quality_checks
        report = run_quality_checks(sample_data, expected_compressors=10)
        assert isinstance(report.overall_passed, bool)
        assert len(report.checks) > 0

    def test_fleet_completeness_passes(self, spark, sample_data):
        from src.etl.silver.quality import check_fleet_completeness
        assert check_fleet_completeness(sample_data, expected=10).passed

    def test_fleet_completeness_fails_when_missing(self, spark, sample_data):
        from src.etl.silver.quality import check_fleet_completeness
        assert not check_fleet_completeness(sample_data, expected=4700).passed
