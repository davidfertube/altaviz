"""Tests for Heuristic Remaining Useful Life (RUL) calculator.

Includes a regression test for the dict.get(key, 0) bug where a key
exists with a None value -- dict.get returns None, not the default.
The _val() helper in the production code addresses this.
"""
import pytest
from datetime import datetime

from src.ml.rul_predictor import (
    calculate_rul,
    CRITICAL_THRESHOLDS,
    WARNING_THRESHOLDS,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _healthy_reading():
    """Return a sensor dict representing a healthy compressor."""
    return {
        "vibration_avg": 3.0,
        "discharge_temp_avg": 200.0,
        "discharge_pressure_avg": 1050.0,
    }


def _degraded_reading_4hr():
    """Return a 4hr sensor dict showing degradation in vibration and temp."""
    return {
        "vibration_avg": 7.5,       # Above warning (6.0), below critical (8.0)
        "discharge_temp_avg": 250.0, # Above warning (240), below critical (260)
        "discharge_pressure_avg": 1100.0,
    }


def _degraded_reading_24hr():
    """Return a 24hr sensor dict with lower (earlier) values to show increase."""
    return {
        "vibration_avg": 5.0,
        "discharge_temp_avg": 230.0,
        "discharge_pressure_avg": 1050.0,
    }


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_normal_operation():
    """Healthy compressor with stable readings should have low failure probability."""
    data_4hr = _healthy_reading()
    data_24hr = _healthy_reading()

    result = calculate_rul("COMP-001", data_4hr, data_24hr)

    assert result["compressor_id"] == "COMP-001"
    assert result["failure_probability"] == 0.0
    assert result["model_version"] == "heuristic-v1.0"


def test_degraded_compressor_has_rul():
    """Degrading compressor should have a predicted RUL and non-zero failure probability."""
    data_4hr = _degraded_reading_4hr()
    data_24hr = _degraded_reading_24hr()

    result = calculate_rul("COMP-003", data_4hr, data_24hr)

    assert result["failure_probability"] > 0.0
    assert result["primary_risk_sensor"] is not None
    # RUL may or may not be set depending on the rate thresholds
    # but with vibration going from 5.0 to 7.5 over 20 hours:
    # rate = (7.5 - 5.0) / 20 = 0.125 > 0.05 threshold
    assert result["predicted_rul_hours"] is not None
    assert result["predicted_rul_hours"] > 0


def test_none_values_regression():
    """Regression test: dict.get(key, 0) returns None when key exists with None value.

    The _val() helper should coerce None to the default value (0).
    """
    data_4hr = {
        "vibration_avg": None,
        "discharge_temp_avg": None,
        "discharge_pressure_avg": None,
    }
    data_24hr = {
        "vibration_avg": None,
        "discharge_temp_avg": None,
        "discharge_pressure_avg": None,
    }

    # This should NOT raise a TypeError
    result = calculate_rul("COMP-NONE", data_4hr, data_24hr)

    assert result["compressor_id"] == "COMP-NONE"
    assert result["failure_probability"] == 0.0
    assert result["predicted_rul_hours"] is None


def test_partial_none_values():
    """Mixed None and valid values should be handled without error."""
    data_4hr = {
        "vibration_avg": 7.0,
        "discharge_temp_avg": None,  # None for temp only
        "discharge_pressure_avg": 1100.0,
    }
    data_24hr = {
        "vibration_avg": 5.0,
        "discharge_temp_avg": None,
        "discharge_pressure_avg": 1050.0,
    }

    result = calculate_rul("COMP-PARTIAL", data_4hr, data_24hr)
    # Should not raise; vibration rate = (7.0 - 5.0) / 20 = 0.1 > 0.05
    assert result["compressor_id"] == "COMP-PARTIAL"
    assert isinstance(result["failure_probability"], float)


def test_missing_keys_regression():
    """Keys entirely absent from dicts should default to 0 via _val()."""
    data_4hr = {}
    data_24hr = {}

    result = calculate_rul("COMP-EMPTY-DICT", data_4hr, data_24hr)

    assert result["compressor_id"] == "COMP-EMPTY-DICT"
    assert result["failure_probability"] == 0.0


def test_no_data_returns_defaults():
    """None data inputs should return safe default predictions."""
    result = calculate_rul("COMP-NODATA", None, None)

    assert result["compressor_id"] == "COMP-NODATA"
    assert result["predicted_rul_hours"] is None
    assert result["failure_probability"] == 0.0
    assert result["confidence_score"] == 0.0
    assert result["primary_risk_sensor"] is None


def test_brand_new_equipment():
    """Brand-new equipment with perfectly normal values should show no risk."""
    data_4hr = {
        "vibration_avg": 2.0,
        "discharge_temp_avg": 190.0,
        "discharge_pressure_avg": 1000.0,
    }
    data_24hr = {
        "vibration_avg": 2.0,
        "discharge_temp_avg": 190.0,
        "discharge_pressure_avg": 1000.0,
    }

    result = calculate_rul("COMP-NEW", data_4hr, data_24hr)

    assert result["predicted_rul_hours"] is None
    assert result["failure_probability"] == 0.0
    assert result["primary_risk_sensor"] is None


def test_severely_degraded_equipment():
    """Equipment near critical thresholds with fast degradation."""
    # Vibration went from 5.0 to 7.8 in 20 hours -> rate 0.14/hr
    # Hours to critical (8.0): (8.0 - 7.8) / 0.14 ~ 1.4 hours
    data_4hr = {
        "vibration_avg": 7.8,
        "discharge_temp_avg": 258.0,
        "discharge_pressure_avg": 1380.0,
    }
    data_24hr = {
        "vibration_avg": 5.0,
        "discharge_temp_avg": 230.0,
        "discharge_pressure_avg": 1300.0,
    }

    result = calculate_rul("COMP-SEVERE", data_4hr, data_24hr)

    assert result["failure_probability"] > 0.5
    assert result["predicted_rul_hours"] is not None
    assert result["predicted_rul_hours"] < 50  # Should be very short
    assert result["confidence_score"] > 0.0


def test_failure_probability_capped_at_99():
    """Failure probability should never exceed 0.99."""
    # Push values way beyond critical thresholds
    data_4hr = {
        "vibration_avg": 20.0,  # Way above critical (8.0)
        "discharge_temp_avg": 300.0,  # Way above critical (260)
        "discharge_pressure_avg": 1500.0,
    }
    data_24hr = {
        "vibration_avg": 10.0,
        "discharge_temp_avg": 280.0,
        "discharge_pressure_avg": 1400.0,
    }

    result = calculate_rul("COMP-FAIL", data_4hr, data_24hr)

    assert result["failure_probability"] <= 0.99


def test_result_has_created_at_timestamp():
    """Result should include a created_at timestamp."""
    result = calculate_rul("COMP-TS", _healthy_reading(), _healthy_reading())

    assert "created_at" in result
    assert isinstance(result["created_at"], datetime)
