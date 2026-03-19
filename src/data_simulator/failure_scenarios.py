"""
Failure Scenarios — Realistic Compressor Degradation Patterns

Defines failure modes observed in natural gas compression:
- Bearing wear (progressive vibration increase)
- Cooling system degradation (temperature drift)
- Valve failure (pressure oscillation)
- Ring wear (efficiency loss, emissions increase)
- Packing leak (methane emissions spike)

At Archrock scale (4,700 units), ~5% of fleet is in some degradation
state at any given time, with ~1% in critical condition.

Author: David Fernandez
"""

# ===========================================================================
# PATTERN: 6 Failure Modes Based on Real Compressor Physics
# WHY: Each failure mode models a real mechanical degradation process
#      observed in natural gas compressors. The modes are:
#
#      1. BEARING_WEAR (2.5%/month): Bearing cage deterioration causes
#         EXPONENTIAL vibration increase. This is the fastest-progressing
#         failure — goes from early warning to failure in 5 days. The
#         exponential curve (baseline * (1 + (days/3)^1.8)) mimics real
#         bearing degradation where vibration doubles every 2-3 days.
#
#      2. COOLING_DEGRADATION (2.0%/month): Coolant loss or fouled heat
#         exchanger causes LINEAR temperature rise (+4.5F/day). This is
#         the most gradual failure — takes 6+ days to reach critical.
#         Linear progression matches real coolant leak behavior.
#
#      3. VALVE_FAILURE (1.5%/month): Cracked valve plates cause
#         OSCILLATING pressure (sinusoidal pattern). The distinctive
#         oscillation is key for ML detection — no other failure mode
#         produces periodic pressure swings.
#
#      4. RING_WEAR (2.0%/month): Piston ring wear causes gradual
#         efficiency loss — flow rate drops 3%/day while pressure
#         decreases 8 PSI/day. The compressor works harder (same HP)
#         but produces less output. Longest progression (9 days to failure).
#
#      5. PACKING_LEAK (1.5%/month): Rod packing wear allows gas to
#         leak around the piston rod, causing pressure loss AND methane
#         emissions. This is the EPA-regulated failure mode — OOOOb
#         requires detection and repair within specified timeframes.
#
#      6. FOULING (3.0%/month): Dirty gas deposits reduce heat transfer,
#         causing slow temperature rise with periodic spikes (every 3 days
#         when deposits partially dislodge). Most common failure mode
#         but also the slowest — usually caught by routine inspections.
#
# SCALING: At 4,700 compressors, the combined failure rates (~12.5%
#          annualized) mean ~5% of fleet is in some degradation state
#          at any time (~235 units), and ~1% is critical (~47 units).
#          This matches Archrock's reported maintenance statistics.
# ALTERNATIVE: Could use a generic "degradation" curve for all failures,
#              but different physics produce different sensor signatures.
#              The ML models need to see these distinct patterns to learn
#              root cause classification (not just anomaly detection).
# ===========================================================================

# ===========================================================================
# PATTERN: Severity Progression Timeline
# WHY: Each failure mode has a defined progression from healthy to failed:
#      - 0-30% of progression: EARLY_WARNING (subtle signal, only ML catches it)
#      - 30-60%: WARNING (visible on dashboards, schedule maintenance)
#      - 60-90%: CRITICAL (imminent failure, prioritize work order)
#      - 90-100%: FAILED (compressor shut down, emergency repair)
#      These thresholds (0.3, 0.6, 0.9) are calibrated so that early
#      warning gives 2-3 days of lead time before critical — enough
#      for the AI agents to investigate, create a work order, and
#      dispatch a technician before unplanned shutdown.
# ===========================================================================

# ===========================================================================
# PATTERN: Fleet Probability Derivation
# WHY: The fleet_probability field represents the chance of a specific
#      failure mode starting in any given 30-day period PER COMPRESSOR.
#      The total combined probability across all 6 modes is:
#      0.025 + 0.020 + 0.015 + 0.020 + 0.015 + 0.030 = 0.125 (12.5%)
#      This means ~12.5% of compressors per month will enter some
#      degradation state. Since degradation takes 5-14 days to resolve,
#      at any snapshot ~5% of fleet is actively degrading — consistent
#      with industry benchmarks for natural gas compression.
# ===========================================================================

from dataclasses import dataclass
from enum import Enum
from typing import Optional, Callable
import math


class FailureMode(Enum):
    BEARING_WEAR = "bearing_wear"
    COOLING_DEGRADATION = "cooling_degradation"
    VALVE_FAILURE = "valve_failure"
    RING_WEAR = "ring_wear"
    PACKING_LEAK = "packing_leak"
    FOULING = "fouling"


class Severity(Enum):
    HEALTHY = "healthy"
    EARLY_WARNING = "early_warning"
    WARNING = "warning"
    CRITICAL = "critical"
    FAILED = "failed"


