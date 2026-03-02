"""
Fleet Optimization Copilot (Use Case 3)

Proactive agent that continuously monitors fleet health, identifies
optimization opportunities, runs what-if scenarios, and provides
a conversational interface for fleet operations questions.

Agentic patterns demonstrated:
- Autonomous/proactive agents (scheduled scans)
- Simulation (what-if scenarios)
- Multi-objective optimization (safety vs. cost vs. emissions)
- Conversational interface (multi-turn chat)
- Guardrails (safety priorities, throughput minimums)
- Cross-agent triggers (investigation, work order)
"""

import os
import json
import time
import logging
from typing import Optional

from pydantic_ai import Agent

from .shared.models import FleetScanResult, OptimizationRecommendation
from .shared import db_tools
from .shared.id_generator import generate_recommendation_id
from .shared.memory import create_session, complete_session
from . import fleet_scanner, simulator

logger = logging.getLogger(__name__)


# ============================================================================
# AGENT DEFINITION
# ============================================================================

_model = os.environ.get('DIAGNOSTICS_MODEL', 'openai:gpt-4o-mini')

optimization_agent = Agent(
    _model,
    result_type=FleetScanResult,
    system_prompt="""You are a fleet operations strategist for a natural gas compression fleet.
You think at the FLEET level (not individual compressor level) to optimize operations.

PRIORITY HIERARCHY (never violate):
1. SAFETY — Never recommend actions that increase safety risk
2. COMPLIANCE — EPA OOOOb methane rules must be met (25,000 tonnes CO2e/year threshold)
3. RELIABILITY — Maintain fleet uptime above 95%
4. EFFICIENCY — Optimize load distribution and operating parameters
5. COST — Minimize total cost of ownership

YOUR RESPONSIBILITIES:
1. Scan fleet health and identify at-risk compressors
2. Recommend load rebalancing when stations have uneven utilization
3. Flag maintenance deferrals that are becoming risky
4. Identify emissions reduction opportunities
5. Suggest preventive maintenance scheduling based on ML predictions
6. Generate fleet health score and trends

RECOMMENDATIONS FORMAT:
- Every recommendation must quantify impact in dollars and/or emissions tonnes
- Always run a what-if simulation before recommending a change
- Flag any compressor with failure probability > 20% for investigation
- Flag any station with > 2 critical compressors for emergency review

GUARDRAILS:
- Never recommend reducing station throughput below 70% of commitment
- Never suggest deferring maintenance past 2x the predicted RUL
- Always recommend investigation before work order for complex issues
- Consider seasonal patterns (summer = higher temps, winter = higher demand)

Use ALL available tools to gather comprehensive fleet data before making recommendations.""",
)


# ============================================================================
# TOOL REGISTRATIONS
# ============================================================================

@optimization_agent.tool_plain
def scan_fleet(organization_id: str) -> str:
    """Scan the full fleet and return health summary with risk rankings."""
    return fleet_scanner.scan_fleet_health(organization_id)


@optimization_agent.tool_plain
def get_fleet_snapshot(organization_id: str, snapshot_type: str = 'daily') -> str:
    """Get or create a fleet health snapshot (hourly/daily/weekly)."""
    return fleet_scanner.create_fleet_snapshot(organization_id, snapshot_type)


@optimization_agent.tool_plain
def get_basin_health(organization_id: str, basin: Optional[str] = None) -> str:
    """Get health metrics aggregated by basin. Leave basin empty for all basins."""
    return fleet_scanner.get_basin_summary(organization_id, basin)


@optimization_agent.tool_plain
def simulate_maintenance_deferral(compressor_id: str, defer_days: int) -> str:
    """Run a what-if: what happens if we defer maintenance on this compressor by N days?
    Returns risk assessment with failure probability projections."""
    return simulator.run_maintenance_deferral(compressor_id, defer_days)


@optimization_agent.tool_plain
def simulate_load_balance(station_id: str, organization_id: str) -> str:
    """Run a what-if: simulate redistributing load across compressors at a station.
    Identifies overloaded/underloaded units and estimates improvement."""
    return simulator.run_load_balance_simulation(station_id, organization_id)


