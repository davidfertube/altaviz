"""
What-If Scenario Simulator for the Fleet Optimization Copilot.

Runs simulations for load balancing, maintenance deferral, and
emissions reduction scenarios. Returns baseline vs. projected
comparisons with risk assessments.
"""

# ===========================================================================
# PATTERN: What-If Simulation Engine (Decision Support)
# WHY: Fleet operators need to evaluate decisions BEFORE committing:
#   "What happens if we defer maintenance on COMP-0042 by 14 days?"
#   "What if we rebalance load across Station X?"
#   The simulator provides quantified projections (failure probability,
#   cost impact, risk assessment) so operators can make data-driven decisions
#   rather than relying on gut feeling.
# DESIGN: All simulations are DETERMINISTIC — given the same inputs, they
#   produce the same outputs. This is critical for decision support because:
#   1. Reproducible: "I ran this simulation yesterday and got X" holds true today
#   2. Auditable: regulatory or legal review can verify the simulation logic
#   3. Testable: unit tests can assert exact outputs
# ALTERNATIVE: Monte Carlo simulation with random sampling — more realistic
#   but harder to reproduce and explain. For decision support (not risk
#   modeling), deterministic projections are more useful.
# ===========================================================================

import json
import logging
from typing import Optional

from .shared.db_tools import query_db, _serialize_rows
from .shared.models import WhatIfResult

logger = logging.getLogger(__name__)


def run_maintenance_deferral(compressor_id: str, defer_days: int) -> str:
    """Simulate the impact of deferring maintenance by N days.

    Uses current RUL prediction and failure probability to estimate
    risk increase from deferral.
    """
    try:
        # Get current ML prediction
        pred_rows = query_db(
            """SELECT rul_days, failure_probability, confidence_score
               FROM ml_predictions
               WHERE compressor_id = %s
               ORDER BY prediction_timestamp DESC LIMIT 1""",
            [compressor_id]
        )

        # Get current sensor state
        sensor_rows = query_db(
            """SELECT vibration_max, discharge_temp_max, discharge_pressure_mean
               FROM v_fleet_health_summary
               WHERE compressor_id = %s""",
            [compressor_id]
        )

        if not pred_rows:
            return json.dumps({"error": f"No ML predictions available for {compressor_id}"})

        pred = pred_rows[0]
        sensor = sensor_rows[0] if sensor_rows else {}

        current_rul = float(pred.get('rul_days', 30) or 30)
        current_fp = float(pred.get('failure_probability', 0.05) or 0.05)

        # ===========================================================================
        # RUL Exponential Decay Projection
        # WHY: Failure probability does not increase linearly as maintenance is
        #   deferred. It follows an exponential curve: deferring 50% of RUL is
        #   manageable, but deferring 100% of RUL (past the predicted failure point)
        #   is catastrophic.
        # FORMULA: risk_multiplier = 1 + (defer_days / current_rul)^2
        #   - Defer 25% of RUL: multiplier = 1.0625 (6% increase)
        #   - Defer 50% of RUL: multiplier = 1.25 (25% increase)
        #   - Defer 100% of RUL: multiplier = 2.0 (100% increase)
        #   - Defer 200% of RUL: multiplier = 5.0 (400% increase)
        # This is a simplified Weibull-like hazard function. A full Weibull
        # analysis would require historical failure data per compressor model.
        # ===========================================================================
        remaining_after_defer = max(0, current_rul - defer_days)
        if current_rul > 0:
            risk_multiplier = 1 + (defer_days / current_rul) ** 2
        else:
            risk_multiplier = 10.0  # Already past RUL: extreme risk

        projected_fp = min(0.99, current_fp * risk_multiplier)  # Cap at 99%

        # ===========================================================================
        # Downtime Cost Assumption: $25,000/day
        # SOURCE: Industry average for a ~1,100 HP reciprocating compressor.
        #   Includes: lost gas throughput revenue ($15K-20K/day), emergency
        #   repair premium (2-3x planned repair cost), contractual penalties
        #   for missed throughput commitments, and environmental remediation
        #   if failure causes a release.
        # Range: $15K/day (small unit, non-critical station) to $50K/day
        #   (large unit, high-throughput station). $25K is the fleet average.
        # IMPROVEMENT: Look up actual throughput commitment for this specific
        #   compressor's station to calculate a per-unit cost.
        # ===========================================================================
        daily_downtime_cost = 25_000
        avg_repair_duration_days = 1.5  # Average unplanned repair takes 1.5 days
        expected_failure_cost = projected_fp * daily_downtime_cost * avg_repair_duration_days

        # Planned repair cost is much cheaper than unplanned failure
        planned_repair_cost = 8_000  # Average planned repair with parts pre-ordered

        result = WhatIfResult(
            scenario_type="maintenance_defer",
            target_ids=[compressor_id],
            baseline={
                "rul_days": current_rul,
                "failure_probability": round(current_fp, 4),
                "planned_repair_cost": planned_repair_cost,
                "vibration_max": float(sensor.get('vibration_max', 0) or 0),
                "temp_max": float(sensor.get('discharge_temp_max', 0) or 0),
            },
            projected={
                "rul_days_remaining": remaining_after_defer,
                "failure_probability": round(projected_fp, 4),
                "expected_failure_cost": round(expected_failure_cost, 2),
                "defer_days": defer_days,
                "risk_multiplier": round(risk_multiplier, 2),
            },
            risk_assessment=(
                f"Deferring maintenance by {defer_days} days increases failure probability "
                f"from {current_fp:.0%} to {projected_fp:.0%} (risk multiplier: {risk_multiplier:.1f}x). "
                f"Expected cost of failure: ${expected_failure_cost:,.0f} vs. planned repair: ${planned_repair_cost:,.0f}."
            ),
            recommendation=(
                "PROCEED with deferral" if projected_fp < 0.3 and remaining_after_defer > 7
                else "DO NOT defer — risk is too high" if projected_fp > 0.5
                else "DEFER with increased monitoring (daily sensor checks)"
            ),
            confidence=float(pred.get('confidence_score', 0.5) or 0.5),
        )

        return json.dumps(result.model_dump(), default=str)
    except Exception as e:
        return json.dumps({"error": str(e)})


