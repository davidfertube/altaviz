"""
Compressor Diagnostics AI Agent

Uses Pydantic AI with tool-calling to analyze compressor sensor data,
query the database for context (alerts, ML predictions, maintenance history),
and produce structured diagnostic reports with root cause analysis.

Framework: Pydantic AI (chosen over LangGraph for type-safety and simplicity)
"""

import os
import logging

from pydantic_ai import Agent

from .shared.models import DiagnosticReport
from .shared import db_tools

logger = logging.getLogger(__name__)


# ============================================================================
# AGENT DEFINITION
# ============================================================================

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


# ============================================================================
# TOOL REGISTRATIONS (delegate to shared db_tools)
# ============================================================================

@diagnostics_agent.tool_plain
def get_latest_readings(compressor_id: str) -> str:
    """Fetch the latest sensor readings for a compressor including vibration, temperature, and pressure."""
    return db_tools.get_latest_readings(compressor_id)


@diagnostics_agent.tool_plain
def get_alert_history(compressor_id: str, hours: int = 48) -> str:
    """Fetch recent alerts for a compressor from the last N hours."""
    return db_tools.get_alert_history(compressor_id, hours)


@diagnostics_agent.tool_plain
def get_ml_predictions(compressor_id: str) -> str:
    """Fetch the latest ML predictions (RUL, anomaly, failure probability) for a compressor."""
    return db_tools.get_ml_predictions(compressor_id)


@diagnostics_agent.tool_plain
def get_maintenance_history(compressor_id: str) -> str:
    """Fetch maintenance event history for a compressor."""
    return db_tools.get_maintenance_history(compressor_id)


@diagnostics_agent.tool_plain
def get_compressor_metadata(compressor_id: str) -> str:
    """Fetch compressor metadata including model, station, and installation date."""
    return db_tools.get_compressor_metadata(compressor_id)


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
