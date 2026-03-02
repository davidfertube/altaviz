"""
Shared database tools for the Altaviz agentic system.

These functions are used across all 3 agents (Investigation, Work Order, Optimization)
and the existing Diagnostics agent. They wrap parameterized SQL queries and return
JSON-serialized results suitable for Pydantic AI tool_plain functions.
"""

import os
import json
import logging
import urllib.parse
from datetime import datetime, date
from decimal import Decimal

logger = logging.getLogger(__name__)


def _get_db_connection():
    """Get a database connection from DATABASE_URL."""
    db_url = os.environ.get('DATABASE_URL', '')
    if not db_url:
        raise RuntimeError("DATABASE_URL not set")

    parsed = urllib.parse.urlparse(db_url)

    import psycopg2
    return psycopg2.connect(
        host=parsed.hostname,
        port=parsed.port or 5432,
        dbname=parsed.path.lstrip('/'),
        user=parsed.username,
        password=parsed.password,
        sslmode='require',
    )


def _serialize_value(v):
    """Serialize a single value for JSON output."""
    if isinstance(v, datetime):
        return v.isoformat()
    elif isinstance(v, date):
        return v.isoformat()
    elif isinstance(v, Decimal):
        return float(v)
    return v


def _serialize_rows(rows: list[dict]) -> list[dict]:
    """Serialize all values in a list of row dicts for JSON output."""
    for row in rows:
        for k, v in row.items():
            row[k] = _serialize_value(v)
    return rows


def query_db(sql: str, params: list) -> list[dict]:
    """Execute a parameterized query and return results as list of dicts."""
    conn = _get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute(sql, params)
        columns = [desc[0] for desc in cur.description]
        rows = cur.fetchall()
        return [dict(zip(columns, row)) for row in rows]
    finally:
        conn.close()


def execute_db(sql: str, params: list) -> int:
    """Execute a parameterized write query and return rows affected."""
    conn = _get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute(sql, params)
        conn.commit()
        return cur.rowcount
    finally:
        conn.close()


def insert_returning(sql: str, params: list) -> dict:
    """Execute an INSERT ... RETURNING query and return the inserted row."""
    conn = _get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute(sql, params)
        conn.commit()
        columns = [desc[0] for desc in cur.description]
        row = cur.fetchone()
        return dict(zip(columns, row)) if row else {}
    finally:
        conn.close()


# ============================================================================
# SHARED TOOL FUNCTIONS (used by multiple agents)
# ============================================================================

def get_latest_readings(compressor_id: str) -> str:
    """Fetch the latest 24 hours of 1hr-window sensor readings for a compressor."""
    try:
        rows = query_db(
            """SELECT compressor_id, agg_timestamp, window_type,
                      vibration_mean, vibration_max,
                      discharge_temp_mean, discharge_temp_max,
                      suction_pressure_mean, discharge_pressure_mean,
                      horsepower_mean, gas_flow_mean
               FROM sensor_readings_agg
               WHERE compressor_id = %s AND window_type = '1hr'
               ORDER BY agg_timestamp DESC
               LIMIT 24""",
            [compressor_id]
        )
        if not rows:
            return json.dumps({"error": f"No readings found for {compressor_id}"})
        return json.dumps(_serialize_rows(rows), default=str)
    except Exception as e:
        return json.dumps({"error": str(e)})


def get_alert_history(compressor_id: str, hours: int = 48) -> str:
    """Fetch recent alerts for a compressor from the last N hours."""
    try:
        rows = query_db(
            """SELECT id, alert_timestamp, alert_type, severity, sensor_name,
                      message, acknowledged, resolved
               FROM alert_history
               WHERE compressor_id = %s
                 AND alert_timestamp >= NOW() - make_interval(hours => %s)
               ORDER BY alert_timestamp DESC
               LIMIT 50""",
            [compressor_id, hours]
        )
        return json.dumps(_serialize_rows(rows), default=str)
    except Exception as e:
        return json.dumps({"error": str(e)})


def get_ml_predictions(compressor_id: str) -> str:
    """Fetch the latest ML predictions for a compressor."""
    try:
        rows = query_db(
            """SELECT compressor_id, rul_days, failure_probability,
                      confidence_score, model_version, features_used, prediction_timestamp
               FROM ml_predictions
               WHERE compressor_id = %s
               ORDER BY prediction_timestamp DESC
               LIMIT 5""",
            [compressor_id]
        )
        return json.dumps(_serialize_rows(rows), default=str)
    except Exception as e:
        return json.dumps({"error": str(e)})


def get_maintenance_history(compressor_id: str) -> str:
    """Fetch maintenance event history for a compressor."""
    try:
        rows = query_db(
            """SELECT compressor_id, event_date, event_type, description,
                      cost_usd, downtime_hours, severity
               FROM maintenance_events
               WHERE compressor_id = %s
               ORDER BY event_date DESC
               LIMIT 10""",
            [compressor_id]
        )
        return json.dumps(_serialize_rows(rows), default=str)
    except Exception as e:
        return json.dumps({"error": str(e)})


def get_compressor_metadata(compressor_id: str) -> str:
    """Fetch compressor metadata including model, station, and installation date."""
    try:
        rows = query_db(
            """SELECT cm.compressor_id, cm.model, cm.horsepower, cm.install_date,
                      cm.station_id, sl.station_name, sl.latitude, sl.longitude,
                      sl.region, sl.state
               FROM compressor_metadata cm
               LEFT JOIN station_locations sl ON cm.station_id = sl.station_id
               WHERE cm.compressor_id = %s""",
            [compressor_id]
        )
        return json.dumps(_serialize_rows(rows), default=str)
    except Exception as e:
        return json.dumps({"error": str(e)})


def get_sensor_trend(compressor_id: str, sensor_name: str, hours: int = 168) -> str:
    """Fetch a specific sensor's trend over the last N hours (default 7 days).

    sensor_name should be one of: vibration_mean, vibration_max,
    discharge_temp_mean, discharge_temp_max, suction_pressure_mean,
    discharge_pressure_mean, horsepower_mean, gas_flow_mean.
    """
    allowed_sensors = {
        'vibration_mean', 'vibration_max', 'vibration_std',
        'discharge_temp_mean', 'discharge_temp_max', 'discharge_temp_rate_of_change',
        'suction_pressure_mean', 'discharge_pressure_mean',
        'pressure_delta_mean', 'horsepower_mean', 'gas_flow_mean',
    }
    if sensor_name not in allowed_sensors:
        return json.dumps({"error": f"Unknown sensor: {sensor_name}. Allowed: {sorted(allowed_sensors)}"})

    try:
        rows = query_db(
            f"""SELECT agg_timestamp, {sensor_name}
                FROM sensor_readings_agg
                WHERE compressor_id = %s AND window_type = '1hr'
                  AND agg_timestamp >= NOW() - make_interval(hours => %s)
                ORDER BY agg_timestamp ASC""",
            [compressor_id, hours]
        )
        return json.dumps(_serialize_rows(rows), default=str)
    except Exception as e:
        return json.dumps({"error": str(e)})


def get_emissions_data(compressor_id: str) -> str:
    """Fetch recent emissions estimates for a compressor."""
    try:
        rows = query_db(
            """SELECT compressor_id, estimate_timestamp, methane_tonnes,
                      co2e_tonnes, emission_rate_scfh, estimation_method
               FROM emissions_estimates
               WHERE compressor_id = %s
               ORDER BY estimate_timestamp DESC
               LIMIT 10""",
            [compressor_id]
        )
        return json.dumps(_serialize_rows(rows), default=str)
    except Exception as e:
        return json.dumps({"error": str(e)})