@dataclass
class FailureScenario:
    """Defines how a specific failure mode progresses over time."""
    mode: FailureMode
    description: str
    onset_day: int              # Day degradation begins
    failure_day: Optional[int]  # Day of full failure (None = caught early)
    primary_sensor: str         # Main affected sensor
    fleet_probability: float    # Probability per compressor per 30-day period

    def get_severity(self, day: int) -> Severity:
        """Determine severity based on progression timeline."""
        if day < self.onset_day:
            return Severity.HEALTHY

        days_degrading = day - self.onset_day
        total_progression = (self.failure_day - self.onset_day) if self.failure_day else 14

        progress = days_degrading / total_progression

        if progress < 0.3:
            return Severity.EARLY_WARNING
        elif progress < 0.6:
            return Severity.WARNING
        elif progress < 0.9:
            return Severity.CRITICAL
        else:
            return Severity.FAILED

    def apply_vibration(self, baseline: float, day: int) -> float:
        """Apply failure-mode-specific vibration degradation.

        Each failure mode affects vibration differently:
        - Bearing wear: Exponential increase (most distinctive signature)
        - Valve failure: Step increase with oscillation (valve bouncing)
        - Ring wear: Gradual linear increase (subtle, hard to detect)
        - Fouling: Slow increase with periodic spikes (deposit dislodging)
        Other modes return baseline (no vibration effect).
        """
        if day < self.onset_day:
            return baseline

        days_degrading = day - self.onset_day

        if self.mode == FailureMode.BEARING_WEAR:
            # Exponential vibration increase (bearing cage deterioration)
            return baseline * (1 + (days_degrading / 3) ** 1.8)
        elif self.mode == FailureMode.VALVE_FAILURE:
            # Step increase with oscillation (valve bouncing)
            return baseline * (1.3 + 0.5 * math.sin(days_degrading * 1.2))
        elif self.mode == FailureMode.RING_WEAR:
            # Gradual linear increase
            return baseline * (1 + days_degrading * 0.08)
        elif self.mode == FailureMode.FOULING:
            # Slow increase with periodic spikes
            spike = 0.3 if days_degrading % 3 == 0 else 0
            return baseline * (1 + days_degrading * 0.05 + spike)
        return baseline

    def apply_temperature(self, baseline: float, day: int) -> float:
        """Apply failure-mode-specific temperature degradation."""
        if day < self.onset_day:
            return baseline

        days_degrading = day - self.onset_day

        if self.mode == FailureMode.COOLING_DEGRADATION:
            # Linear temperature rise (coolant loss / fouled heat exchanger)
            return baseline + (days_degrading * 4.5)
        elif self.mode == FailureMode.BEARING_WEAR:
            # Secondary effect: friction heat
            return baseline + (days_degrading * 1.5)
        elif self.mode == FailureMode.FOULING:
            # Reduced heat transfer
            return baseline + (days_degrading * 3.0)
        elif self.mode == FailureMode.RING_WEAR:
            # Higher compression temps from blowby
            return baseline + (days_degrading * 2.0)
        return baseline

    def apply_pressure(self, baseline: float, day: int, is_discharge: bool = True) -> float:
        """Apply failure-mode-specific pressure changes."""
        if day < self.onset_day:
            return baseline

        days_degrading = day - self.onset_day

        if self.mode == FailureMode.VALVE_FAILURE:
            # Pressure oscillations from failed valves
            offset = math.sin(days_degrading * 0.8) * (50 + days_degrading * 10)
            return baseline + (offset if is_discharge else -offset * 0.3)
        elif self.mode == FailureMode.RING_WEAR:
            # Lower discharge pressure (blowby losses)
            return baseline - (days_degrading * 8 if is_discharge else 0)
        elif self.mode == FailureMode.PACKING_LEAK:
            # Gradual pressure loss
            return baseline - (days_degrading * 5 if is_discharge else -days_degrading * 2)
        return baseline

    def apply_flow(self, baseline: float, day: int) -> float:
        """Apply failure-mode-specific flow rate changes."""
        if day < self.onset_day:
            return baseline

        days_degrading = day - self.onset_day

        if self.mode in (FailureMode.RING_WEAR, FailureMode.PACKING_LEAK):
            # Throughput loss from internal leaks
            return baseline * max(0.5, 1 - days_degrading * 0.03)
        elif self.mode == FailureMode.VALVE_FAILURE:
            # Erratic flow
            return baseline * (0.85 + 0.15 * math.sin(days_degrading * 2.0))
        return baseline


