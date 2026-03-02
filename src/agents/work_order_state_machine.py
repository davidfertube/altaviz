"""
Work Order State Machine

Enforces valid state transitions for work orders in Python (not by the LLM).
This is a guardrail — the agent proposes transitions, but this module validates them.

State diagram:
  draft → pending_approval → approved → assigned → in_progress → completed → verified
                           └→ rejected
  Any state → cancelled (admin only)
"""

import json
import logging
from typing import Optional

from .shared.db_tools import query_db, execute_db

logger = logging.getLogger(__name__)


# Valid transitions: {from_status: [allowed_to_statuses]}
VALID_TRANSITIONS = {
    'draft': ['pending_approval', 'cancelled'],
    'pending_approval': ['approved', 'rejected', 'cancelled'],
    'approved': ['assigned', 'cancelled'],
    'assigned': ['in_progress', 'cancelled'],
    'in_progress': ['completed', 'cancelled'],
    'completed': ['verified', 'cancelled'],
    'verified': [],  # terminal state
    'rejected': ['draft'],  # can re-draft a rejected WO
    'cancelled': [],  # terminal state
}

# Statuses that are terminal (no further transitions)
TERMINAL_STATUSES = {'verified', 'cancelled'}

# Statuses that represent "open" work orders
OPEN_STATUSES = {'draft', 'pending_approval', 'approved', 'assigned', 'in_progress'}


class InvalidTransitionError(Exception):
    """Raised when an invalid state transition is attempted."""
    pass


def validate_transition(from_status: str, to_status: str) -> None:
    """Validate that a state transition is allowed.

    Raises InvalidTransitionError if the transition is not valid.
    """
    if from_status not in VALID_TRANSITIONS:
        raise InvalidTransitionError(f"Unknown status: {from_status}")

    allowed = VALID_TRANSITIONS[from_status]
    if to_status not in allowed:
        raise InvalidTransitionError(
            f"Cannot transition from '{from_status}' to '{to_status}'. "
            f"Allowed transitions: {allowed}"
        )


def transition_work_order(
    work_order_id: str,
    to_status: str,
    reason: str,
    transitioned_by: Optional[str] = None,
    agent_name: Optional[str] = None,
    metadata: Optional[dict] = None,
    # Completion fields
    actual_hours: Optional[float] = None,
    actual_cost: Optional[float] = None,
    completion_notes: Optional[str] = None,
    parts_replaced: Optional[list[dict]] = None,
    # Assignment fields
    assigned_to: Optional[str] = None,
    # Approval fields
    approved_by: Optional[str] = None,
) -> dict:
    """Transition a work order to a new status with validation.

    Returns the updated work order dict, or raises InvalidTransitionError.
    """
    # Get current status
    rows = query_db(
        "SELECT status, work_order_id FROM work_orders WHERE work_order_id = %s",
        [work_order_id]
    )
    if not rows:
        raise InvalidTransitionError(f"Work order {work_order_id} not found")

    current_status = rows[0]['status']
    validate_transition(current_status, to_status)

    # Build the UPDATE query dynamically based on the transition
    updates = ["status = %s"]
    params = [to_status]

    if to_status == 'completed':
        updates.append("completed_at = NOW()")
        if actual_hours is not None:
            updates.append("actual_hours = %s")
            params.append(actual_hours)
        if actual_cost is not None:
            updates.append("actual_cost = %s")
            params.append(actual_cost)
        if completion_notes:
            updates.append("completion_notes = %s")
            params.append(completion_notes)
        if parts_replaced:
            updates.append("parts_replaced = %s")
            params.append(json.dumps(parts_replaced))

    if to_status == 'approved' and approved_by:
        updates.append("approved_by = %s")
        params.append(approved_by)
        updates.append("approved_at = NOW()")

    if to_status == 'assigned' and assigned_to:
        updates.append("assigned_to = %s")
        params.append(assigned_to)

    params.append(work_order_id)
    set_clause = ", ".join(updates)

    execute_db(
        f"UPDATE work_orders SET {set_clause} WHERE work_order_id = %s",
        params
    )

    # Record the transition in the audit trail
    execute_db(
        """INSERT INTO work_order_transitions
           (work_order_id, from_status, to_status, transitioned_by, agent_name, reason, metadata)
           VALUES (%s, %s, %s, %s, %s, %s, %s)""",
        [work_order_id, current_status, to_status, transitioned_by,
         agent_name, reason, json.dumps(metadata) if metadata else None]
    )

    logger.info(f"Work order {work_order_id}: {current_status} → {to_status} (by {transitioned_by or agent_name})")

    return {
        "work_order_id": work_order_id,
        "from_status": current_status,
        "to_status": to_status,
        "reason": reason,
    }


def get_work_order_timeline(work_order_id: str) -> list[dict]:
    """Get the full transition timeline for a work order."""
    from .shared.db_tools import _serialize_rows
    rows = query_db(
        """SELECT from_status, to_status, transitioned_by, agent_name,
                  reason, metadata, created_at
           FROM work_order_transitions
           WHERE work_order_id = %s
           ORDER BY created_at ASC""",
        [work_order_id]
    )
    return _serialize_rows(rows)
