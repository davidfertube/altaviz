"""
Fleet Scanner — autonomous fleet health scanning for the Optimization Copilot.

Queries fleet-wide health data, ML predictions, and active alerts to identify
at-risk compressors and optimization opportunities. Runs on schedule
(hourly/daily/weekly) or on-demand.
"""

import json
import logging
from datetime import datetime
from typing import Optional

from .shared.db_tools import query_db, execute_db, _serialize_rows

logger = logging.getLogger(__name__)


def scan_fleet_health(organization_id: str) -> str:
    """Scan the full fleet and return health summary with risk rankings.

    Combines fleet health view with latest ML predictions to produce
    a ranked list of at-risk compressors.
    """
    try:
        # Fleet health from view
        fleet = query_db(
            """SELECT compressor_id, model, station_id, station_name,
                      last_reading_time, vibration_max, discharge_temp_max,
                      discharge_pressure_mean, active_alert_count, health_status
               FROM v_fleet_health_summary
               WHERE organization_id = %s
               ORDER BY active_alert_count DESC, health_status DESC""",
            [organization_id]
        )

        # Latest ML predictions per compressor
        predictions = query_db(
            """SELECT DISTINCT ON (compressor_id)
                      compressor_id, rul_days, failure_probability,
                      confidence_score, prediction_timestamp
               FROM ml_predictions
               WHERE organization_id = %s
               ORDER BY compressor_id, prediction_timestamp DESC""",
            [organization_id]
        )
        pred_map = {p['compressor_id']: p for p in predictions}

        # Calculate health distribution
        total = len(fleet)
        healthy = sum(1 for f in fleet if f.get('health_status') == 'healthy')
        warning = sum(1 for f in fleet if f.get('health_status') == 'warning')
        critical = sum(1 for f in fleet if f.get('health_status') == 'critical')

        # Score each compressor: higher score = higher risk
        scored = []
        for comp in fleet:
            cid = comp['compressor_id']
            pred = pred_map.get(cid, {})
            score = 0

            # Alert-based scoring
            alerts = comp.get('active_alert_count', 0) or 0
            score += alerts * 20

            # Status-based scoring
            if comp.get('health_status') == 'critical':
                score += 50
            elif comp.get('health_status') == 'warning':
                score += 25

            # ML prediction scoring
            fp = float(pred.get('failure_probability', 0) or 0)
            score += fp * 100

            rul = pred.get('rul_days')
            if rul is not None:
                rul_val = float(rul)
                if rul_val < 3:
                    score += 40
                elif rul_val < 7:
                    score += 20
                elif rul_val < 14:
                    score += 10

            scored.append({
                **comp,
                'failure_probability': fp,
                'rul_days': float(rul) if rul is not None else None,
                'risk_score': round(score, 1),
            })

        # Sort by risk score descending
        scored.sort(key=lambda x: x['risk_score'], reverse=True)

        # Health score: 0-100 (100 = all healthy)
        health_score = (healthy / total * 100) if total > 0 else 100

        result = {
            "scan_timestamp": datetime.utcnow().isoformat(),
            "total_compressors": total,
            "health_distribution": {
                "healthy": healthy,
                "warning": warning,
                "critical": critical,
            },
            "fleet_health_score": round(health_score, 1),
            "top_risks": _serialize_rows(scored[:10]),
            "all_compressors": _serialize_rows(scored),
        }

        return json.dumps(result, default=str)
    except Exception as e:
        logger.error(f"Fleet scan failed: {e}")
        return json.dumps({"error": str(e)})


