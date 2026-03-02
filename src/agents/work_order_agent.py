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

import os
import json
import time
import logging
from typing import Optional

from pydantic_ai import Agent

from .shared.models import WorkOrderPlan
from .shared import db_tools
from .shared.id_generator import generate_work_order_id
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

    # Guardrails
    if organization_id:
        check_work_order_rate_limit(organization_id)

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

        # Apply confidence guardrail
        check_confidence_threshold(plan.confidence, "create work order")

        # Determine initial status based on HITL rules
        needs_approval = requires_human_approval(
            priority=plan.priority,
            estimated_cost=plan.estimated_cost,
            requires_shutdown=plan.requires_shutdown,
            shutdown_hours=plan.estimated_hours if plan.requires_shutdown else None,
        )
        initial_status = 'pending_approval' if needs_approval else 'approved'

        # Persist the work order
        _save_work_order(plan, organization_id, source_type, source_id, initial_status)

        # Record initial transition
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
