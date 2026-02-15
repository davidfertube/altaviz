"""
Emissions Estimation Module

Estimates methane (CH4) and CO2-equivalent emissions from natural gas
reciprocating compressors using EPA emission factors (40 CFR Part 98,
Subpart W — Petroleum and Natural Gas Systems).

Key differentiator from competitors like Detechtion: integrated emissions
monitoring alongside predictive maintenance, supporting ESG reporting
and EPA Subpart W compliance.

Emission sources modeled:
1. Combustion emissions (fuel gas burned for power)
2. Fugitive emissions (seal leaks, proportional to pressure differential)
3. Venting emissions (blowdown events during maintenance)

References:
- EPA Emission Factors: AP-42 Section 3.2 (Natural Gas-Fired Reciprocating Engines)
- GWP for CH4: 28 (IPCC AR5, 100-year horizon)
"""

import logging
import numpy as np
from typing import Dict, List, Optional
from datetime import datetime

logger = logging.getLogger('CompressorHealthETL')

# EPA emission factors
# AP-42 Section 3.2: Natural gas reciprocating engines
# Units: lb CH4 per MMBtu fuel input
CH4_COMBUSTION_FACTOR = 0.0023  # lb CH4 / MMBtu (4-stroke lean burn)
CO2_COMBUSTION_FACTOR = 117.0   # lb CO2 / MMBtu (natural gas)

# Fugitive emission factor (compressor seals)
# EPA Subpart W: 8.01 scfh per compressor-component (average)
FUGITIVE_RATE_SCFH = 8.01  # standard cubic feet per hour

# Natural gas density and composition
NG_DENSITY_LB_PER_SCF = 0.0423  # lb/scf at standard conditions
CH4_FRACTION = 0.93  # 93% methane in pipeline natural gas

# Global Warming Potential (IPCC AR5)
CH4_GWP = 28  # 100-year GWP for methane

# Conversion factors
LB_TO_TONNES = 0.000453592
MMBTU_PER_HP_HOUR = 0.007  # Approximate heat rate for recip engines
MCF_TO_MMBTU = 1.028  # 1 Mcf natural gas ~ 1.028 MMBtu


def estimate_compressor_emissions(
    compressor_id: str,
    horsepower: float,
    gas_flow_mcf: float,
    discharge_pressure: float,
    suction_pressure: float,
    operating_hours: float = 1.0,
) -> Dict:
    """
    Estimate emissions for a single compressor over a time period.

    Args:
        compressor_id: Compressor identifier
        horsepower: Average horsepower consumption
        gas_flow_mcf: Gas throughput in Mcf/day
        discharge_pressure: Discharge pressure (PSI)
        suction_pressure: Suction pressure (PSI)
        operating_hours: Hours of operation (default 1 for hourly estimates)

    Returns:
        Dict with emission estimates:
        - methane_tonnes: CH4 emissions in metric tonnes
        - co2e_tonnes: CO2-equivalent emissions (CH4 * GWP + CO2)
        - emission_rate_scfh: Estimated fugitive emission rate
        - breakdown: Dict with combustion, fugitive, total components
    """
    # 1. Combustion emissions (from fuel burned to power the compressor)
    fuel_mmbtu = horsepower * MMBTU_PER_HP_HOUR * operating_hours
    ch4_combustion_lb = fuel_mmbtu * CH4_COMBUSTION_FACTOR
    co2_combustion_lb = fuel_mmbtu * CO2_COMBUSTION_FACTOR

    # 2. Fugitive emissions (seal leaks, proportional to pressure ratio)
    pressure_ratio = discharge_pressure / max(suction_pressure, 1.0)
    # Higher compression ratio = more seal stress = more leakage
    fugitive_factor = min(pressure_ratio / 10.0, 2.0)  # Cap at 2x baseline
    fugitive_scfh = FUGITIVE_RATE_SCFH * fugitive_factor
    fugitive_ch4_lb = (
        fugitive_scfh * operating_hours * NG_DENSITY_LB_PER_SCF * CH4_FRACTION
    )

    # 3. Total emissions
    total_ch4_lb = ch4_combustion_lb + fugitive_ch4_lb
    total_co2_lb = co2_combustion_lb
    total_co2e_lb = total_co2_lb + (total_ch4_lb * CH4_GWP)

    methane_tonnes = total_ch4_lb * LB_TO_TONNES
    co2e_tonnes = total_co2e_lb * LB_TO_TONNES

    return {
        'compressor_id': compressor_id,
        'estimate_timestamp': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        'methane_tonnes': round(methane_tonnes, 6),
        'co2e_tonnes': round(co2e_tonnes, 4),
        'emission_rate_scfh': round(fugitive_scfh, 2),
        'estimation_method': 'epa_subpart_w',
        'breakdown': {
            'combustion_ch4_lb': round(ch4_combustion_lb, 4),
            'combustion_co2_lb': round(co2_combustion_lb, 2),
            'fugitive_ch4_lb': round(fugitive_ch4_lb, 4),
            'pressure_ratio': round(pressure_ratio, 2),
            'fuel_mmbtu': round(fuel_mmbtu, 4),
            'operating_hours': operating_hours,
        },
    }


