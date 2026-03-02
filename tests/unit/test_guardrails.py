"""Unit tests for agent guardrails."""
import pytest
from unittest.mock import patch

from src.agents.shared.guardrails import (
    GuardrailError,
    check_confidence_threshold,
    requires_human_approval,
    check_work_order_rate_limit,
    check_session_rate_limit,
    check_tier_access,
    MIN_CONFIDENCE_TO_ACT,
    MAX_COST_AUTO_APPROVE,
    MAX_SHUTDOWN_HOURS_AUTO,
    MAX_WORK_ORDERS_PER_HOUR,
    TIER_LIMITS,
)


# ============================================================================
# Confidence threshold tests
# ============================================================================

class TestConfidenceThreshold:
    def test_passes_at_threshold(self):
        """Should not raise when confidence equals threshold."""
        check_confidence_threshold(MIN_CONFIDENCE_TO_ACT)

    def test_passes_above_threshold(self):
        """Should not raise when confidence exceeds threshold."""
        check_confidence_threshold(0.95)

    def test_fails_below_threshold(self):
        """Should raise GuardrailError when confidence is too low."""
        with pytest.raises(GuardrailError, match="below the minimum threshold"):
            check_confidence_threshold(0.3)

    def test_fails_at_zero(self):
        """Should raise GuardrailError for zero confidence."""
        with pytest.raises(GuardrailError):
            check_confidence_threshold(0.0)


# ============================================================================
# Human approval tests
# ============================================================================

class TestRequiresHumanApproval:
    def test_emergency_priority(self):
        assert requires_human_approval('emergency', None, False, None) is True

    def test_urgent_priority(self):
        assert requires_human_approval('urgent', None, False, None) is True

    def test_high_cost(self):
        assert requires_human_approval('medium', MAX_COST_AUTO_APPROVE + 1, False, None) is True

    def test_at_cost_limit(self):
        """Cost exactly at limit should not require approval."""
        assert requires_human_approval('medium', MAX_COST_AUTO_APPROVE, False, None) is False

    def test_long_shutdown(self):
        assert requires_human_approval('medium', None, True, MAX_SHUTDOWN_HOURS_AUTO + 1) is True

    def test_short_shutdown(self):
        assert requires_human_approval('medium', None, True, 2) is False

    def test_low_priority_no_shutdown(self):
        assert requires_human_approval('low', 500, False, None) is False

    def test_medium_priority_low_cost(self):
        assert requires_human_approval('medium', 1000, False, None) is False


# ============================================================================
# Tier limits tests
# ============================================================================

class TestTierLimits:
    def test_free_tier_no_agents(self):
        assert TIER_LIMITS['free']['agents_enabled'] is False

    def test_pro_tier_agents_enabled(self):
        assert TIER_LIMITS['pro']['agents_enabled'] is True

    def test_enterprise_autonomous_scans(self):
        assert TIER_LIMITS['enterprise']['autonomous_scans'] is True

    def test_pro_no_autonomous_scans(self):
        assert TIER_LIMITS['pro']['autonomous_scans'] is False

    @patch('src.agents.shared.guardrails.query_db')
    def test_free_tier_blocks_agents(self, mock_query):
        mock_query.return_value = [{'subscription_tier': 'free'}]
        with pytest.raises(GuardrailError, match="not available on the free plan"):
            check_tier_access('org-1', 'agents')

    @patch('src.agents.shared.guardrails.query_db')
    def test_pro_tier_allows_agents(self, mock_query):
        mock_query.return_value = [{'subscription_tier': 'pro'}]
        check_tier_access('org-1', 'agents')  # Should not raise

    @patch('src.agents.shared.guardrails.query_db')
    def test_pro_tier_blocks_autonomous(self, mock_query):
        mock_query.return_value = [{'subscription_tier': 'pro'}]
        with pytest.raises(GuardrailError, match="Enterprise plan"):
            check_tier_access('org-1', 'autonomous_scans')

    @patch('src.agents.shared.guardrails.query_db')
    def test_enterprise_allows_autonomous(self, mock_query):
        mock_query.return_value = [{'subscription_tier': 'enterprise'}]
        check_tier_access('org-1', 'autonomous_scans')  # Should not raise

    @patch('src.agents.shared.guardrails.query_db')
    def test_unknown_org_raises(self, mock_query):
        mock_query.return_value = []
        with pytest.raises(GuardrailError, match="not found"):
            check_tier_access('org-unknown', 'agents')


# ============================================================================
# Rate limit tests (mocked DB)
# ============================================================================

class TestRateLimits:
    @patch('src.agents.shared.guardrails.query_db')
    def test_work_order_rate_limit_under(self, mock_query):
        mock_query.return_value = [{'cnt': MAX_WORK_ORDERS_PER_HOUR - 1}]
        check_work_order_rate_limit('org-1')  # Should not raise

    @patch('src.agents.shared.guardrails.query_db')
    def test_work_order_rate_limit_exceeded(self, mock_query):
        mock_query.return_value = [{'cnt': MAX_WORK_ORDERS_PER_HOUR}]
        with pytest.raises(GuardrailError, match="rate limit exceeded"):
            check_work_order_rate_limit('org-1')

    @patch('src.agents.shared.guardrails.query_db')
    def test_session_rate_limit_under(self, mock_query):
        # First call returns tier, second returns count
        mock_query.side_effect = [
            [{'subscription_tier': 'pro'}],
            [{'cnt': 5}],
        ]
        check_session_rate_limit('org-1')  # Should not raise (pro = 10/day)

    @patch('src.agents.shared.guardrails.query_db')
    def test_session_rate_limit_exceeded(self, mock_query):
        mock_query.side_effect = [
            [{'subscription_tier': 'pro'}],
            [{'cnt': 10}],
        ]
        with pytest.raises(GuardrailError, match="Daily agent session limit"):
            check_session_rate_limit('org-1')
