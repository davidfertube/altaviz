"""
Safety guardrails for the Altaviz agentic system.

Enforces subscription tier limits, cost caps, confidence thresholds,
and rate limits across all 3 agents. These guardrails are applied
in Python (not by the LLM) to prevent agent misuse.
"""

import logging
from datetime import datetime, timedelta

from .db_tools import query_db

logger = logging.getLogger(__name__)


# ============================================================================
# CONFIGURATION
# ============================================================================

# Cost and safety thresholds
MAX_COST_AUTO_APPROVE = 10_000  # USD — above this needs human approval
MAX_SHUTDOWN_HOURS_AUTO = 4     # hours — above this needs human approval
MIN_CONFIDENCE_TO_ACT = 0.6    # minimum confidence to create work orders
MAX_WORK_ORDERS_PER_HOUR = 10  # prevent runaway work order creation

# Subscription tier limits
TIER_LIMITS = {
    'free': {
        'agents_enabled': False,
        'max_sessions_per_day': 0,
        'autonomous_scans': False,
        'max_compressors': 2,
    },
    'pro': {
        'agents_enabled': True,
        'max_sessions_per_day': 10,
        'autonomous_scans': False,
        'max_compressors': 20,
    },
    'enterprise': {
        'agents_enabled': True,
        'max_sessions_per_day': 1000,
        'autonomous_scans': True,
        'max_compressors': 999999,
    },
}


# ============================================================================
# GUARDRAIL CHECKS
# ============================================================================

class GuardrailError(Exception):
    """Raised when a guardrail check fails."""
    pass


def check_tier_access(organization_id: str, feature: str) -> None:
    """Check if the organization's subscription tier allows a feature.

    Raises GuardrailError if the feature is not available.
    """
    rows = query_db(
        "SELECT subscription_tier FROM organizations WHERE id = %s",
        [organization_id]
    )
    if not rows:
        raise GuardrailError(f"Organization {organization_id} not found")

    tier = rows[0]['subscription_tier']
    limits = TIER_LIMITS.get(tier, TIER_LIMITS['free'])

    if feature == 'agents' and not limits['agents_enabled']:
        raise GuardrailError(
            f"AI agents are not available on the {tier} plan. Upgrade to Pro or Enterprise."
        )

    if feature == 'autonomous_scans' and not limits['autonomous_scans']:
        raise GuardrailError(
            f"Autonomous fleet scans require the Enterprise plan. Current: {tier}."
        )


def check_session_rate_limit(organization_id: str) -> None:
    """Check if the organization has exceeded their daily session limit.

    Raises GuardrailError if limit exceeded.
    """
    rows = query_db(
        "SELECT subscription_tier FROM organizations WHERE id = %s",
        [organization_id]
    )
    if not rows:
        raise GuardrailError(f"Organization {organization_id} not found")

    tier = rows[0]['subscription_tier']
    max_sessions = TIER_LIMITS.get(tier, TIER_LIMITS['free'])['max_sessions_per_day']

    count_rows = query_db(
        """SELECT COUNT(*) as cnt FROM agent_sessions
           WHERE organization_id = %s
             AND created_at >= NOW() - INTERVAL '24 hours'""",
        [organization_id]
    )
    count = count_rows[0]['cnt'] if count_rows else 0

    if count >= max_sessions:
        raise GuardrailError(
            f"Daily agent session limit reached ({max_sessions} sessions/day on {tier} plan)."
        )


def check_work_order_rate_limit(organization_id: str) -> None:
    """Prevent runaway work order creation.

    Raises GuardrailError if too many work orders created recently.
    """
    count_rows = query_db(
        """SELECT COUNT(*) as cnt FROM work_orders
           WHERE organization_id = %s
             AND created_at >= NOW() - INTERVAL '1 hour'""",
        [organization_id]
    )
    count = count_rows[0]['cnt'] if count_rows else 0

    if count >= MAX_WORK_ORDERS_PER_HOUR:
        raise GuardrailError(
            f"Work order rate limit exceeded ({MAX_WORK_ORDERS_PER_HOUR}/hour). "
            f"This may indicate a runaway agent."
        )


def requires_human_approval(priority: str, estimated_cost: float | None,
                             requires_shutdown: bool, shutdown_hours: float | None) -> bool:
    """Determine if a work order needs human approval before proceeding.

    Returns True if human approval is needed.
    """
    if priority in ('emergency', 'urgent'):
        return True
    if estimated_cost is not None and estimated_cost > MAX_COST_AUTO_APPROVE:
        return True
    if requires_shutdown and shutdown_hours is not None and shutdown_hours > MAX_SHUTDOWN_HOURS_AUTO:
        return True
    return False


def check_confidence_threshold(confidence: float, action: str = "create work order") -> None:
    """Check if agent confidence meets minimum threshold for action.

    Raises GuardrailError if confidence is too low.
    """
    if confidence < MIN_CONFIDENCE_TO_ACT:
        raise GuardrailError(
            f"Agent confidence ({confidence:.0%}) is below the minimum threshold "
            f"({MIN_CONFIDENCE_TO_ACT:.0%}) to {action}. Manual review required."
        )
