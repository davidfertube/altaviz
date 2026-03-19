"""
Work Order Orchestration Agent (Use Case 1)

Creates, prioritizes, and manages work orders based on investigation reports,
alert data, and ML predictions. Implements HITL approval workflow for
high-risk work orders.

Agentic patterns demonstrated:
- Multi-agent orchestration (consumes investigation reports)
- Tool use (10 tools)
- Human-in-the-loop (approval gates for high-risk orders)
- State machines (9-state work order lifecycle)
- Long-running workflows (creation → approval → completion)
- Guardrails (cost caps, confidence thresholds)
"""

# ===========================================================================
# PATTERN: Multi-Agent Orchestration (Consumer Agent)
# WHY: The work order agent CONSUMES outputs from the investigation agent
#   rather than re-doing the investigation. This is the "agent chain" pattern:
#   Investigation Agent → InvestigationReport → Work Order Agent → WorkOrderPlan
#   Each agent is specialized: investigation finds the root cause, work order
#   plans the fix. Separation of concerns prevents a single massive agent
#   with 22+ tools that would be slow, expensive, and error-prone.
# SCALING: At fleet scale, investigations and work orders can run independently.
#   One investigation can trigger multiple work orders (e.g., bearing replacement
#   + inspection of adjacent compressors).
# ALTERNATIVE: Single "super agent" with all tools — worse tool selection
#   accuracy (LLMs get confused with 20+ tools), higher token cost, and
#   impossible to test investigation and planning logic independently.
# ===========================================================================

import os
import json
import time
import logging
from typing import Optional

from pydantic_ai import Agent

from .shared.models import WorkOrderPlan
from .shared import db_tools
from .shared.id_generator import generate_work_order_id
# Guardrails are imported and applied in Python code, NOT in the LLM prompt.
# See guardrails.py for detailed rationale on why Python-level enforcement.
from .shared.guardrails import (
    check_confidence_threshold, check_work_order_rate_limit,
    requires_human_approval,
)
from .shared.memory import create_session, complete_session
from .work_order_state_machine import transition_work_order

logger = logging.getLogger(__name__)


# ============================================================================
# AGENT DEFINITION
# ============================================================================

_model = os.environ.get('DIAGNOSTICS_MODEL', 'openai:gpt-4o-mini')

work_order_agent = Agent(
    _model,
    result_type=WorkOrderPlan,
    system_prompt="""You are a maintenance planning engineer creating work orders for
reciprocating natural gas compressors. Your job is to analyze available data and
create a well-structured work order plan.

PRIORITY RULES:
- emergency: Immediate safety or environmental risk. Requires shutdown NOW.
- urgent: Must be addressed within 24 hours. High risk of escalation.
- high: Schedule within 3 days. Significant but not immediate risk.
- medium: Next maintenance window. Degradation detected but stable.
- low: Opportunistic. Address when convenient.

CATEGORY SELECTION:
- mechanical_repair: Bearing, valve, packing, ring replacements
- inspection: Visual/sensor inspection to confirm suspected issue
- preventive: Scheduled PM based on time/hours since last service
- calibration: Sensor recalibration when readings seem off
- emissions_compliance: EPA OOOOb related (packing leaks, fugitive emissions)
- optimization: Performance improvement (not failure-related)
- emergency_shutdown: Immediate shutdown required for safety

BEFORE CREATING A WORK ORDER:
1. Always check for existing open work orders for this compressor to avoid duplicates
2. Fetch the investigation report if one exists (provides root cause context)
3. Review ML predictions for failure probability and RUL
4. Check compressor metadata for model-specific maintenance needs
5. Check technician availability if scheduling

COST ESTIMATION GUIDELINES:
- Bearing replacement: $8,000-15,000
- Valve replacement: $5,000-12,000
- Packing/seal: $6,000-15,000
- Ring replacement: $10,000-25,000
- Cooling system service: $3,000-8,000
- Intercooler cleaning: $2,000-5,000
- Standard inspection: $500-2,000

SAFETY CONSIDERATIONS:
- Always note if work requires gas isolation
- Note if confined space entry is needed
- Flag any LOTO (lockout/tagout) requirements
- Consider weather/environmental conditions

Always use the tools provided to gather real data before making your plan.""",
)


# ============================================================================
# TOOL REGISTRATIONS
# ============================================================================

