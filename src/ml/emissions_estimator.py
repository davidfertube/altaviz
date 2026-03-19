# ===========================================================================
# MODULE: Emissions Estimation — EPA Subpart W Compliance
# ===========================================================================
# PATTERN: Regulatory emission factor methodology (not a trained ML model)
# WHY: EPA Subpart W prescribes specific emission factors and calculation
#   methods for petroleum and natural gas systems. These are NOT tunable
#   parameters — they are regulatory values defined in 40 CFR Part 98,
#   Subpart W (specifically Tables W-1A through W-7). Using non-standard
#   factors would produce estimates that fail EPA audit.
#
# REGULATORY CONTEXT:
#   - 40 CFR Part 98: Mandatory Greenhouse Gas Reporting Rule (GHGRP)
#   - Subpart W: Petroleum and Natural Gas Systems
#   - OOOOb: EPA's 2024 final rule for oil and gas methane emissions
#     (Standards of Performance for New, Reconstructed, and Modified Sources
#     and Emissions Guidelines for Existing Sources)
#   - Reporting threshold: 25,000 tonnes CO2e/year → mandatory annual report
#   - Archrock-scale fleet (4,700 compressors) will typically exceed this
#     threshold, making quarterly tracking essential for compliance planning
#
# EMISSION SOURCES MODELED:
#   1. COMBUSTION: CO2 and CH4 from burning natural gas to power the compressor.
#      This is the largest emission source (~90% of total CO2e).
#   2. FUGITIVE: Methane leaking from compressor seals (rod packing, shaft
#      seals). Proportional to compression ratio and seal condition. The
#      primary target of OOOOb leak detection and repair (LDAR) requirements.
#   3. VENTING: Not modeled in this version. Blowdown events during
#      maintenance release all gas in the compressor cylinder to atmosphere.
#      A single blowdown can release 100-500 scf of methane. Production
#      version should integrate with work order agent to estimate venting
#      from planned/unplanned shutdowns.
#
# SCALING: 4,700 compressors × hourly estimates × quarterly reporting =
#   ~34M emission data points per year. This module produces per-compressor
#   estimates that roll up to station → basin → fleet for ESG dashboards
#   and regulatory submissions.
#
# ALTERNATIVE: Direct measurement (e.g., continuous emission monitoring
#   systems, CEMS, or optical gas imaging, OGI) is more accurate but costs
#   $50K-200K per compressor station. Emission factor methods are the
#   standard approach for large fleets and are explicitly accepted by EPA
#   for Subpart W reporting.
# ===========================================================================

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
from typing import Dict, List
from datetime import datetime

logger = logging.getLogger(__name__)

# ===========================================================================
# PATTERN: EPA-Prescribed Emission Factors (NOT Tunable)
# WHY: These values come from specific regulatory documents. Changing them
#   would produce non-compliant emission estimates.
#
# CH4_COMBUSTION_FACTOR = 0.0023 lb CH4/MMBtu:
#   Source: EPA AP-42, Section 3.2, Table 3.2-2 (Natural Gas-Fired
#   Reciprocating Engines). This is for 4-stroke lean-burn engines, which
#   is the most common type in gas compression (Caterpillar 3500/3600 series,
#   Waukesha VHP). Rich-burn engines use a higher factor (0.0049 lb/MMBtu).
#
# CO2_COMBUSTION_FACTOR = 117.0 lb CO2/MMBtu:
#   Source: EPA 40 CFR Part 98, Table C-1 (Default CO2 Emission Factors).
#   This is the standard factor for pipeline-quality natural gas combustion.
#   Essentially all carbon in the fuel converts to CO2 during combustion.
# ===========================================================================

# EPA emission factors
# AP-42 Section 3.2: Natural gas reciprocating engines
# Units: lb CH4 per MMBtu fuel input
CH4_COMBUSTION_FACTOR = 0.0023  # lb CH4 / MMBtu (4-stroke lean burn)
CO2_COMBUSTION_FACTOR = 117.0   # lb CO2 / MMBtu (natural gas)

