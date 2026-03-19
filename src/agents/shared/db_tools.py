"""
Shared database tools for the Altaviz agentic system.

These functions are used across all 3 agents (Investigation, Work Order, Optimization)
and the existing Diagnostics agent. They wrap parameterized SQL queries and return
JSON-serialized results suitable for Pydantic AI tool_plain functions.
"""

# ===========================================================================
# PATTERN: Repository Pattern (Centralized Data Access Layer)
# WHY: All 4 agents need to query the same database tables (sensor_readings_agg,
#   alert_history, ml_predictions, maintenance_events, compressor_metadata).
#   Instead of each agent writing its own SQL, this module centralizes all
#   data access into reusable functions. Benefits:
#   1. Single place to optimize queries (add indexes, tune SQL)
#   2. Single place to enforce security (parameterized queries prevent SQL injection)
#   3. Consistent JSON serialization across all agents
#   4. Easier testing (mock this module to test agents without a real database)
# SCALING: At 4,700 compressors generating 1.35M rows/day, query performance
#   matters. This module is where you'd add caching, read replicas, or
#   query optimization without changing any agent code.
# ALTERNATIVE: ORM (SQLAlchemy models) — adds abstraction overhead and makes
#   complex analytical queries harder to express. Raw SQL with parameterization
#   gives full control over query performance.
# ===========================================================================

import os
import json
import logging
import urllib.parse
from datetime import datetime, date
from decimal import Decimal

logger = logging.getLogger(__name__)


# ===========================================================================
# Connection Management
# WHY: Each function creates a new connection and closes it after use.
#   This is simple but NOT optimal for high-throughput scenarios.
# SCALING IMPROVEMENT: Use connection pooling (psycopg2.pool.ThreadedConnectionPool
#   or SQLAlchemy's create_engine with pool_size). At 4,700 compressors with
#   concurrent agent calls, connection pooling reduces connection overhead
#   from ~50ms/connection to ~1ms (reusing existing connections).
# SECURITY: sslmode='require' ensures all data in transit is encrypted.
#   The DATABASE_URL is loaded from environment variables (never hardcoded).
# ===========================================================================
def _get_db_connection():
    """Get a database connection from DATABASE_URL."""
    db_url = os.environ.get('DATABASE_URL', '')
    if not db_url:
        raise RuntimeError("DATABASE_URL not set")

    parsed = urllib.parse.urlparse(db_url)

    import psycopg2  # Lazy import: psycopg2 is heavy, only load when needed
    return psycopg2.connect(
        host=parsed.hostname,
        port=parsed.port or 5432,
        dbname=parsed.path.lstrip('/'),
        user=parsed.username,
        password=parsed.password,
        sslmode='require',  # Encrypted connection required (never plain text)
    )


# ===========================================================================
# Serialization Helpers
# WHY: PostgreSQL returns Python types that are NOT JSON-serializable:
#   - datetime → needs .isoformat() for JSON
#   - date → needs .isoformat() for JSON
#   - Decimal → needs float() conversion (Decimal is used for monetary values
#     and precise sensor readings to avoid floating point errors in SQL)
# These helpers ensure all agent tool functions return valid JSON strings
# that the LLM can parse. Without this, json.dumps() would raise TypeError.
# ===========================================================================
def _serialize_value(v):
    """Serialize a single value for JSON output."""
    if isinstance(v, datetime):
        return v.isoformat()
    elif isinstance(v, date):
        return v.isoformat()
    elif isinstance(v, Decimal):
        return float(v)  # Decimal → float for JSON compatibility
    return v


def _serialize_rows(rows: list[dict]) -> list[dict]:
    """Serialize all values in a list of row dicts for JSON output.
    NOTE: This mutates the input list in-place for performance (avoids
    copying large result sets). If you need the original, copy first.
    """
    for row in rows:
        for k, v in row.items():
            row[k] = _serialize_value(v)
    return rows


# ===========================================================================
# Parameterized Queries
# WHY: All SQL uses %s placeholders with a params list, NEVER string
#   interpolation (f-strings or .format()). This prevents SQL injection:
#   a malicious compressor_id like "'; DROP TABLE work_orders; --" would
#   be safely escaped by psycopg2's parameter binding.
# PERFORMANCE: PostgreSQL can also cache execution plans for parameterized
#   queries (prepared statement caching), improving repeated query performance.
# ===========================================================================
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
# ===========================================================================
# Each function below returns a JSON string (not a dict) because Pydantic AI
# tool_plain functions must return str. The agent (LLM) receives these strings
# as tool call results and parses the JSON to reason about the data.
#
# INDEX REQUIREMENTS for production performance:
#   - sensor_readings_agg: INDEX ON (compressor_id, window_type, agg_timestamp DESC)
#   - alert_history: INDEX ON (compressor_id, alert_timestamp DESC)
#   - ml_predictions: INDEX ON (compressor_id, prediction_timestamp DESC)
#   - maintenance_events: INDEX ON (compressor_id, event_date DESC)
#   - compressor_metadata: PRIMARY KEY on compressor_id (already indexed)
#
# AT SCALE (4,700 compressors, 1.35M rows/day):
#   - get_latest_readings: Fast (LIMIT 24 with index, ~2ms)
#   - get_sensor_trend: Moderate (168 hours = 168 rows, ~5ms with index)
#   - get_alert_history: Fast (LIMIT 50, ~2ms)
#   - get_ml_predictions: Fast (LIMIT 5, ~1ms)
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
    # SECURITY: Allowlist validation for the sensor column name.
    # Since sensor_name is interpolated into SQL (f-string), it CANNOT use
    # parameterized binding (%s). Instead, we validate against a strict
    # allowlist to prevent SQL injection via the column name.
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
