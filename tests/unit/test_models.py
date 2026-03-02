"""Unit tests for shared Pydantic models."""
import pytest
from pydantic import ValidationError

from src.agents.shared.models import (
    RecommendedAction,
    WorkOrderPlan,
    PartRequirement,
    InvestigationReport,
    EvidenceStep,
    OptimizationRecommendation,
    DiagnosticReport,
    WhatIfResult,
)


class TestRecommendedAction:
    def test_valid_action(self):
        a = RecommendedAction(
            action="Replace bearing",
            priority='immediate',
            rationale="Vibration exceeds critical threshold",
        )
        assert a.priority == 'immediate'

    def test_invalid_priority(self):
        with pytest.raises(ValidationError):
            RecommendedAction(
                action="Test",
                priority='invalid',  # type: ignore
                rationale="Test",
            )

    def test_optional_downtime(self):
        a = RecommendedAction(
            action="Inspect valve",
            priority='next_shift',
            rationale="Pressure oscillation detected",
            estimated_downtime_hours=2.5,
        )
        assert a.estimated_downtime_hours == 2.5


class TestWorkOrderPlan:
    def test_valid_work_order(self):
        wo = WorkOrderPlan(
            work_order_id='WO-2026-00001',
            compressor_id='COMP-003',
            title='Replace discharge valve',
            description='Valve showing signs of wear',
            priority='high',
            category='mechanical_repair',
            confidence=0.85,
            reasoning='Investigation found valve failure mode',
        )
        assert wo.priority == 'high'
        assert wo.requires_shutdown is False
        assert wo.parts_needed == []

    def test_confidence_bounds(self):
        with pytest.raises(ValidationError):
            WorkOrderPlan(
                work_order_id='WO-2026-00001',
                compressor_id='COMP-003',
                title='Test',
                description='Test',
                priority='medium',
                category='inspection',
                confidence=1.5,  # Out of bounds
                reasoning='Test',
            )

    def test_with_parts(self):
        wo = WorkOrderPlan(
            work_order_id='WO-2026-00002',
            compressor_id='COMP-005',
            title='Replace bearing assembly',
            description='Bearing wear detected',
            priority='urgent',
            category='mechanical_repair',
            confidence=0.9,
            reasoning='High vibration trending upward',
            parts_needed=[
                PartRequirement(part_name='Main Bearing', quantity=1, estimated_cost=2500),
                PartRequirement(part_name='Seal Kit', part_number='SK-100', quantity=2),
            ],
            requires_shutdown=True,
            estimated_hours=8,
            estimated_cost=5000,
        )
        assert len(wo.parts_needed) == 2
        assert wo.requires_shutdown is True


class TestEvidenceStep:
    def test_valid_step(self):
        step = EvidenceStep(
            step_number=1,
            finding="Vibration at 7.2 mm/s, exceeding 6.0 warning threshold",
            source="get_latest_readings",
            confidence=0.9,
            supports_hypothesis=True,
        )
        assert step.supports_hypothesis is True

    def test_confidence_range(self):
        with pytest.raises(ValidationError):
            EvidenceStep(
                step_number=1,
                finding="Test",
                source="test",
                confidence=-0.1,  # Out of bounds
                supports_hypothesis=True,
            )


class TestInvestigationReport:
    def test_valid_report(self):
        report = InvestigationReport(
            investigation_id='INV-2026-00001',
            compressor_id='COMP-003',
            root_cause='Bearing wear due to age and load',
            severity='warning',
            confidence=0.82,
            evidence_chain=[
                EvidenceStep(step_number=1, finding="High vibration", source="readings", confidence=0.9, supports_hypothesis=True),
            ],
        )
        assert report.severity == 'warning'
        assert len(report.evidence_chain) == 1

    def test_severity_enum(self):
        with pytest.raises(ValidationError):
            InvestigationReport(
                investigation_id='INV-2026-00002',
                compressor_id='COMP-003',
                root_cause='Test',
                severity='unknown',  # type: ignore
                confidence=0.5,
                evidence_chain=[],
            )


class TestOptimizationRecommendation:
    def test_valid_recommendation(self):
        rec = OptimizationRecommendation(
            recommendation_id='OPT-2026-00001',
            rec_type='load_balance',
            scope='station',
            target_ids=['COMP-001', 'COMP-002'],
            title='Rebalance station load',
            description='Redistribute HP across units',
            priority='medium',
            confidence=0.75,
        )
        assert rec.scope == 'station'
        assert len(rec.target_ids) == 2


class TestDiagnosticReport:
    def test_backward_compatible(self):
        """Ensure existing DiagnosticReport model still works."""
        report = DiagnosticReport(
            compressor_id='COMP-003',
            severity='warning',
            root_cause_analysis='Bearing showing signs of wear',
            contributing_factors=['Age', 'Load'],
            recommended_actions=[
                RecommendedAction(action='Replace bearing', priority='next_shift', rationale='Preventive'),
            ],
            confidence=0.85,
            data_summary='24h of sensor data analyzed',
        )
        assert report.compressor_id == 'COMP-003'
