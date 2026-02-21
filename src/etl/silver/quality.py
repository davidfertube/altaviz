"""
Data Quality Framework — Production-Grade Quality Checks

Implements data quality checks inspired by Great Expectations patterns:
- Completeness: Are all expected compressors reporting?
- Freshness: Is data arriving on time?
- Consistency: Do sensor values correlate correctly?
- Volume: Is data volume within expected range?

At 4,700 compressors:
- Expected: 4,700 unique compressor_ids per 5-min window
- Missing compressor threshold: 85% (alert if <4,000 reporting)
- Freshness SLA: 15 minutes (alert if no data in 15 min)

Author: David Fernandez
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from dataclasses import dataclass, field

from pyspark.sql import DataFrame
from pyspark.sql import functions as F

logger = logging.getLogger(__name__)


@dataclass
class QualityCheckResult:
    """Result of a single quality check."""
    check_name: str
    passed: bool
    metric_value: float
    threshold: float
    details: str = ""
    severity: str = "warning"    # warning or critical


@dataclass
class QualityReport:
    """Aggregate report of all quality checks."""
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    checks: List[QualityCheckResult] = field(default_factory=list)
    overall_passed: bool = True

    def add_check(self, check: QualityCheckResult):
        self.checks.append(check)
        if not check.passed:
            self.overall_passed = False

    def to_dict(self) -> dict:
        return {
            'timestamp': self.timestamp,
            'overall_passed': self.overall_passed,
            'total_checks': len(self.checks),
            'passed_checks': sum(1 for c in self.checks if c.passed),
            'failed_checks': sum(1 for c in self.checks if not c.passed),
            'checks': [
                {
                    'name': c.check_name,
                    'passed': c.passed,
                    'value': c.metric_value,
                    'threshold': c.threshold,
                    'details': c.details,
                    'severity': c.severity,
                }
                for c in self.checks
            ],
        }


def run_quality_checks(
    df: DataFrame,
    expected_compressors: int = 4700,
    freshness_sla_minutes: int = 15,
    min_completeness: float = 0.95,
) -> QualityReport:
    """
    Run all data quality checks on a DataFrame.

    Args:
        df: Silver or Gold layer DataFrame
        expected_compressors: Expected number of active compressors
        freshness_sla_minutes: Max acceptable data latency
        min_completeness: Minimum sensor completeness ratio

    Returns:
        QualityReport with all check results
    """
    report = QualityReport()

    # 1. Fleet completeness
    report.add_check(check_fleet_completeness(df, expected_compressors))

    # 2. Data freshness
    report.add_check(check_data_freshness(df, freshness_sla_minutes))

    # 3. Sensor completeness
    for sensor in ['vibration_mms', 'discharge_temp_f', 'suction_pressure_psi', 'discharge_pressure_psi']:
        if sensor in df.columns:
            report.add_check(check_sensor_completeness(df, sensor, min_completeness))

    # 4. Volume consistency
    report.add_check(check_volume_consistency(df, expected_compressors))

    # 5. Cross-sensor consistency
    report.add_check(check_pressure_consistency(df))

    # 6. Late arrivals
    if 'bronze_ingested_at' in df.columns:
        report.add_check(check_late_arrivals(df, freshness_sla_minutes))

    # Log summary
    passed = sum(1 for c in report.checks if c.passed)
    total = len(report.checks)
    status = "PASSED" if report.overall_passed else "FAILED"
    logger.info(f"Quality checks {status}: {passed}/{total} passed")

    for check in report.checks:
        if not check.passed:
            logger.warning(f"  FAILED: {check.check_name} — {check.details}")

    return report


def check_fleet_completeness(df: DataFrame, expected: int) -> QualityCheckResult:
    """Check that at least 85% of fleet is reporting data."""
    threshold = 0.85
    actual = df.select("compressor_id").distinct().count()
    ratio = actual / expected if expected > 0 else 0

    return QualityCheckResult(
        check_name="fleet_completeness",
        passed=ratio >= threshold,
        metric_value=ratio,
        threshold=threshold,
        details=f"{actual}/{expected} compressors reporting ({ratio:.1%})",
        severity="critical" if ratio < 0.70 else "warning",
    )


def check_data_freshness(df: DataFrame, sla_minutes: int) -> QualityCheckResult:
    """Check that the most recent data is within SLA."""
    max_ts = df.agg(F.max("timestamp")).collect()[0][0]

    if max_ts is None:
        return QualityCheckResult(
            check_name="data_freshness",
            passed=False,
            metric_value=float('inf'),
            threshold=sla_minutes,
            details="No data found",
            severity="critical",
        )

    age_minutes = (datetime.now() - max_ts).total_seconds() / 60

    return QualityCheckResult(
        check_name="data_freshness",
        passed=age_minutes <= sla_minutes,
        metric_value=round(age_minutes, 1),
        threshold=sla_minutes,
        details=f"Latest data is {age_minutes:.1f} minutes old (SLA: {sla_minutes} min)",
        severity="critical" if age_minutes > sla_minutes * 2 else "warning",
    )


def check_sensor_completeness(df: DataFrame, sensor: str, min_ratio: float) -> QualityCheckResult:
    """Check that a sensor has sufficient non-null values."""
    total = df.count()
    non_null = df.filter(F.col(sensor).isNotNull()).count()
    ratio = non_null / total if total > 0 else 0

    return QualityCheckResult(
        check_name=f"sensor_completeness_{sensor}",
        passed=ratio >= min_ratio,
        metric_value=round(ratio, 4),
        threshold=min_ratio,
        details=f"{sensor}: {non_null:,}/{total:,} non-null ({ratio:.1%})",
    )


def check_volume_consistency(df: DataFrame, expected_compressors: int) -> QualityCheckResult:
    """
    Check that per-compressor row counts are consistent.

    Flags if any compressor has < 50% of the average row count,
    which may indicate data loss for that unit.
    """
    counts = df.groupBy("compressor_id").count()
    stats = counts.agg(
        F.avg("count").alias("avg_count"),
        F.min("count").alias("min_count"),
        F.max("count").alias("max_count"),
    ).collect()[0]

    avg_count = stats['avg_count'] or 0
    min_count = stats['min_count'] or 0
    ratio = min_count / avg_count if avg_count > 0 else 0

    return QualityCheckResult(
        check_name="volume_consistency",
        passed=ratio >= 0.5,
        metric_value=round(ratio, 3),
        threshold=0.5,
        details=f"Min/Avg row ratio: {ratio:.2f} (min={min_count}, avg={avg_count:.0f})",
    )


def check_late_arrivals(
    df: DataFrame, threshold_minutes: int = 15, max_late_pct: float = 5.0,
) -> QualityCheckResult:
    """
    Measure how many records arrived significantly after their event time.

    Compares bronze_ingested_at (when the record hit the pipeline) against
    timestamp (when the sensor actually produced the reading). Records
    arriving more than threshold_minutes late indicate connectivity issues,
    store-and-forward buffers, or remote basin outages.

    Args:
        df: DataFrame with both 'timestamp' and 'bronze_ingested_at' columns
        threshold_minutes: Minutes of delay before a record counts as "late"
        max_late_pct: Fail the check if late records exceed this percentage
    """
    total = df.count()
    if total == 0:
        return QualityCheckResult(
            check_name="late_arrivals",
            passed=True,
            metric_value=0.0,
            threshold=max_late_pct,
            details="No data to check",
        )

    late_count = df.filter(
        (F.col("bronze_ingested_at").cast("long") - F.col("timestamp").cast("long"))
        > threshold_minutes * 60
    ).count()

    late_pct = (late_count / total) * 100

    # Per-compressor breakdown for the worst offenders
    details = f"{late_count:,}/{total:,} records arrived >{threshold_minutes}min late ({late_pct:.1f}%)"
    if late_count > 0:
        worst = (
            df.filter(
                (F.col("bronze_ingested_at").cast("long") - F.col("timestamp").cast("long"))
                > threshold_minutes * 60
            )
            .groupBy("compressor_id")
            .count()
            .orderBy(F.desc("count"))
            .limit(5)
            .collect()
        )
        top_ids = ", ".join(f"{r['compressor_id']}({r['count']})" for r in worst)
        details += f" | worst: {top_ids}"

    return QualityCheckResult(
        check_name="late_arrivals",
        passed=late_pct <= max_late_pct,
        metric_value=round(late_pct, 2),
        threshold=max_late_pct,
        details=details,
        severity="critical" if late_pct > max_late_pct * 2 else "warning",
    )


def check_pressure_consistency(df: DataFrame) -> QualityCheckResult:
    """
    Check that discharge pressure > suction pressure (physical law).

    If > 1% of readings violate this, sensors may be miscalibrated.
    """
    if 'discharge_pressure_psi' not in df.columns or 'suction_pressure_psi' not in df.columns:
        return QualityCheckResult(
            check_name="pressure_consistency",
            passed=True,
            metric_value=1.0,
            threshold=0.99,
            details="Pressure columns not available, skipping",
        )

    total = df.filter(
        F.col("discharge_pressure_psi").isNotNull() &
        F.col("suction_pressure_psi").isNotNull()
    ).count()

    violations = df.filter(
        F.col("discharge_pressure_psi").isNotNull() &
        F.col("suction_pressure_psi").isNotNull() &
        (F.col("discharge_pressure_psi") <= F.col("suction_pressure_psi"))
    ).count()

    valid_ratio = 1 - (violations / total) if total > 0 else 1.0

    return QualityCheckResult(
        check_name="pressure_consistency",
        passed=valid_ratio >= 0.99,
        metric_value=round(valid_ratio, 4),
        threshold=0.99,
        details=f"{violations:,}/{total:,} readings have discharge <= suction pressure",
        severity="warning",
    )
