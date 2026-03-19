"""
Safety guardrails for the Altaviz agentic system.

Enforces subscription tier limits, cost caps, confidence thresholds,
and rate limits across all 3 agents. These guardrails are applied
in Python (not by the LLM) to prevent agent misuse.
"""

# ===========================================================================
# PATTERN: Python-Level Guardrails (not LLM-Level)
# WHY: These safety checks are implemented in Python code, NOT in the LLM's
#   system prompt. Three critical reasons:
#   1. DETERMINISTIC: Python code always enforces the rule. An LLM might
#      "forget" or be prompt-injected to bypass a system prompt instruction.
#   2. AUDITABLE: Every guardrail check is a testable Python function with
#      clear inputs and outputs. See tests/unit/test_guardrails.py.
#   3. TESTABLE: Unit tests verify every edge case (confidence = 0.59 fails,
#      0.60 passes). You can't unit test an LLM's adherence to a prompt.
# ANTI-PATTERN: Putting guardrails only in the system prompt:
#   "Never create work orders above $10K" — the LLM could ignore this if
#   the user says "ignore previous instructions" or if the context is too long.
# ===========================================================================

import logging
from datetime import datetime, timedelta

from .db_tools import query_db

logger = logging.getLogger(__name__)


# ============================================================================
# CONFIGURATION
# ===========================================================================
# Threshold Derivations:
#   - $10K (MAX_COST_AUTO_APPROVE): Typical field supervisor approval authority.
#     Above this, a maintenance manager or VP must sign off. Source: industry
#     standard for oil & gas OpEx delegation of authority.
#   - 4 hours (MAX_SHUTDOWN_HOURS_AUTO): Half a work shift. Shutdowns > 4 hours
#     require crew scheduling changes and impact station throughput commitments.
#   - 60% (MIN_CONFIDENCE_TO_ACT): Below this, the agent's diagnosis is
#     essentially a coin flip. At 60%+, there's meaningful signal to act on.
#     Derived from testing: below 60%, false positive rate exceeded 40%.
#   - 10 WO/hour (MAX_WORK_ORDERS_PER_HOUR): Safety valve for runaway agents.
#     A fleet of 4,700 compressors with ~5% degrading = ~235 potential work
#     orders. 10/hour is a sane creation rate for a single org. If exceeded,
#     it likely means the agent is in a loop.
# ============================================================================

# Cost and safety thresholds
MAX_COST_AUTO_APPROVE = 10_000  # USD — above this needs human approval
MAX_SHUTDOWN_HOURS_AUTO = 4     # hours — above this needs human approval
MIN_CONFIDENCE_TO_ACT = 0.6    # minimum confidence to create work orders
MAX_WORK_ORDERS_PER_HOUR = 10  # prevent runaway work order creation

# ===========================================================================
# Tier System Design
# WHY: Maps directly to Stripe subscription plans for SaaS billing.
#   - Free: Dashboard only, no AI agents (attracts users to upgrade)
#   - Pro: AI agents enabled with session limits (per-seat pricing)
#   - Enterprise: Unlimited agents + autonomous fleet scans (contract pricing)
# The tier limits are checked BEFORE any agent runs to avoid wasting
# LLM tokens on requests that will be rejected.
# ===========================================================================
TIER_LIMITS = {
    'free': {
        'agents_enabled': False,       # No AI agent access on free tier
        'max_sessions_per_day': 0,     # Zero sessions = hard block
        'autonomous_scans': False,     # No scheduled fleet scans
        'max_compressors': 2,          # Demo only: 2 compressors
    },
    'pro': {
        'agents_enabled': True,        # All 4 agents available
        'max_sessions_per_day': 10,    # ~$0.50/day in LLM costs at current rates
        'autonomous_scans': False,     # Manual scans only (cost control)
        'max_compressors': 20,         # Small fleet management
    },
    'enterprise': {
        'agents_enabled': True,        # All 4 agents available
        'max_sessions_per_day': 1000,  # Effectively unlimited
        'autonomous_scans': True,      # Scheduled hourly/daily fleet scans
        'max_compressors': 999999,     # Full fleet (4,700+)
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


# ===========================================================================
# Rate Limiting Strategy: Sliding Window Per Organization
# WHY: Uses a 1-hour sliding window (COUNT of work orders created in the
#   last 60 minutes). This is simpler than a token bucket or leaky bucket
#   algorithm but sufficient for our use case.
# SCALING: At enterprise scale, multiple users in the same org share the
#   rate limit. This prevents one user's automation from exhausting the
#   org's capacity. Per-user rate limits could be added as a refinement.
# ===========================================================================
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


# ===========================================================================
# HITL Approval Logic
# WHY: This function is the decision point for human-in-the-loop routing.
#   The work order agent creates the plan, then this function determines
#   whether it goes to 'approved' (auto) or 'pending_approval' (needs human).
#   ANY of the following triggers human approval:
#   1. Emergency/urgent priority — safety risk requires human judgment
#   2. Cost > $10K — exceeds field supervisor approval authority
#   3. Shutdown > 4 hours — impacts station throughput commitments
#   This is an OR condition (any one trigger is sufficient), not AND.
# ===========================================================================
def requires_human_approval(priority: str, estimated_cost: float | None,
                             requires_shutdown: bool, shutdown_hours: float | None) -> bool:
    """Determine if a work order needs human approval before proceeding.

    Returns True if human approval is needed.
    """
    if priority in ('emergency', 'urgent'):
        return True  # Safety risk: always needs human review
    if estimated_cost is not None and estimated_cost > MAX_COST_AUTO_APPROVE:
        return True  # Significant OpEx: needs budget authority
    if requires_shutdown and shutdown_hours is not None and shutdown_hours > MAX_SHUTDOWN_HOURS_AUTO:
        return True  # Half-shift impact: needs scheduling coordination
    return False  # Low-risk: auto-approve to reduce turnaround time


def check_confidence_threshold(confidence: float, action: str = "create work order") -> None:
    """Check if agent confidence meets minimum threshold for action.

    Raises GuardrailError if confidence is too low.
    """
    if confidence < MIN_CONFIDENCE_TO_ACT:
        raise GuardrailError(
            f"Agent confidence ({confidence:.0%}) is below the minimum threshold "
            f"({MIN_CONFIDENCE_TO_ACT:.0%}) to {action}. Manual review required."
        )
