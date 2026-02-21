"""
Compressor Diagnostics AI Agent

Uses Pydantic AI with tool-calling to analyze compressor sensor data,
query the database for context (alerts, ML predictions, maintenance history),
and produce structured diagnostic reports with root cause analysis.

This agent demonstrates:
- Tool-calling pattern: agent decides which database queries to run based on context
- Structured output: Pydantic models for type-safe diagnostic reports
- Domain expertise: compressor health analysis for oil & gas operations

Framework: Pydantic AI (chosen over LangGraph for type-safety and simplicity)

Author: David Fernandez
"""

import os
import json
import logging
import urllib.parse
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field
from pydantic_ai import Agent

logger = logging.getLogger(__name__)


# ============================================================================
# STRUCTURED OUTPUT MODELS
# ============================================================================

class RecommendedAction(BaseModel):
    """A specific maintenance or operational action to take."""
    action: str = Field(description="Clear description of the action to take")
    priority: str = Field(description="Priority level: immediate, next_shift, next_maintenance_window, or monitor")
    estimated_downtime_hours: Optional[float] = Field(default=None, description="Estimated downtime if action requires shutdown")
    rationale: str = Field(description="Why this action is recommended based on the data")


class DiagnosticReport(BaseModel):
    """Structured diagnostic report for a compressor unit."""
    compressor_id: str = Field(description="The compressor identifier (e.g., COMP-003)")
    severity: str = Field(description="Overall severity: healthy, warning, critical, or emergency")
    root_cause_analysis: str = Field(description="Analysis of what is causing the current condition")
    contributing_factors: list[str] = Field(description="List of factors contributing to the diagnosis")
    recommended_actions: list[RecommendedAction] = Field(description="Prioritized list of recommended actions")
    estimated_time_to_failure: Optional[str] = Field(default=None, description="Estimated time until critical failure, if applicable")
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence in the diagnosis (0.0 to 1.0)")
    data_summary: str = Field(description="Summary of the sensor data analyzed")


# ============================================================================
# DATABASE HELPER
# ============================================================================

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


def _query_db(sql: str, params: list) -> list[dict]:
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


# ============================================================================
# AGENT DEFINITION
# ============================================================================

# Default to OpenAI gpt-4o-mini for cost efficiency, but supports any model
_model = os.environ.get('DIAGNOSTICS_MODEL', 'openai:gpt-4o-mini')

diagnostics_agent = Agent(
    _model,
    result_type=DiagnosticReport,
    system_prompt="""You are an expert compressor diagnostics engineer specializing in
reciprocating natural gas compressors used in oil and gas pipeline operations.

Your job is to analyze sensor data, alert history, ML predictions, and maintenance
records for a specific compressor and produce a structured diagnostic report.

Key sensor thresholds (API 618 / ISO 10816 standards):
- Vibration: Normal <4.5 mm/s, Warning >6.0 mm/s, Critical >8.0 mm/s
- Discharge Temperature: Normal <220F, Warning >240F, Critical >260F
- Discharge Pressure: Normal <1200 PSI, Warning >1300 PSI, Critical >1400 PSI

Common failure modes for reciprocating compressors:
1. Bearing failure: Exponential vibration increase over days
2. Valve failure: Gradual temperature increase with pressure fluctuations
3. Packing/seal degradation: Slow pressure loss with increased emissions
4. Cooling system failure: Linear temperature increase to critical

When analyzing data:
- Use ALL available tools to gather context before making your diagnosis
- Consider trends over time, not just current values
- Cross-reference ML predictions with actual sensor readings
- Factor in maintenance history (recent repairs may explain anomalies)
- Be specific about root causes, not vague
- Prioritize safety-critical recommendations first

Always use the tools provided to fetch real data. Do not make up sensor readings.""",
)


@diagnostics_agent.tool_plain
def get_latest_readings(compressor_id: str) -> str:
    """Fetch the latest sensor readings for a compressor including vibration, temperature, and pressure."""
    try:
        rows = _query_db(
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
        # Serialize datetimes
        for row in rows:
            for k, v in row.items():
                if isinstance(v, datetime):
                    row[k] = v.isoformat()
                elif hasattr(v, 'as_tuple'):
                    row[k] = float(v)
        return json.dumps(rows, default=str)
    except Exception as e:
        return json.dumps({"error": str(e)})


@diagnostics_agent.tool_plain
def get_alert_history(compressor_id: str, hours: int = 48) -> str:
    """Fetch recent alerts for a compressor from the last N hours."""
    try:
        rows = _query_db(
            """SELECT id, alert_timestamp, alert_type, severity, sensor_name,
                      message, acknowledged, resolved
               FROM alert_history
               WHERE compressor_id = %s
                 AND alert_timestamp >= NOW() - make_interval(hours => %s)
               ORDER BY alert_timestamp DESC
               LIMIT 50""",
            [compressor_id, hours]
        )
        return json.dumps(rows, default=str)
    except Exception as e:
        return json.dumps({"error": str(e)})


@diagnostics_agent.tool_plain
def get_ml_predictions(compressor_id: str) -> str:
    """Fetch the latest ML predictions (RUL, anomaly, failure probability) for a compressor."""
    try:
        rows = _query_db(
            """SELECT compressor_id, predicted_rul_days, failure_probability,
                      confidence_score, model_version, features_used, prediction_timestamp
               FROM ml_predictions
               WHERE compressor_id = %s
               ORDER BY prediction_timestamp DESC
               LIMIT 5""",
            [compressor_id]
        )
        return json.dumps(rows, default=str)
    except Exception as e:
        return json.dumps({"error": str(e)})


@diagnostics_agent.tool_plain
def get_maintenance_history(compressor_id: str) -> str:
    """Fetch maintenance event history for a compressor."""
    try:
        rows = _query_db(
            """SELECT compressor_id, event_date, event_type, description,
                      cost, technician, parts_replaced, downtime_hours
               FROM maintenance_events
               WHERE compressor_id = %s
               ORDER BY event_date DESC
               LIMIT 10""",
            [compressor_id]
        )
        return json.dumps(rows, default=str)
    except Exception as e:
        return json.dumps({"error": str(e)})


@diagnostics_agent.tool_plain
def get_compressor_metadata(compressor_id: str) -> str:
    """Fetch compressor metadata including model, station, and installation date."""
    try:
        rows = _query_db(
            """SELECT cm.compressor_id, cm.compressor_model, cm.installation_date,
                      cm.station_id, sl.station_name, sl.latitude, sl.longitude
               FROM compressor_metadata cm
               LEFT JOIN station_locations sl ON cm.station_id = sl.station_id
               WHERE cm.compressor_id = %s""",
            [compressor_id]
        )
        return json.dumps(rows, default=str)
    except Exception as e:
        return json.dumps({"error": str(e)})


# ============================================================================
# PUBLIC API
# ============================================================================

async def diagnose_compressor(compressor_id: str) -> DiagnosticReport:
    """
    Run the AI diagnostics agent for a specific compressor.

    The agent will:
    1. Fetch latest sensor readings
    2. Check alert history
    3. Review ML predictions
    4. Examine maintenance records
    5. Produce a structured diagnostic report

    Args:
        compressor_id: The compressor ID (e.g., "COMP-003")

    Returns:
        DiagnosticReport: Structured diagnosis with root cause and recommendations
    """
    result = await diagnostics_agent.run(
        f"Diagnose compressor {compressor_id}. "
        f"Fetch all available data using the provided tools, then produce a comprehensive diagnostic report."
    )
    return result.data
