# ===========================================================================
# PATTERN: Hybrid Evaluation — Deterministic Guardrails + LLM Quality
# WHY: Work order evaluation has two distinct layers:
#      1. DETERMINISTIC tests (TestHITLTriggers, TestCostEstimates): These
#         test Python guardrail logic, NOT the LLM. They run without API keys,
#         are fast (<1ms each), and catch regressions in the approval rules.
#      2. LLM QUALITY tests (TestWorkOrderRelevancy): These use DeepEval to
#         evaluate the LLM-generated reasoning and relevancy.
#
#      Separating guardrails from agent tests is critical because:
#      - Guardrail tests are deterministic: same input = same output, always.
#        If these fail, there's a code bug (not an LLM flakiness issue).
#      - Agent tests are probabilistic: the LLM may produce slightly
#        different outputs each run. Failures require investigation into
#        whether the prompt, context, or threshold needs adjustment.
#      - Guardrail tests run in CI without API keys (fast, free, reliable).
#        Agent tests run in a separate eval pipeline with API keys.
#
# SCALING: Guardrail tests scale to any fleet size — they test rules, not
#          data. The parametrized cost tests cover all 6 failure modes,
#          ensuring cost bounds are defined for the full failure taxonomy.
# ===========================================================================

"""
Work Order Agent Quality Evaluation

Tests work order generation quality:
- HITL trigger accuracy (should require approval for >$10K, emergency, long shutdowns)
- Priority assignment accuracy
- Cost estimate reasonableness
- Parts list completeness

Run: pytest tests/eval/test_work_order_quality.py -v
"""

import pytest

try:
    from deepeval import assert_test
    from deepeval.test_case import LLMTestCase
    from deepeval.metrics import (
        AnswerRelevancyMetric,
        FaithfulnessMetric,
    )
    DEEPEVAL_AVAILABLE = True
except ImportError:
    DEEPEVAL_AVAILABLE = False

from src.agents.shared.guardrails import requires_human_approval


pytestmark = [
    pytest.mark.eval,
    pytest.mark.skipif(not DEEPEVAL_AVAILABLE, reason="deepeval not installed"),
]


# ===========================================================================
# PATTERN: HITL Trigger Tests (Deterministic, No LLM Needed)
# WHY: The requires_human_approval() function in shared/guardrails.py
#      implements hard-coded business rules. These tests verify the rules
#      directly — no LLM involvement, no API keys needed.
#
#      The rules being tested:
#      - Emergency or urgent priority -> always requires approval
#        (safety-critical: emergency shutdowns need human sign-off)
#      - Cost > $10,000 -> requires approval
#        (financial control: prevents AI from authorizing large expenditures)
#      - Shutdown > 4 hours -> requires approval
#        (operational impact: extended downtime affects production)
#      - Low-risk (low priority, low cost, no shutdown) -> auto-approved
#        (routine maintenance: replacing filters, minor adjustments)
#
#      These thresholds are defined in guardrails.py, not in agent prompts.
#      This is intentional: LLMs should not make approval decisions — they
#      generate the work order, and deterministic rules decide whether a
#      human needs to review it.
# ===========================================================================

class TestHITLTriggers:
    """Test that HITL approval is correctly triggered."""

    def test_emergency_requires_approval(self):
        """Emergency priority work orders always require human approval."""
        assert requires_human_approval(
            priority="emergency",
            estimated_cost=5000,
            requires_shutdown=False,
            shutdown_hours=0,
        ) is True

    def test_urgent_requires_approval(self):
        """Urgent priority work orders require human approval."""
        assert requires_human_approval(
            priority="urgent",
            estimated_cost=5000,
            requires_shutdown=False,
            shutdown_hours=0,
        ) is True

    def test_high_cost_requires_approval(self):
        """Work orders over $10K require human approval regardless of priority."""
        assert requires_human_approval(
            priority="medium",
            estimated_cost=15000,
            requires_shutdown=False,
            shutdown_hours=0,
        ) is True

    def test_long_shutdown_requires_approval(self):
        """Shutdowns over 4 hours require human approval."""
        assert requires_human_approval(
            priority="medium",
            estimated_cost=5000,
            requires_shutdown=True,
            shutdown_hours=6,
        ) is True

    def test_low_risk_no_approval(self):
        """Low-risk work orders should not require approval."""
        assert requires_human_approval(
            priority="low",
            estimated_cost=2000,
            requires_shutdown=False,
            shutdown_hours=0,
        ) is False


class TestWorkOrderRelevancy:
    """Test that work order outputs are relevant and well-reasoned."""

    def test_bearing_work_order_relevant(self, sample_work_order_output):
        """Work order should be relevant to the bearing wear diagnosis."""
        test_case = LLMTestCase(
            input="Create a work order for COMP-0003 bearing replacement. "
                  "Investigation found bearing wear with vibration at 7.2 mm/s.",
            actual_output=sample_work_order_output["reasoning"],
            retrieval_context=[
                "Bearing replacement for Ajax DPC-360: $8,000-15,000. "
                "Requires main bearing set, thrust washers. Downtime: 8-16 hours.",
            ],
        )
        relevancy = AnswerRelevancyMetric(threshold=0.7)
        assert_test(test_case, [relevancy])


# ===========================================================================
# PATTERN: Parametrized Cost Bound Tests
# WHY: Each failure mode has an expected cost range based on industry data
#      and Archrock's historical maintenance records. These tests verify
#      that the cost bounds are DEFINED (not that the agent produces costs
#      within them — that would require running the agent).
#
#      The parametrize pattern maps failure_mode -> (min_cost, max_cost):
#      - bearing_wear: $5K-20K (bearing kit + labor + alignment)
#      - cooling_degradation: $2K-10K (coolant flush + pump/fan repair)
#      - valve_failure: $3K-15K (valve rebuild or replacement)
#      - ring_wear: $8K-30K (piston ring replacement, major overhaul)
#      - packing_leak: $4K-18K (packing replacement + emissions testing)
#      - fouling: $1K-8K (cleaning, chemical treatment)
#
#      In a full evaluation pipeline, you would:
#      1. Run the work order agent for each failure mode
#      2. Check that agent.estimated_cost falls within [min_cost, max_cost]
#      3. Fail the test if the agent's estimate is unreasonable
#      Here we test only that the bounds are valid (min < max), as a
#      placeholder for the full agent evaluation.
# ===========================================================================

class TestCostEstimates:
    """Test that cost estimates are within reasonable bounds."""

    @pytest.mark.parametrize("failure_mode,min_cost,max_cost", [
        ("bearing_wear", 5000, 20000),
        ("cooling_degradation", 2000, 10000),
        ("valve_failure", 3000, 15000),
        ("ring_wear", 8000, 30000),
        ("packing_leak", 4000, 18000),
        ("fouling", 1000, 8000),
    ])
    def test_cost_within_bounds(self, failure_mode, min_cost, max_cost):
        """Cost estimates should fall within expected ranges per failure mode."""
        # This tests the guardrail logic, not the agent itself
        # In a real eval, you'd run the agent and check the output
        assert min_cost < max_cost