@work_order_agent.tool_plain
def get_latest_readings(compressor_id: str) -> str:
    """Fetch the latest sensor readings for a compressor."""
    return db_tools.get_latest_readings(compressor_id)


@work_order_agent.tool_plain
def get_alert_history(compressor_id: str, hours: int = 48) -> str:
    """Fetch recent alerts from the last N hours."""
    return db_tools.get_alert_history(compressor_id, hours)


@work_order_agent.tool_plain
def get_ml_predictions(compressor_id: str) -> str:
    """Fetch the latest ML predictions (RUL, anomaly, failure probability)."""
    return db_tools.get_ml_predictions(compressor_id)


@work_order_agent.tool_plain
def get_compressor_metadata(compressor_id: str) -> str:
    """Fetch compressor metadata including model, station, and installation date."""
    return db_tools.get_compressor_metadata(compressor_id)


# ===========================================================================
# Multi-Agent Data Flow: Investigation → Work Order
# WHY: This tool fetches the investigation report that likely triggered this
#   work order. The agent uses the root cause, failure mode, and recommended
#   actions from the investigation to create a well-informed work order plan.
#   Without this, the work order agent would need to re-diagnose the issue
#   from scratch (duplicating work and potentially reaching a different conclusion).
# ===========================================================================
@work_order_agent.tool_plain
def get_investigation_report(compressor_id: str) -> str:
    """Fetch the latest investigation report for context on root cause."""
    try:
        rows = db_tools.query_db(
            """SELECT investigation_id, root_cause, failure_mode, severity,
                      confidence, evidence_chain, recommended_actions,
                      estimated_rul_hours, estimated_repair_cost, created_at
               FROM investigation_reports
               WHERE compressor_id = %s
               ORDER BY created_at DESC
               LIMIT 1""",
            [compressor_id]
        )
        if not rows:
            return json.dumps({"info": f"No investigation reports found for {compressor_id}"})
        return json.dumps(db_tools._serialize_rows(rows), default=str)
    except Exception as e:
        return json.dumps({"error": str(e)})


@work_order_agent.tool_plain
def get_open_work_orders(compressor_id: str) -> str:
    """Check for existing open work orders to avoid duplicates."""
    try:
        rows = db_tools.query_db(
            """SELECT work_order_id, title, priority, status, category,
                      created_at, scheduled_date
               FROM work_orders
               WHERE compressor_id = %s
                 AND status NOT IN ('completed', 'verified', 'cancelled', 'rejected')
               ORDER BY created_at DESC""",
            [compressor_id]
        )
        return json.dumps(db_tools._serialize_rows(rows), default=str)
    except Exception as e:
        return json.dumps({"error": str(e)})


# ===========================================================================
# Mock Tools (Acknowledged Limitations)
# WHY: check_technician_availability and check_parts_inventory return mock data.
#   In production, these would integrate with:
#   - Technician scheduling: SAP PM, Maximo, or a custom scheduling system
#   - Parts inventory: ERP system (SAP MM, Oracle, NetSuite)
#   The mock implementations demonstrate the INTERFACE the agent expects.
#   Swapping in real integrations requires only changing the function body,
#   not the agent's system prompt or tool registration.
# ===========================================================================
@work_order_agent.tool_plain
def check_technician_availability(station_id: str, date_range: str = "this_week") -> str:
    """Check technician availability at a station for scheduling.
    date_range: 'today', 'tomorrow', 'this_week', 'next_week'"""
    # Mock implementation for demo — in production this would query a scheduling system
    schedules = {
        "today": {"available_slots": 1, "technicians_on_site": 2, "next_available": "14:00"},
        "tomorrow": {"available_slots": 3, "technicians_on_site": 3, "next_available": "08:00"},
        "this_week": {"available_slots": 8, "technicians_on_site": 3, "next_available": "tomorrow 08:00"},
        "next_week": {"available_slots": 12, "technicians_on_site": 4, "next_available": "Monday 08:00"},
    }
    return json.dumps({
        "station_id": station_id,
        "date_range": date_range,
        **schedules.get(date_range, schedules["this_week"]),
    })


