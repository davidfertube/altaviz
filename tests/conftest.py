import pytest
import os
import sys

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


@pytest.fixture(scope="session")
def spark():
    """Create a SparkSession for testing (no Delta Lake required)."""
    from pyspark.sql import SparkSession

    spark = (
        SparkSession.builder.master("local[2]")
        .appName("AltavizTests")
        .config("spark.driver.memory", "1g")
        .config("spark.ui.enabled", "false")
        .getOrCreate()
    )
    yield spark
    spark.stop()


@pytest.fixture
def sample_sensor_data(spark):
    """Create a small test DataFrame with known sensor values."""
    from pyspark.sql.types import (
        StructType,
        StructField,
        StringType,
        DoubleType,
        TimestampType,
    )
    from datetime import datetime

    schema = StructType(
        [
            StructField("compressor_id", StringType(), False),
            StructField("timestamp", TimestampType(), False),
            StructField("vibration", DoubleType(), True),
            StructField("temperature", DoubleType(), True),
            StructField("pressure_in", DoubleType(), True),
            StructField("pressure_out", DoubleType(), True),
            StructField("horsepower", DoubleType(), True),
            StructField("flow_rate", DoubleType(), True),
        ]
    )

    data = [
        ("COMP-001", datetime(2026, 1, 1, 0, 0), 2.5, 180.0, 100.0, 400.0, 350.0, 5.0),
        ("COMP-001", datetime(2026, 1, 1, 0, 10), 2.7, 182.0, 101.0, 401.0, 352.0, 5.1),
        ("COMP-001", datetime(2026, 1, 1, 0, 20), 3.0, 185.0, 99.0, 399.0, 348.0, 4.9),
        ("COMP-002", datetime(2026, 1, 1, 0, 0), 1.5, 170.0, 98.0, 395.0, 340.0, 4.8),
        ("COMP-002", datetime(2026, 1, 1, 0, 10), 1.6, 171.0, 97.0, 396.0, 341.0, 4.7),
        # Outlier row for testing data quality
        ("COMP-003", datetime(2026, 1, 1, 0, 0), 50.0, 500.0, 10.0, 900.0, 800.0, 20.0),
    ]

    return spark.createDataFrame(data, schema)