@optimization_agent.tool_plain
def get_fleet_emissions(organization_id: str) -> str:
    """Get fleet-wide emissions summary with EPA OOOOb compliance status."""
    return simulator.get_emissions_fleet_summary(organization_id)


@optimization_agent.tool_plain
def get_ml_predictions(compressor_id: str) -> str:
    """Fetch the latest ML predictions for a specific compressor."""
    return db_tools.get_ml_predictions(compressor_id)


@optimization_agent.tool_plain
def get_compressor_metadata(compressor_id: str) -> str:
    """Fetch compressor metadata including model, station, and installation date."""
    return db_tools.get_compressor_metadata(compressor_id)


@optimization_agent.tool_plain
def save_recommendation(
    rec_type: str, scope: str, target_ids: str, title: str,
    description: str, priority: str, confidence: float,
    estimated_savings_usd: Optional[float] = None,
    estimated_emissions_reduction: Optional[float] = None,
) -> str:
    """Save an optimization recommendation to the database.
    target_ids: comma-separated list of compressor/station/basin IDs."""
    try:
        rec_id = generate_recommendation_id()
        ids_list = [x.strip() for x in target_ids.split(',')]

        # Get org ID
        org_rows = db_tools.query_db(
            "SELECT id FROM organizations WHERE slug = 'altaviz-demo' LIMIT 1", []
        )
        org_id = str(org_rows[0]['id']) if org_rows else None

        db_tools.execute_db(
            """INSERT INTO optimization_recommendations
               (recommendation_id, organization_id, rec_type, scope, target_ids,
                title, description, priority, ai_confidence,
                estimated_savings_usd, estimated_emissions_reduction_tonnes)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            [rec_id, org_id, rec_type, scope, json.dumps(ids_list),
             title, description, priority, confidence,
             estimated_savings_usd, estimated_emissions_reduction]
        )

        return json.dumps({"recommendation_id": rec_id, "status": "saved"})
    except Exception as e:
        return json.dumps({"error": str(e)})


@optimization_agent.tool_plain
def trigger_investigation(compressor_id: str, reason: str) -> str:
    """Flag a compressor for root cause investigation by the Investigation Agent.
    Use this when a compressor needs deeper analysis beyond fleet-level scanning."""
    try:
        # Check for existing recent investigation
        rows = db_tools.query_db(
            """SELECT investigation_id, created_at FROM investigation_reports
               WHERE compressor_id = %s AND created_at >= NOW() - INTERVAL '24 hours'
               ORDER BY created_at DESC LIMIT 1""",
            [compressor_id]
        )
        if rows:
            return json.dumps({
                "status": "already_investigated",
                "investigation_id": rows[0]['investigation_id'],
                "message": f"Recent investigation exists (within 24 hours)"
            })

        return json.dumps({
            "status": "investigation_requested",
            "compressor_id": compressor_id,
            "reason": reason,
            "message": "Investigation agent should be triggered for this compressor"
        })
    except Exception as e:
        return json.dumps({"error": str(e)})


# ============================================================================
# PUBLIC API
# ============================================================================

async def run_fleet_scan(
    organization_id: Optional[str] = None,
    scan_type: str = 'full',
    user_id: Optional[str] = None,
) -> FleetScanResult:
    """Run a fleet optimization scan.

    The agent will scan fleet health, identify risks, run what-if scenarios,
    and generate optimization recommendations.
    """
    start_time = time.time()

    if not organization_id:
        rows = db_tools.query_db(
            "SELECT id FROM organizations WHERE slug = 'altaviz-demo' LIMIT 1", []
        )
        organization_id = str(rows[0]['id']) if rows else None

    session_id = None
    if organization_id:
        session_id = create_session(
            organization_id=organization_id,
            agent_type='optimization',
            user_id=user_id,
            trigger_type='scheduled' if not user_id else 'manual',
        )

    try:
        prompt = (
            f"Run a {'full' if scan_type == 'full' else 'critical-only'} fleet optimization scan. "
            f"Organization ID: {organization_id}. "
            f"1. Scan fleet health to identify at-risk compressors. "
            f"2. Check emissions compliance status. "
            f"3. For any compressor with failure_probability > 0.2, flag for investigation. "
            f"4. Run load balance simulation for stations with critical compressors. "
            f"5. Create a fleet snapshot. "
            f"6. Save any recommendations with quantified impact."
        )

        result = await optimization_agent.run(prompt)
        scan_result = result.data
        duration = time.time() - start_time

        if session_id:
            complete_session(
                session_id=session_id,
                result_type='fleet_scan',
                result_id=f"scan-{int(start_time)}",
                duration_seconds=duration,
            )

        return scan_result

    except Exception as e:
        logger.error(f"Fleet scan failed: {e}")
        if session_id:
            complete_session(session_id=session_id, status='failed',
                           duration_seconds=time.time() - start_time)
        raise


async def chat(
    message: str,
    organization_id: Optional[str] = None,
    conversation_history: Optional[list[dict]] = None,
) -> str:
    """Conversational interface for fleet optimization questions.

    Supports multi-turn conversation about fleet health, what-if scenarios,
    and optimization recommendations.
    """
    if not organization_id:
        rows = db_tools.query_db(
            "SELECT id FROM organizations WHERE slug = 'altaviz-demo' LIMIT 1", []
        )
        organization_id = str(rows[0]['id']) if rows else None

    # Build conversation context
    context = f"Organization ID: {organization_id}. "
    if conversation_history:
        context += "Previous conversation:\n"
        for msg in conversation_history[-5:]:  # last 5 messages for context
            context += f"{msg.get('role', 'user')}: {msg.get('content', '')}\n"

    # Use a text-output agent for chat (not structured FleetScanResult)
    chat_agent = Agent(
        _model,
        system_prompt=optimization_agent._system_prompts[0] + "\n\n"
        "You are in CONVERSATIONAL mode. Answer the user's question about fleet "
        "operations using the available tools. Be concise and actionable. "
        "Always cite specific data from tools (compressor IDs, numbers, dates).",
    )

    # Register same tools on chat agent
    @chat_agent.tool_plain
    def scan_fleet_chat(org_id: str) -> str:
        return fleet_scanner.scan_fleet_health(org_id)

    @chat_agent.tool_plain
    def simulate_defer_chat(compressor_id: str, defer_days: int) -> str:
        return simulator.run_maintenance_deferral(compressor_id, defer_days)

    @chat_agent.tool_plain
    def simulate_load_chat(station_id: str, org_id: str) -> str:
        return simulator.run_load_balance_simulation(station_id, org_id)

    @chat_agent.tool_plain
    def get_emissions_chat(org_id: str) -> str:
        return simulator.get_emissions_fleet_summary(org_id)

    @chat_agent.tool_plain
    def get_predictions_chat(compressor_id: str) -> str:
        return db_tools.get_ml_predictions(compressor_id)

    @chat_agent.tool_plain
    def get_readings_chat(compressor_id: str) -> str:
        return db_tools.get_latest_readings(compressor_id)

    @chat_agent.tool_plain
    def get_basin_chat(org_id: str, basin: Optional[str] = None) -> str:
        return fleet_scanner.get_basin_summary(org_id, basin)

    result = await chat_agent.run(f"{context}\nUser question: {message}")
    return result.data


def list_recommendations(
    organization_id: str,
    status: Optional[str] = None,
    rec_type: Optional[str] = None,
    limit: int = 20,
) -> list[dict]:
    """List optimization recommendations."""
    conditions = ["organization_id = %s"]
    params: list = [organization_id]

    if status:
        conditions.append("status = %s")
        params.append(status)
    if rec_type:
        conditions.append("rec_type = %s")
        params.append(rec_type)

    params.append(limit)
    where = " AND ".join(conditions)

    rows = db_tools.query_db(
        f"""SELECT recommendation_id, rec_type, scope, target_ids,
                   title, description, priority, status,
                   estimated_savings_usd, estimated_emissions_reduction_tonnes,
                   estimated_uptime_improvement_pct, ai_confidence,
                   work_order_id, created_at, expires_at
            FROM optimization_recommendations
            WHERE {where}
            ORDER BY
                CASE priority
                    WHEN 'critical' THEN 1
                    WHEN 'high' THEN 2
                    WHEN 'medium' THEN 3
                    WHEN 'low' THEN 4
                    WHEN 'informational' THEN 5
                END,
                created_at DESC
            LIMIT %s""",
        params
    )
    return db_tools._serialize_rows(rows)
