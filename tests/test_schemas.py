"""Test ETL schema definitions."""
import pytest
from pyspark.sql.types import StructType


def test_sensor_schema_exists():
    """Verify sensor schema can be imported and has expected fields."""
    from src.etl.schemas import SENSOR_SCHEMA

    assert isinstance(SENSOR_SCHEMA, StructType)
    field_names = [f.name for f in SENSOR_SCHEMA.fields]
    assert "compressor_id" in field_names
    assert "timestamp" in field_names
    assert "vibration_mms" in field_names
    assert "discharge_temp_f" in field_names


def test_metadata_schema_exists():
    """Verify metadata schema can be imported."""
    from src.etl.schemas import METADATA_SCHEMA

    assert isinstance(METADATA_SCHEMA, StructType)
    field_names = [f.name for f in METADATA_SCHEMA.fields]
    assert "compressor_id" in field_names
    assert "station_id" in field_names


def test_sensor_schema_parses_valid_data(spark, sample_sensor_data):
    """Verify the sample data conforms to expected structure."""
    assert sample_sensor_data.count() == 6
    assert "compressor_id" in sample_sensor_data.columns
    assert "vibration" in sample_sensor_data.columns


def test_sensor_schema_field_count():
    """Verify schema has expected number of fields."""
    from src.etl.schemas import SENSOR_SCHEMA

    # Should have compressor_id, timestamp, and sensor fields
    assert len(SENSOR_SCHEMA.fields) >= 6


def test_gold_schema_has_features():
    """Verify Gold schema includes engineered features."""
    from src.etl.schemas import GOLD_SCHEMA

    field_names = [f.name for f in GOLD_SCHEMA.fields]
    assert "vibration_1hr_mean" in field_names
    assert "temp_1hr_delta" in field_names
    assert "vibration_status" in field_names
    assert "date" in field_names


def test_get_schema_by_name():
    """Verify schema lookup function."""
    from src.etl.schemas import get_schema_by_name, SENSOR_SCHEMA

    assert get_schema_by_name("sensor") is SENSOR_SCHEMA

    with pytest.raises(ValueError, match="Unknown schema"):
        get_schema_by_name("nonexistent")