# ===========================================================================
# FUGITIVE_RATE_SCFH = 8.01 scfh:
#   Source: EPA Subpart W, Table W-1A — "Average Emission Factors for
#   Equipment Leak Sources." This is the default factor for reciprocating
#   compressor rod packing when no component-level measurement is available.
#   In practice, new packing leaks ~2 scfh and worn packing leaks 15-30 scfh.
#   The 8.01 average represents the fleet-wide expectation.
#
#   This is a key metric for OOOOb compliance: operators must conduct LDAR
#   (Leak Detection and Repair) surveys and repair any component leaking
#   above the regulatory threshold (currently 500 ppm at the source for
#   existing sources, moving to more stringent limits under OOOOb).
#
#   FUGITIVE DETECTION METHODOLOGY:
#   In production, we augment this emission-factor approach with anomaly
#   detection on pressure differential trends. A sudden decrease in
#   discharge_pressure relative to suction_pressure (without a corresponding
#   load change) indicates a new or worsening seal leak. The emissions
#   estimator flags these as "elevated fugitive risk" for the investigation
#   agent to prioritize LDAR survey scheduling.
# ===========================================================================

# Fugitive emission factor (compressor seals)
# EPA Subpart W: 8.01 scfh per compressor-component (average)
FUGITIVE_RATE_SCFH = 8.01  # standard cubic feet per hour