@work_order_agent.tool_plain
def check_parts_inventory(part_names: str) -> str:
    """Check parts availability. part_names is a comma-separated list.
    e.g., 'bearing assembly,valve plate,piston rings'"""
    # Mock implementation for demo
    parts_list = [p.strip() for p in part_names.split(',')]
    inventory = []
    for part in parts_list:
        # Simulate varying availability
        in_stock = hash(part) % 3 != 0  # ~67% in stock
        inventory.append({
            "part_name": part,
            "in_stock": in_stock,
            "quantity_available": 3 if in_stock else 0,
            "lead_time_days": 0 if in_stock else 5,
            "estimated_unit_cost": abs(hash(part) % 5000) + 500,
        })
    return json.dumps(inventory)


# ============================================================================
# PUBLIC API
# ============================================================================

async def create_work_order(
    compressor_id: str,
    organization_id: Optional[str] = None,
    source_type: str = 'manual',
    source_id: Optional[str] = None,
    user_id: Optional[str] = None,
    context: Optional[str] = None,
) -> dict:
    """
    Create a work order for a compressor using the AI agent.

    The agent will:
    1. Check for existing open work orders (avoid duplicates)
    2. Fetch investigation report (if available) for root cause context
    3. Review current sensor data and ML predictions
    4. Create a prioritized work order plan
    5. Apply guardrails (confidence, cost, HITL approval)

    Returns:
        Dict with work_order_id, status, and the full plan.
    """
    start_time = time.time()

    # Resolve org ID
    if not organization_id:
        rows = db_tools.query_db(
            "SELECT id FROM organizations WHERE slug = 'altaviz-demo' LIMIT 1", []
        )
        organization_id = str(rows[0]['id']) if rows else None

    # ===========================================================================
    # Guardrail Enforcement Order: Rate Limit → Confidence → HITL Approval
    # WHY: Guardrails are checked in a specific order:
    #   1. Rate limit (FIRST) — prevents runaway agents before spending LLM tokens
    #   2. Confidence threshold (AFTER agent runs) — rejects low-confidence plans
    #   3. HITL approval check (AFTER agent runs) — routes high-risk plans to humans
    #   The rate limit is checked BEFORE the agent runs because it's cheap (one DB
    #   query) and prevents wasting expensive LLM calls. Confidence and HITL checks
    #   happen AFTER because they need the agent's output to evaluate.
    # ===========================================================================
    if organization_id:
        check_work_order_rate_limit(organization_id)  # Step 1: Prevent runaway creation

    # Create session
    session_id = None
    if organization_id:
        session_id = create_session(
            organization_id=organization_id,
            agent_type='work_order',
            user_id=user_id,
            compressor_id=compressor_id,
            trigger_type=source_type,
            trigger_id=source_id,
        )

    # Generate work order ID
    wo_id = generate_work_order_id()

    try:
        prompt = (
            f"Create a work order plan for compressor {compressor_id}. "
            f"Work order ID: {wo_id}. "
            f"Source: {source_type}" + (f" (ID: {source_id})" if source_id else "") + ". "
        )
        if context:
            prompt += f"Additional context: {context}. "
        prompt += (
            "Check for existing open work orders first. "
            "Fetch the investigation report if available. "
            "Review sensor data and ML predictions. "
            "Create a complete work order plan with priority, category, "
            "estimated cost, parts needed, and safety considerations."
        )

        result = await work_order_agent.run(prompt)
        plan = result.data
        duration = time.time() - start_time

        # Step 2: Reject if agent confidence is below 60% (see guardrails.py)
        check_confidence_threshold(plan.confidence, "create work order")

        # ===========================================================================
        # PATTERN: Human-in-the-Loop (HITL) Approval Gates
        # WHY: Not all work orders should be auto-approved. The thresholds are:
        #   - Emergency/urgent priority: always needs human approval (safety risk)
        #   - Cost > $10,000: significant OpEx that needs budget authority sign-off
        #   - Shutdown > 4 hours: half a work shift, impacts station throughput
        # These thresholds were derived from industry standards:
        #   $10K = typical approval authority limit for field supervisors
        #   4 hours = half-shift, triggers crew scheduling changes
        #   emergency = any safety risk requires human judgment
        # The agent creates the plan, but Python code enforces whether a human
        # must approve it. The LLM cannot bypass this check.
        # ===========================================================================
        # Step 3: Determine if human approval is required
        needs_approval = requires_human_approval(
            priority=plan.priority,
            estimated_cost=plan.estimated_cost,
            requires_shutdown=plan.requires_shutdown,
            shutdown_hours=plan.estimated_hours if plan.requires_shutdown else None,
        )
        initial_status = 'pending_approval' if needs_approval else 'approved'

        # Persist the work order to the database
        _save_work_order(plan, organization_id, source_type, source_id, initial_status)

        # Record the initial state transition in the audit trail.
        # The state machine (work_order_state_machine.py) validates and records
        # every transition. The agent creates the plan; Python enforces the workflow.
        transition_work_order(
            work_order_id=plan.work_order_id,
            to_status=initial_status,
            reason=f"Auto-created by work order agent. {'Requires human approval.' if needs_approval else 'Auto-approved (low risk).'}",
            agent_name='work_order_agent',
        )

        # Complete session
        if session_id:
            complete_session(
                session_id=session_id,
                result_type='work_order',
                result_id=plan.work_order_id,
                duration_seconds=duration,
            )

        return {
            "work_order_id": plan.work_order_id,
            "status": initial_status,
            "needs_approval": needs_approval,
            "plan": plan.model_dump(),
        }

    except Exception as e:
        logger.error(f"Work order creation failed for {compressor_id}: {e}")
        if session_id:
            complete_session(session_id=session_id, status='failed',
                           duration_seconds=time.time() - start_time)
        raise