# ===========================================================================
# Load Balancing Simulation
# WHY: Compressors at the same station often run at different utilization
#   levels (some overloaded, some underloaded). Rebalancing load across
#   units reduces wear on overloaded compressors, extending their RUL
#   and reducing maintenance frequency.
# METHODOLOGY: Compare each compressor's HP to the station average.
#   Units > 120% of average are "overloaded", < 80% are "underloaded".
#   The simulation projects the impact of equalizing load.
# LIMITATION: Real load balancing requires understanding gas flow
#   contracts, pipeline pressure requirements, and compressor operating
#   envelopes. This simulation provides a directional estimate.
# ===========================================================================
def run_load_balance_simulation(station_id: str, organization_id: str) -> str:
    """Simulate load redistribution across compressors at a station.

    Identifies underutilized and overutilized compressors and suggests
    load rebalancing to extend fleet life.
    """
    try:
        # Get all compressors at this station with current readings
        rows = query_db(
            """SELECT fh.compressor_id, fh.model, fh.health_status,
                      fh.vibration_max, fh.discharge_temp_max,
                      fh.active_alert_count,
                      lr.horsepower_mean, lr.gas_flow_mean
               FROM v_fleet_health_summary fh
               LEFT JOIN v_latest_readings lr ON fh.compressor_id = lr.compressor_id
               WHERE fh.station_id = %s AND fh.organization_id = %s""",
            [station_id, organization_id]
        )

        if not rows:
            return json.dumps({"error": f"No compressors found at station {station_id}"})

        _serialize_rows(rows)

        # Calculate utilization based on HP relative to model capacity
        total_hp = sum(float(r.get('horsepower_mean', 0) or 0) for r in rows)
        avg_hp = total_hp / len(rows) if rows else 0

        overloaded = [r for r in rows if float(r.get('horsepower_mean', 0) or 0) > avg_hp * 1.2]
        underloaded = [r for r in rows if float(r.get('horsepower_mean', 0) or 0) < avg_hp * 0.8]

        # Simulate balanced state
        balanced_hp = total_hp / len(rows) if rows else 0

        result = WhatIfResult(
            scenario_type="load_balance",
            target_ids=[r['compressor_id'] for r in rows],
            baseline={
                "station_id": station_id,
                "compressor_count": len(rows),
                "total_hp": round(total_hp, 1),
                "avg_hp": round(avg_hp, 1),
                "overloaded_count": len(overloaded),
                "underloaded_count": len(underloaded),
                "overloaded_units": [r['compressor_id'] for r in overloaded],
                "underloaded_units": [r['compressor_id'] for r in underloaded],
            },
            projected={
                "balanced_hp_per_unit": round(balanced_hp, 1),
                "estimated_vibration_reduction_pct": 10 if overloaded else 0,
                "estimated_rul_extension_days": 15 if overloaded else 0,
                "units_to_adjust": len(overloaded) + len(underloaded),
            },
            risk_assessment=(
                f"Station {station_id} has {len(overloaded)} overloaded and "
                f"{len(underloaded)} underloaded compressors. "
                f"Rebalancing load to ~{balanced_hp:.0f} HP/unit could extend fleet life "
                f"by ~15 days and reduce vibration-related wear by ~10%."
                if overloaded
                else f"Station {station_id} load is well-balanced. No action needed."
            ),
            recommendation=(
                "REBALANCE — reduce load on overworked units to extend service life"
                if len(overloaded) >= 2
                else "MONITOR — load is acceptable"
            ),
            confidence=0.7 if overloaded else 0.9,
        )

        return json.dumps(result.model_dump(), default=str)
    except Exception as e:
        return json.dumps({"error": str(e)})