def estimate_fleet_emissions(aggregated_df, metadata_df=None) -> List[Dict]:
    """
    Estimate emissions for all compressors from Gold layer aggregated data.

    Args:
        aggregated_df: Gold layer aggregated DataFrame (1hr window)
            Must contain: compressor_id, horsepower_mean, gas_flow_mean,
            discharge_pressure_mean, suction_pressure_mean
        metadata_df: Optional compressor metadata DataFrame with horsepower column

    Returns:
        List of emission estimate dicts, one per compressor per timestamp
    """
    from pyspark.sql import functions as F

    df = aggregated_df
    if 'window_type' in aggregated_df.columns:
        df = aggregated_df.filter(F.col("window_type") == "1hr")

    # Get latest reading per compressor
    latest_times = df.groupBy("compressor_id").agg(
        F.max("agg_timestamp").alias("latest_time")
    )

    latest_df = df.alias("a").join(
        latest_times.alias("b"),
        (F.col("a.compressor_id") == F.col("b.compressor_id")) &
        (F.col("a.agg_timestamp") == F.col("b.latest_time"))
    ).select("a.*")

    rows = latest_df.collect()

    estimates = []
    for row in rows:
        rd = row.asDict()
        hp = float(rd.get('horsepower_mean') or 1400)
        gas_flow = float(rd.get('gas_flow_mean') or 10000)
        discharge_p = float(rd.get('discharge_pressure_mean') or 1100)
        suction_p = float(rd.get('suction_pressure_mean') or 60)

        est = estimate_compressor_emissions(
            compressor_id=rd['compressor_id'],
            horsepower=hp,
            gas_flow_mcf=gas_flow,
            discharge_pressure=discharge_p,
            suction_pressure=suction_p,
            operating_hours=1.0,
        )
        estimates.append(est)

    total_co2e = sum(e['co2e_tonnes'] for e in estimates)
    logger.info(
        f"Fleet emissions: {len(estimates)} compressors, "
        f"total CO2e: {total_co2e:.4f} tonnes/hr"
    )

    return estimates


def get_compliance_status(annual_co2e_tonnes: float) -> Dict:
    """
    Check EPA Subpart W reporting compliance status.

    Facilities emitting >= 25,000 tonnes CO2e/year must report under
    40 CFR Part 98, Subpart W.

    Args:
        annual_co2e_tonnes: Total annual CO2-equivalent emissions

    Returns:
        Dict with compliance status and thresholds
    """
    REPORTING_THRESHOLD = 25000  # tonnes CO2e/year

    return {
        'annual_co2e_tonnes': round(annual_co2e_tonnes, 2),
        'reporting_threshold': REPORTING_THRESHOLD,
        'requires_reporting': annual_co2e_tonnes >= REPORTING_THRESHOLD,
        'headroom_tonnes': round(REPORTING_THRESHOLD - annual_co2e_tonnes, 2),
        'headroom_pct': round(
            (REPORTING_THRESHOLD - annual_co2e_tonnes) / REPORTING_THRESHOLD * 100, 1
        ) if annual_co2e_tonnes < REPORTING_THRESHOLD else 0.0,
        'status': (
            'compliant' if annual_co2e_tonnes < REPORTING_THRESHOLD * 0.8
            else 'near_threshold' if annual_co2e_tonnes < REPORTING_THRESHOLD
            else 'reporting_required'
        ),
    }
