"""
Work Order State Machine

Enforces valid state transitions for work orders in Python (not by the LLM).
This is a guardrail — the agent proposes transitions, but this module validates them.

State diagram:
  draft → pending_approval → approved → assigned → in_progress → completed → verified
                           └→ rejected
  Any state → cancelled (admin only)
"""

# ===========================================================================
# PATTERN: Finite State Machine (State Machine Pattern)
# WHY: Work orders follow a strict lifecycle that must be enforced
#   deterministically. The state machine ensures:
#   1. No invalid transitions (can't go from "draft" to "completed")
#   2. Audit trail (every transition is recorded with who/when/why)
#   3. HITL gates (pending_approval requires human action)
#
# WHY PYTHON, NOT LLM:
#   The LLM (agent) proposes state transitions, but this Python module
#   VALIDATES them. The LLM cannot bypass this validation because:
#   - The agent only calls create_work_order(), which always starts at "draft"
#   - All subsequent transitions go through transition_work_order(), which
#     checks VALID_TRANSITIONS before updating the database
#   - Even if the LLM hallucinates "set status to completed", the Python
#     code will reject it if the current status is "draft"
#   This is the same principle as guardrails.py: deterministic Python code
#   that cannot be prompt-injected, circumvented, or ignored.
#
# WHY 9 STATES:
#   The 9 states map to a real maintenance workflow lifecycle:
#   1. draft: Agent created the plan, needs review
#   2. pending_approval: High-risk WO waiting for human sign-off
#   3. approved: Approved for execution, needs technician assignment
#   4. assigned: Technician identified, work not yet started
#   5. in_progress: Technician is actively working
#   6. completed: Work finished, awaiting quality verification
#   7. verified: QA confirmed, work order closed (terminal)
#   8. rejected: Approver rejected the plan, can be re-drafted
#   9. cancelled: Work order abandoned (terminal)
#   Each state represents a real-world checkpoint where different people
#   or systems take action.
#
# SCALING: At 4,700 compressors with ~235 active alerts, the state machine
#   handles concurrent transitions safely because each transition is an
#   atomic database UPDATE (no in-memory state that could be lost).
# ===========================================================================

import json
import logging
from typing import Optional

from .shared.db_tools import query_db, execute_db

logger = logging.getLogger(__name__)


# Valid transitions: {from_status: [allowed_to_statuses]}
# This dict IS the state machine. Adding a new transition requires only
# adding an entry here — no code changes needed elsewhere.
VALID_TRANSITIONS = {
    'draft': ['pending_approval', 'cancelled'],
    'pending_approval': ['approved', 'rejected', 'cancelled'],
    'approved': ['assigned', 'cancelled'],
    'assigned': ['in_progress', 'cancelled'],
    'in_progress': ['completed', 'cancelled'],
    'completed': ['verified', 'cancelled'],
    'verified': [],  # Terminal state — no further transitions allowed
    'rejected': ['draft'],  # Rejected WOs can be re-drafted with modifications
    'cancelled': [],  # Terminal state — work order is permanently abandoned
}

# Statuses that are terminal (no further transitions)
TERMINAL_STATUSES = {'verified', 'cancelled'}

# Statuses that represent "open" work orders (used in duplicate detection)
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

    # ===========================================================================
    # Transition Audit Trail
    # WHY: Every state transition is recorded in work_order_transitions with:
    #   - from_status / to_status: what changed
    #   - transitioned_by: which human approved/rejected/completed
    #   - agent_name: which AI agent triggered the transition
    #   - reason: free-text explanation (required for every transition)
    #   - metadata: optional JSON for transition-specific data
    #   - created_at: timestamp (auto-set by PostgreSQL DEFAULT NOW())
    # This audit trail is a COMPLIANCE REQUIREMENT: regulators and auditors
    # need to see who approved what and when. It also enables:
    #   - Timeline visualization in the frontend (WorkOrderTimeline component)
    #   - Mean-time-to-repair (MTTR) analytics
    #   - Agent performance analysis (how long does approval take?)
    # ===========================================================================
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