def get_basin_summary(organization_id: str, basin: Optional[str] = None) -> str:
    """Get aggregated health metrics per basin."""
    try:
        conditions = ["sl.organization_id = %s"]
        params = [organization_id]
        if basin:
            conditions.append("sl.region = %s")
            params.append(basin)

        where = " AND ".join(conditions)

        rows = query_db(
            f"""SELECT sl.region as basin,
                       COUNT(DISTINCT cm.compressor_id) as compressor_count,
                       COUNT(DISTINCT CASE WHEN fh.health_status = 'critical' THEN cm.compressor_id END) as critical_count,
                       COUNT(DISTINCT CASE WHEN fh.health_status = 'warning' THEN cm.compressor_id END) as warning_count,
                       COUNT(DISTINCT CASE WHEN fh.health_status = 'healthy' THEN cm.compressor_id END) as healthy_count,
                       AVG(fh.vibration_max) as avg_vibration,
                       AVG(fh.discharge_temp_max) as avg_temp
                FROM station_locations sl
                JOIN compressor_metadata cm ON sl.station_id = cm.station_id
                LEFT JOIN v_fleet_health_summary fh ON cm.compressor_id = fh.compressor_id
                WHERE {where}
                GROUP BY sl.region
                ORDER BY critical_count DESC""",
            params
        )
        return json.dumps(_serialize_rows(rows), default=str)
    except Exception as e:
        return json.dumps({"error": str(e)})


def create_fleet_snapshot(
    organization_id: str,
    snapshot_type: str = 'daily',
) -> str:
    """Create and persist a fleet health snapshot."""
    from .shared.id_generator import generate_snapshot_id

    try:
        scan_result = json.loads(scan_fleet_health(organization_id))
        if 'error' in scan_result:
            return json.dumps(scan_result)

        basin_result = json.loads(get_basin_summary(organization_id))

        # Get fleet-wide emissions
        emissions_rows = query_db(
            """SELECT SUM(co2e_tonnes) as total_emissions
               FROM emissions_estimates
               WHERE organization_id = %s
                 AND estimate_timestamp >= NOW() - INTERVAL '24 hours'""",
            [organization_id]
        )
        total_emissions = float(emissions_rows[0].get('total_emissions', 0) or 0) if emissions_rows else 0

        # Get average RUL
        rul_rows = query_db(
            """SELECT AVG(rul_days * 24) as avg_rul_hours
               FROM (
                   SELECT DISTINCT ON (compressor_id) rul_days
                   FROM ml_predictions
                   WHERE organization_id = %s AND rul_days IS NOT NULL
                   ORDER BY compressor_id, prediction_timestamp DESC
               ) latest""",
            [organization_id]
        )
        avg_rul = float(rul_rows[0].get('avg_rul_hours', 0) or 0) if rul_rows else 0

        snapshot_id = generate_snapshot_id(snapshot_type)
        dist = scan_result.get('health_distribution', {})

        execute_db(
            """INSERT INTO fleet_snapshots
               (snapshot_id, organization_id, snapshot_type,
                total_compressors, healthy_count, warning_count, critical_count,
                fleet_health_score, avg_rul_hours, total_emissions_tonnes,
                basin_metrics, top_risks)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
               ON CONFLICT (snapshot_id) DO UPDATE SET
                 total_compressors = EXCLUDED.total_compressors,
                 healthy_count = EXCLUDED.healthy_count,
                 warning_count = EXCLUDED.warning_count,
                 critical_count = EXCLUDED.critical_count,
                 fleet_health_score = EXCLUDED.fleet_health_score,
                 avg_rul_hours = EXCLUDED.avg_rul_hours,
                 total_emissions_tonnes = EXCLUDED.total_emissions_tonnes,
                 basin_metrics = EXCLUDED.basin_metrics,
                 top_risks = EXCLUDED.top_risks""",
            [
                snapshot_id, organization_id, snapshot_type,
                scan_result.get('total_compressors', 0),
                dist.get('healthy', 0),
                dist.get('warning', 0),
                dist.get('critical', 0),
                scan_result.get('fleet_health_score', 0),
                avg_rul,
                total_emissions,
                json.dumps(basin_result if isinstance(basin_result, list) else []),
                json.dumps(scan_result.get('top_risks', [])),
            ]
        )

        return json.dumps({
            "snapshot_id": snapshot_id,
            "fleet_health_score": scan_result.get('fleet_health_score'),
            "total_compressors": scan_result.get('total_compressors'),
            "health_distribution": dist,
            "top_risks_count": len(scan_result.get('top_risks', [])),
        })
    except Exception as e:
        logger.error(f"Snapshot creation failed: {e}")
        return json.dumps({"error": str(e)})