def _save_work_order(plan: WorkOrderPlan, organization_id: str,
                     source_type: str, source_id: Optional[str],
                     initial_status: str) -> None:
    """Persist a work order to the database."""
    db_tools.execute_db(
        """INSERT INTO work_orders
           (work_order_id, compressor_id, organization_id,
            source_type, source_id,
            title, description, priority, category,
            status, estimated_hours, estimated_cost,
            ai_confidence, ai_reasoning,
            parts_replaced)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
        [
            plan.work_order_id,
            plan.compressor_id,
            organization_id,
            source_type,
            source_id,
            plan.title,
            plan.description,
            plan.priority,
            plan.category,
            initial_status,
            plan.estimated_hours,
            plan.estimated_cost,
            plan.confidence,
            plan.reasoning,
            json.dumps([p.model_dump() for p in plan.parts_needed]) if plan.parts_needed else None,
        ]
    )


def get_work_order(work_order_id: str) -> Optional[dict]:
    """Fetch a work order by ID with its transition timeline."""
    rows = db_tools.query_db(
        """SELECT wo.*, cm.model, cm.station_id, sl.station_name
           FROM work_orders wo
           JOIN compressor_metadata cm ON wo.compressor_id = cm.compressor_id
           LEFT JOIN station_locations sl ON cm.station_id = sl.station_id
           WHERE wo.work_order_id = %s""",
        [work_order_id]
    )
    if not rows:
        return None

    from .work_order_state_machine import get_work_order_timeline
    wo = db_tools._serialize_rows(rows)[0]
    wo['timeline'] = get_work_order_timeline(work_order_id)
    return wo


def list_work_orders(
    organization_id: str,
    status: Optional[str] = None,
    compressor_id: Optional[str] = None,
    limit: int = 50,
) -> list[dict]:
    """List work orders with optional filters."""
    conditions = ["wo.organization_id = %s"]
    params: list = [organization_id]

    if status:
        conditions.append("wo.status = %s")
        params.append(status)
    if compressor_id:
        conditions.append("wo.compressor_id = %s")
        params.append(compressor_id)

    params.append(limit)
    where = " AND ".join(conditions)

    # Priority-based ordering: emergency work orders appear first, then urgent, etc.
    # Within the same priority, newer work orders appear first (most recent context).
    # The CASE expression converts priority strings to sortable integers.
    rows = db_tools.query_db(
        f"""SELECT wo.work_order_id, wo.compressor_id, wo.title, wo.priority,
                   wo.category, wo.status, wo.estimated_hours, wo.estimated_cost,
                   wo.assigned_to, wo.scheduled_date, wo.created_at,
                   cm.model, cm.station_id, sl.station_name
            FROM work_orders wo
            JOIN compressor_metadata cm ON wo.compressor_id = cm.compressor_id
            LEFT JOIN station_locations sl ON cm.station_id = sl.station_id
            WHERE {where}
            ORDER BY
                CASE wo.priority
                    WHEN 'emergency' THEN 1
                    WHEN 'urgent' THEN 2
                    WHEN 'high' THEN 3
                    WHEN 'medium' THEN 4
                    WHEN 'low' THEN 5
                END,
                wo.created_at DESC
            LIMIT %s""",
        params
    )
    return db_tools._serialize_rows(rows)
