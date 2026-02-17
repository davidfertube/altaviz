"""Tests for temperature drift linear regression predictor."""
import pytest
from datetime import datetime, timedelta

from src.ml.temp_drift_predictor import (
    predict_temp_drift,
    TEMP_WARNING,
    TEMP_CRITICAL,
    MIN_DRIFT_RATE,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_readings(start_temp, slope_per_hour, count=24, interval_hours=1):
    """Create a list of temp reading dicts with a controlled linear slope.

    Args:
        start_temp: Starting temperature (F).
        slope_per_hour: Temperature increase per hour (F/hr).
        count: Number of readings.
        interval_hours: Hours between readings.
    """
    base = datetime(2026, 1, 1, 0, 0)
    readings = []
    for i in range(count):
        ts = base + timedelta(hours=i * interval_hours)
        readings.append({
            "agg_timestamp": ts,
            "discharge_temp_mean": start_temp + slope_per_hour * i * interval_hours,
        })
    return readings


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_normal_prediction_stable():
    """Flat temperature with zero slope should be classified as 'stable'."""
    readings = _make_readings(start_temp=200.0, slope_per_hour=0.0)
    result = predict_temp_drift("COMP-001", readings)

    assert result["compressor_id"] == "COMP-001"
    assert result["drift_status"] == "stable"
    assert result["drift_rate_f_per_hour"] == 0.0
    assert result["hours_to_warning"] is None
    assert result["hours_to_critical"] is None


def test_drifting_temperature():
    """Moderate positive slope should be classified as 'drifting'."""
    # 1 F/hr starting at 200 F -> 40 hrs to warning (240), 60 hrs to critical (260)
    readings = _make_readings(start_temp=200.0, slope_per_hour=1.0)
    result = predict_temp_drift("COMP-002", readings)

    assert result["drift_status"] == "drifting"
    assert result["drift_rate_f_per_hour"] == pytest.approx(1.0, abs=0.1)
    assert result["hours_to_warning"] is not None
    assert result["hours_to_warning"] > 0
    assert result["hours_to_critical"] is not None
    assert result["hours_to_critical"] > result["hours_to_warning"]


def test_warning_imminent():
    """High slope near warning threshold -> 'warning_imminent'."""
    # Start at 230 F with 1.5 F/hr, 6 readings -> current_temp = 237.5 F
    # hours_to_warning = (240 - 237.5) / 1.5 = 1.67 hrs (< 12)
    # hours_to_critical = (260 - 237.5) / 1.5 = 15 hrs (> 12) -> warning_imminent
    readings = _make_readings(start_temp=230.0, slope_per_hour=1.5, count=6)
    result = predict_temp_drift("COMP-003", readings)

    assert result["drift_status"] == "warning_imminent"
    assert result["hours_to_warning"] is not None
    assert result["hours_to_warning"] < 12


def test_critical_imminent():
    """High slope near critical threshold -> 'critical_imminent'."""
    # Start at 252 F with 2 F/hr, 4 readings -> current_temp = 258 F
    # current_temp > 240 so hours_to_warning = None
    # hours_to_critical = (260 - 258) / 2 = 1 hr (< 12) -> critical_imminent
    readings = _make_readings(start_temp=252.0, slope_per_hour=2.0, count=4)
    result = predict_temp_drift("COMP-003", readings)

    assert result["drift_status"] == "critical_imminent"
    assert result["hours_to_critical"] is not None
    assert result["hours_to_critical"] < 12


def test_insufficient_data():
    """Fewer than 3 readings should return default result with stable status."""
    readings = _make_readings(start_temp=200.0, slope_per_hour=5.0, count=2)
    result = predict_temp_drift("COMP-004", readings)

    assert result["drift_status"] == "stable"
    assert result["current_temp"] is None
    assert result["confidence"] == 0.0


def test_empty_readings():
    """Empty reading list should return safe defaults."""
    result = predict_temp_drift("COMP-005", [])

    assert result["drift_status"] == "stable"
    assert result["current_temp"] is None


def test_readings_with_none_temps():
    """Readings that have None temperatures should be skipped gracefully."""
    base = datetime(2026, 1, 1, 0, 0)
    readings = [
        {"agg_timestamp": base, "discharge_temp_mean": None},
        {"agg_timestamp": base + timedelta(hours=1), "discharge_temp_mean": None},
        {"agg_timestamp": base + timedelta(hours=2), "discharge_temp_mean": 200.0},
    ]
    # Only 1 non-None temp -> insufficient for regression
    result = predict_temp_drift("COMP-006", readings)
    assert result["drift_status"] == "stable"


def test_negative_slope_is_stable():
    """Cooling temperature (negative slope) should be classified as stable."""
    readings = _make_readings(start_temp=230.0, slope_per_hour=-1.0)
    result = predict_temp_drift("COMP-007", readings)

    assert result["drift_status"] == "stable"
    assert result["hours_to_warning"] is None
    assert result["hours_to_critical"] is None


def test_predicted_hours_non_negative():
    """hours_to_warning and hours_to_critical should never be negative."""
    readings = _make_readings(start_temp=200.0, slope_per_hour=2.0)
    result = predict_temp_drift("COMP-008", readings)

    if result["hours_to_warning"] is not None:
        assert result["hours_to_warning"] >= 0
    if result["hours_to_critical"] is not None:
        assert result["hours_to_critical"] >= 0
