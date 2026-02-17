"""Tests for EPA Subpart W emissions estimation module."""
import pytest

from src.ml.emissions_estimator import (
    estimate_compressor_emissions,
    get_compliance_status,
    CH4_COMBUSTION_FACTOR,
    CO2_COMBUSTION_FACTOR,
    FUGITIVE_RATE_SCFH,
    NG_DENSITY_LB_PER_SCF,
    CH4_FRACTION,
    CH4_GWP,
    LB_TO_TONNES,
    MMBTU_PER_HP_HOUR,
)


# ---------------------------------------------------------------------------
# Tests for estimate_compressor_emissions
# ---------------------------------------------------------------------------

def test_normal_estimation_has_required_keys():
    """Normal estimation should return a dict with all expected keys."""
    result = estimate_compressor_emissions(
        compressor_id="COMP-001",
        horsepower=1400.0,
        gas_flow_mcf=10000.0,
        discharge_pressure=1100.0,
        suction_pressure=60.0,
    )

    required_keys = {
        "compressor_id",
        "estimate_timestamp",
        "methane_tonnes",
        "co2e_tonnes",
        "emission_rate_scfh",
        "estimation_method",
        "breakdown",
    }
    assert required_keys.issubset(result.keys())
    assert result["estimation_method"] == "epa_subpart_w"


def test_emissions_are_positive():
    """All emission values should be non-negative for valid inputs."""
    result = estimate_compressor_emissions(
        compressor_id="COMP-001",
        horsepower=1400.0,
        gas_flow_mcf=10000.0,
        discharge_pressure=1100.0,
        suction_pressure=60.0,
    )

    assert result["methane_tonnes"] >= 0
    assert result["co2e_tonnes"] >= 0
    assert result["emission_rate_scfh"] >= 0


def test_zero_flow_rate():
    """Zero gas flow should still produce valid (non-negative) estimates.

    Combustion emissions depend on horsepower, not flow rate, so they
    should still be present. Fugitive emissions depend on pressure ratio.
    """
    result = estimate_compressor_emissions(
        compressor_id="COMP-002",
        horsepower=1400.0,
        gas_flow_mcf=0.0,
        discharge_pressure=1100.0,
        suction_pressure=60.0,
    )

    assert result["methane_tonnes"] >= 0
    assert result["co2e_tonnes"] >= 0


def test_combustion_emissions_math():
    """Verify combustion emission calculations against EPA factors."""
    hp = 1000.0
    operating_hours = 1.0

    result = estimate_compressor_emissions(
        compressor_id="COMP-TEST",
        horsepower=hp,
        gas_flow_mcf=10000.0,
        discharge_pressure=100.0,
        suction_pressure=100.0,  # ratio=1 -> minimal fugitive
    )

    fuel_mmbtu = hp * MMBTU_PER_HP_HOUR * operating_hours
    expected_ch4_combustion_lb = fuel_mmbtu * CH4_COMBUSTION_FACTOR
    expected_co2_combustion_lb = fuel_mmbtu * CO2_COMBUSTION_FACTOR

    bd = result["breakdown"]
    assert bd["combustion_ch4_lb"] == pytest.approx(expected_ch4_combustion_lb, abs=0.001)
    assert bd["combustion_co2_lb"] == pytest.approx(expected_co2_combustion_lb, abs=0.1)
    assert bd["fuel_mmbtu"] == pytest.approx(fuel_mmbtu, abs=0.001)


def test_fugitive_emissions_scale_with_pressure_ratio():
    """Higher pressure ratio should produce more fugitive emissions."""
    base_kwargs = dict(
        compressor_id="COMP-FUG",
        horsepower=1400.0,
        gas_flow_mcf=10000.0,
        suction_pressure=60.0,
    )

    low_pressure = estimate_compressor_emissions(discharge_pressure=600.0, **base_kwargs)
    high_pressure = estimate_compressor_emissions(discharge_pressure=1200.0, **base_kwargs)

    assert high_pressure["emission_rate_scfh"] > low_pressure["emission_rate_scfh"]
    assert high_pressure["methane_tonnes"] > low_pressure["methane_tonnes"]


def test_co2e_includes_gwp_factor():
    """CO2e should be larger than raw CO2 because it includes CH4 * GWP."""
    result = estimate_compressor_emissions(
        compressor_id="COMP-GWP",
        horsepower=1400.0,
        gas_flow_mcf=10000.0,
        discharge_pressure=1100.0,
        suction_pressure=60.0,
    )

    bd = result["breakdown"]
    raw_co2_tonnes = bd["combustion_co2_lb"] * LB_TO_TONNES
    # co2e should be strictly greater than just combustion CO2 (adds CH4*GWP)
    assert result["co2e_tonnes"] > raw_co2_tonnes


def test_zero_suction_pressure_no_division_error():
    """Zero suction pressure should not cause a division-by-zero error.

    The code uses max(suction_pressure, 1.0) as a guard.
    """
    result = estimate_compressor_emissions(
        compressor_id="COMP-ZERO",
        horsepower=1400.0,
        gas_flow_mcf=10000.0,
        discharge_pressure=1100.0,
        suction_pressure=0.0,
    )

    assert result["methane_tonnes"] >= 0
    assert result["co2e_tonnes"] >= 0


# ---------------------------------------------------------------------------
# Tests for get_compliance_status
# ---------------------------------------------------------------------------

def test_compliance_below_threshold():
    """Below 80% of threshold should be 'compliant'."""
    status = get_compliance_status(10000.0)
    assert status["status"] == "compliant"
    assert status["requires_reporting"] is False
    assert status["headroom_tonnes"] > 0


def test_compliance_near_threshold():
    """Between 80% and 100% of threshold should be 'near_threshold'."""
    status = get_compliance_status(22000.0)
    assert status["status"] == "near_threshold"
    assert status["requires_reporting"] is False


def test_compliance_above_threshold():
    """At or above threshold should be 'reporting_required'."""
    status = get_compliance_status(30000.0)
    assert status["status"] == "reporting_required"
    assert status["requires_reporting"] is True
    assert status["headroom_pct"] == 0.0