# Pre-defined scenarios for fleet simulation.
# Each scenario defines:
# - onset_day: When degradation begins (day 2-6 depending on mode)
# - failure_day: When full failure occurs (None = gradual, caught early)
# - primary_sensor: Which sensor shows the strongest signal (used for
#   ML model feature importance and investigation agent root cause analysis)
# - fleet_probability: Monthly probability per compressor (see derivation above)
FLEET_SCENARIOS = {
    FailureMode.BEARING_WEAR: FailureScenario(
        mode=FailureMode.BEARING_WEAR,
        description="Progressive bearing cage deterioration causing exponential vibration increase",
        onset_day=3,
        failure_day=8,
        primary_sensor="vibration_mms",
        fleet_probability=0.025,    # 2.5% per month
    ),
    FailureMode.COOLING_DEGRADATION: FailureScenario(
        mode=FailureMode.COOLING_DEGRADATION,
        description="Coolant loss or fouled heat exchanger causing steady temperature rise",
        onset_day=4,
        failure_day=10,
        primary_sensor="discharge_temp_f",
        fleet_probability=0.020,    # 2.0% per month
    ),
    FailureMode.VALVE_FAILURE: FailureScenario(
        mode=FailureMode.VALVE_FAILURE,
        description="Compressor valve plate cracking causing pressure oscillations",
        onset_day=2,
        failure_day=6,
        primary_sensor="discharge_pressure_psi",
        fleet_probability=0.015,
    ),
    FailureMode.RING_WEAR: FailureScenario(
        mode=FailureMode.RING_WEAR,
        description="Piston ring wear causing increased blowby and reduced efficiency",
        onset_day=5,
        failure_day=14,
        primary_sensor="gas_flow_mcf",
        fleet_probability=0.020,
    ),
    FailureMode.PACKING_LEAK: FailureScenario(
        mode=FailureMode.PACKING_LEAK,
        description="Rod packing wear causing methane emissions and pressure loss",
        onset_day=4,
        failure_day=12,
        primary_sensor="discharge_pressure_psi",
        fleet_probability=0.015,
    ),
    FailureMode.FOULING: FailureScenario(
        mode=FailureMode.FOULING,
        description="Internal fouling from dirty gas reducing heat transfer and efficiency",
        onset_day=6,
        failure_day=None,    # Slow degradation, usually caught
        primary_sensor="discharge_temp_f",
        fleet_probability=0.030,    # Most common
    ),
}


# ===========================================================================
# PATTERN: Fleet Failure Assignment (Deterministic Degradation)
# WHY: Rather than randomly triggering failures during simulation,
#      we pre-assign which compressors will degrade and at what onset
#      offset. This makes the simulation fully deterministic (same seed
#      = same failures every time), which is critical for:
#      1. Reproducible tests (unit tests assert specific compressor states)
#      2. Demo consistency (presentations always show the same failures)
#      3. ML model evaluation (compare model versions on identical data)
#      The onset_offset introduces timing variation: some compressors
#      start degrading on day 1, others on day 4. Critical compressors
#      get a negative offset (-2) so they are further along in their
#      degradation curve — appearing already in critical state.
# ===========================================================================
def assign_fleet_failures(
    n_compressors: int,
    failure_rate: float = 0.05,
    critical_rate: float = 0.01,
    seed: int = 42,
) -> dict:
    """
    Assign failure scenarios to a fleet of compressors.

    At any given time:
    - ~5% of fleet has some degradation (early warning to warning)
    - ~1% of fleet is critical or failed
    - Remaining ~94% are healthy

    Args:
        n_compressors: Total fleet size
        failure_rate: Fraction of fleet in degradation
        critical_rate: Fraction of fleet in critical state
        seed: Random seed for reproducibility

    Returns:
        Dict mapping compressor index to (FailureScenario, onset_day_offset)
    """
    import random as _random
    rng = _random.Random(seed)

    n_degrading = int(n_compressors * failure_rate)
    n_critical = int(n_compressors * critical_rate)

    # Weight failure modes by their fleet probability
    modes = list(FLEET_SCENARIOS.keys())
    weights = [FLEET_SCENARIOS[m].fleet_probability for m in modes]

    assignments = {}

    # Assign degrading compressors (warning-level)
    degrading_indices = rng.sample(range(n_compressors), n_degrading)
    for idx in degrading_indices:
        mode = rng.choices(modes, weights=weights, k=1)[0]
        scenario = FLEET_SCENARIOS[mode]
        # Onset varies: some early, some mid-period
        onset_offset = rng.randint(0, 3)
        assignments[idx] = (scenario, onset_offset)

    # Assign critical compressors (subset of degrading, further along)
    critical_indices = rng.sample(degrading_indices, min(n_critical, len(degrading_indices)))
    for idx in critical_indices:
        mode = rng.choices(modes, weights=weights, k=1)[0]
        scenario = FLEET_SCENARIOS[mode]
        # Earlier onset = further along in degradation
        assignments[idx] = (scenario, -2)

    return assignments
