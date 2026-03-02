"""Unit tests for work order state machine."""
import pytest

from src.agents.work_order_state_machine import (
    VALID_TRANSITIONS,
    InvalidTransitionError,
    validate_transition,
)


class TestValidTransitions:
    """Test that the transition map is correct."""

    def test_draft_can_go_to_pending(self):
        assert 'pending_approval' in VALID_TRANSITIONS['draft']

    def test_draft_can_be_cancelled(self):
        assert 'cancelled' in VALID_TRANSITIONS['draft']

    def test_pending_can_be_approved(self):
        assert 'approved' in VALID_TRANSITIONS['pending_approval']

    def test_pending_can_be_rejected(self):
        assert 'rejected' in VALID_TRANSITIONS['pending_approval']

    def test_approved_can_be_assigned(self):
        assert 'assigned' in VALID_TRANSITIONS['approved']

    def test_assigned_can_start(self):
        assert 'in_progress' in VALID_TRANSITIONS['assigned']

    def test_in_progress_can_complete(self):
        assert 'completed' in VALID_TRANSITIONS['in_progress']

    def test_completed_can_be_verified(self):
        assert 'verified' in VALID_TRANSITIONS['completed']

    def test_verified_is_terminal(self):
        """Verified state has no forward transitions."""
        assert VALID_TRANSITIONS.get('verified') == []

    def test_cancelled_is_terminal(self):
        """Cancelled state has no forward transitions."""
        assert VALID_TRANSITIONS.get('cancelled') == []

    def test_rejected_can_redraft(self):
        """Rejected work orders can be re-drafted."""
        assert 'draft' in VALID_TRANSITIONS['rejected']


class TestValidateTransition:
    """Test the validate_transition function."""

    def test_valid_transition(self):
        validate_transition('draft', 'pending_approval')  # Should not raise

    def test_invalid_transition(self):
        with pytest.raises(InvalidTransitionError, match="Cannot transition"):
            validate_transition('draft', 'completed')

    def test_invalid_transition_backward(self):
        with pytest.raises(InvalidTransitionError):
            validate_transition('completed', 'draft')

    def test_same_state_transition(self):
        """Transitioning to the same state should be invalid."""
        with pytest.raises(InvalidTransitionError):
            validate_transition('draft', 'draft')

    def test_all_active_states_can_cancel(self):
        """All active (non-terminal) states should be able to cancel."""
        cancellable = ['draft', 'pending_approval', 'approved', 'assigned', 'in_progress', 'completed']
        for state in cancellable:
            validate_transition(state, 'cancelled')  # Should not raise

    def test_happy_path_full_lifecycle(self):
        """Test the complete happy path: draft -> ... -> verified."""
        path = ['draft', 'pending_approval', 'approved', 'assigned', 'in_progress', 'completed', 'verified']
        for i in range(len(path) - 1):
            validate_transition(path[i], path[i + 1])  # Should not raise

    def test_unknown_from_status(self):
        with pytest.raises(InvalidTransitionError, match="Unknown status"):
            validate_transition('unknown', 'draft')


class TestTransitionCoverage:
    """Test that all states are accounted for."""

    def test_all_states_defined(self):
        expected = {'draft', 'pending_approval', 'approved', 'rejected',
                    'assigned', 'in_progress', 'completed', 'verified', 'cancelled'}
        defined = set(VALID_TRANSITIONS.keys())
        assert expected == defined

    def test_no_unknown_target_states(self):
        all_states = {'draft', 'pending_approval', 'approved', 'rejected',
                      'assigned', 'in_progress', 'completed', 'verified', 'cancelled'}
        for source, targets in VALID_TRANSITIONS.items():
            for target in targets:
                assert target in all_states, f"Unknown target state '{target}' from '{source}'"