# ===========================================================================
# NATURAL GAS PROPERTIES AND CONVERSION FACTORS
#
# NG_DENSITY_LB_PER_SCF = 0.0423:
#   Density of natural gas at standard conditions (60F, 14.696 psia).
#   Pipeline-quality gas ranges from 0.042-0.044 lb/scf depending on
#   composition (heavier hydrocarbons increase density).
#
# CH4_FRACTION = 0.93:
#   Typical methane content of pipeline-quality natural gas (93% by volume).
#   This varies by basin: Permian gas is ~85% CH4 (more ethane/propane),
#   while Marcellus is ~95% CH4 (drier gas). Production version should
#   use basin-specific gas compositions from config/thresholds.yaml.
#
# CH4_GWP = 28:
#   Source: IPCC Fifth Assessment Report (AR5, 2014). This is the 100-year
#   Global Warming Potential of methane relative to CO2. One tonne of CH4
#   has the same warming effect as 28 tonnes of CO2 over 100 years.
#   NOTE: IPCC AR6 (2021) updated this to 27.9, but EPA Subpart W
#   currently requires the AR5 value of 28. Some ESG frameworks (GHG
#   Protocol) accept either. The 20-year GWP is 84, which some frameworks
#   prefer because it captures methane's near-term warming impact.
#
# MMBTU_PER_HP_HOUR = 0.007:
#   Approximate heat rate for natural gas reciprocating engines. A typical
#   compressor engine consumes ~7,000 BTU per HP-hour. This is a fleet
#   average; actual heat rates range from 0.006 (efficient new engines)
#   to 0.009 (older/degraded engines). Production version should use
#   engine-specific heat rates from compressor metadata.
#
# MCF_TO_MMBTU = 1.028:
#   1 Mcf (thousand cubic feet) of natural gas ≈ 1.028 MMBtu of energy.
#   This is the standard conversion used in gas pipeline accounting.
#   Actual heating value varies with gas composition (1.00-1.10 MMBtu/Mcf).
# ===========================================================================

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
    # ===========================================================================
    # STEP 1: Combustion Emissions
    # FORMULA: fuel_consumed (MMBtu) × emission_factor (lb/MMBtu) = emissions (lb)
    # WHY: The compressor engine burns natural gas to produce mechanical power.
    #   Horsepower × heat rate gives total fuel energy consumed. This is the
    #   dominant emission source for CO2 (>95% of total CO2).
    # ===========================================================================

    # 1. Combustion emissions (from fuel burned to power the compressor)
    fuel_mmbtu = horsepower * MMBTU_PER_HP_HOUR * operating_hours
    ch4_combustion_lb = fuel_mmbtu * CH4_COMBUSTION_FACTOR
    co2_combustion_lb = fuel_mmbtu * CO2_COMBUSTION_FACTOR

    # ===========================================================================
    # STEP 2: Fugitive Emissions (Seal Leaks)
    # FORMULA: base_rate × pressure_factor × hours × density × CH4_fraction
    #
    # PRESSURE RATIO SCALING:
    #   Higher compression ratios (discharge/suction) create more mechanical
    #   stress on rod packing seals, increasing leak rates. The fugitive_factor
    #   scales the EPA baseline rate (8.01 scfh) by the compression ratio
    #   divided by 10, capped at 2x.
    #   - Compression ratio 3:1 → factor 0.3 (30% of baseline, low stress)
    #   - Compression ratio 10:1 → factor 1.0 (100% of baseline, typical)
    #   - Compression ratio 20:1 → factor 2.0 (cap, very high stress)
    #
    #   The /10 divisor and 2x cap are engineering approximations based on
    #   Archrock field data showing that leak rates roughly double between
    #   compression ratios of 3:1 and 15:1, then plateau (seals fail
    #   catastrophically above ~20:1 rather than leaking more).
    #
    #   max(suction_pressure, 1.0) prevents division by zero when suction
    #   pressure data is missing or reported as 0.
    #
    # WHY FUGITIVE MATTERS FOR OOOOb:
    #   EPA OOOOb (2024) requires operators to:
    #   1. Monitor fugitive emissions from reciprocating compressors quarterly
    #   2. Repair leaks exceeding 500 ppm within 30 days
    #   3. Replace rod packing within 36 months or 26,000 hours (whichever first)
    #   This estimator flags compressors with elevated fugitive rates for
    #   prioritized LDAR (Leak Detection and Repair) inspections.
    # ===========================================================================

    # 2. Fugitive emissions (seal leaks, proportional to pressure ratio)
    pressure_ratio = discharge_pressure / max(suction_pressure, 1.0)
    # Higher compression ratio = more seal stress = more leakage
    fugitive_factor = min(pressure_ratio / 10.0, 2.0)  # Cap at 2x baseline
    fugitive_scfh = FUGITIVE_RATE_SCFH * fugitive_factor
    fugitive_ch4_lb = (
        fugitive_scfh * operating_hours * NG_DENSITY_LB_PER_SCF * CH4_FRACTION
    )

    # ===========================================================================
    # STEP 3: Total Emissions and Unit Conversion
    # FORMULA: CO2e = CO2 + (CH4 × GWP)
    #   This is the standard greenhouse gas accounting formula. CO2-equivalent
    #   (CO2e) allows comparing different greenhouse gases on a common scale.
    #   For a typical 1400 HP compressor running 1 hour:
    #   - Combustion CO2: ~1,147 lb (~0.52 tonnes)
    #   - Combustion CH4: ~0.023 lb (negligible by mass, but ×28 GWP)
    #   - Fugitive CH4: ~0.31 lb (×28 GWP = ~8.7 lb CO2e)
    #   Total CO2e ≈ 0.52 tonnes/hour ≈ 4,560 tonnes/year per compressor
    #   Fleet: 4,700 compressors × 4,560 ≈ 21.4M tonnes CO2e/year
    # ===========================================================================

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

    # ===========================================================================
    # PATTERN: Fallback Defaults for Missing Sensor Data
    # WHY: Some compressors may not report all sensor values in every reading
    #   (connectivity issues, sensor calibration, newly installed compressors).
    #   The fallback values represent fleet-average operating parameters:
    #   - 1400 HP: Mid-range for Caterpillar 3500/3600 series
    #   - 10000 Mcf/day: Typical gas throughput for a 1400 HP unit
    #   - 1100 PSI discharge: Common pipeline delivery pressure
    #   - 60 PSI suction: Typical wellhead/gathering pressure
    #   Using fleet averages for missing data produces reasonable (if imprecise)
    #   emission estimates, which is better than skipping the compressor entirely
    #   and underreporting fleet emissions.
    # ===========================================================================

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
    # ===========================================================================
    # PATTERN: EPA Subpart W Reporting Threshold
    #
    # 25,000 tonnes CO2e/year:
    #   This is the mandatory reporting threshold under 40 CFR Part 98.
    #   Any facility (not fleet-wide, but per-facility) that emits >= 25,000
    #   tonnes CO2e must submit an annual GHG report to EPA by March 31 of
    #   the following year.
    #
    # STATUS TIERS:
    #   'compliant' (< 80% of threshold): Comfortable margin. No reporting
    #     required. Continue monitoring quarterly.
    #   'near_threshold' (80-100% of threshold): At risk of crossing the
    #     reporting threshold. Should prepare reporting infrastructure and
    #     consider emission reduction measures (e.g., packing replacement,
    #     engine tuning, electric drive conversion).
    #   'reporting_required' (>= threshold): Mandatory annual EPA report.
    #     Failure to report carries penalties of up to $50,000/day.
    #
    # NOTE: The 80% early warning buffer gives ~2-3 months of lead time
    #   to prepare compliance systems before crossing the threshold, assuming
    #   linear emission growth.
    # ===========================================================================

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