# ===========================================================================
# EPA OOOOb Compliance Check
# WHY: EPA's OOOOb rule (effective 2024) requires oil & gas facilities to
#   monitor and report methane emissions. The 25,000 tonnes CO2e/year
#   threshold triggers enhanced monitoring and repair requirements.
#   This function annualizes daily emissions (daily * 365) to estimate
#   whether the fleet is on track to exceed the threshold.
# SCALING: At 4,700 compressors, even small per-unit leaks add up.
#   A packing leak on 2% of the fleet could push total emissions over
#   the compliance threshold.
# ===========================================================================
def get_emissions_fleet_summary(organization_id: str) -> str:
    """Get fleet-wide emissions summary."""
    try:
        rows = query_db(
            """SELECT
                 COUNT(DISTINCT ee.compressor_id) as reporting_compressors,
                 SUM(ee.methane_tonnes) as total_methane_tonnes,
                 SUM(ee.co2e_tonnes) as total_co2e_tonnes,
                 AVG(ee.emission_rate_scfh) as avg_emission_rate
               FROM emissions_estimates ee
               WHERE ee.organization_id = %s
                 AND ee.estimate_timestamp >= NOW() - INTERVAL '24 hours'""",
            [organization_id]
        )

        # EPA OOOOb threshold: 25,000 tonnes CO2e/year
        # Annualize daily emissions
        total_daily = float(rows[0].get('total_co2e_tonnes', 0) or 0) if rows else 0
        annualized = total_daily * 365
        compliance_status = "compliant" if annualized < 25000 else "at_risk"

        result = {
            **(_serialize_rows(rows)[0] if rows else {}),
            "annualized_co2e_tonnes": round(annualized, 2),
            "epa_threshold_tonnes": 25000,
            "compliance_status": compliance_status,
            "headroom_pct": round((1 - annualized / 25000) * 100, 1) if annualized < 25000 else 0,
        }

        return json.dumps(result, default=str)
    except Exception as e:
        return json.dumps({"error": str(e)})
