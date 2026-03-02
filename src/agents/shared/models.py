"""
Shared Pydantic models for the Altaviz agentic system.

These models define the structured inputs/outputs used across all 3 agents
and shared infrastructure. They serve as the contract between agents.
"""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


# ============================================================================
# SHARED MODELS (used across multiple agents)
# ============================================================================

class RecommendedAction(BaseModel):
    """A specific maintenance or operational action to take."""
    action: str = Field(description="Clear description of the action to take")
    priority: Literal['immediate', 'next_shift', 'next_maintenance_window', 'monitor'] = Field(
        description="Priority level for the action"
    )
    estimated_downtime_hours: Optional[float] = Field(
        default=None, description="Estimated downtime if action requires shutdown"
    )
    rationale: str = Field(description="Why this action is recommended based on the data")


# ============================================================================
# USE CASE 1: WORK ORDER ORCHESTRATION
# ============================================================================

class PartRequirement(BaseModel):
    """A part needed for a work order."""
    part_name: str
    part_number: Optional[str] = None
    quantity: int = 1
    estimated_cost: Optional[float] = None


class WorkOrderPlan(BaseModel):
    """Structured output from the Work Order Agent."""
    work_order_id: str = Field(description="Generated work order ID (WO-YYYY-NNNNN)")
    compressor_id: str
    title: str = Field(max_length=300)
    description: str
    priority: Literal['emergency', 'urgent', 'high', 'medium', 'low']
    category: Literal[
        'mechanical_repair', 'inspection', 'preventive', 'calibration',
        'emissions_compliance', 'optimization', 'emergency_shutdown'
    ]
    estimated_hours: Optional[float] = None
    estimated_cost: Optional[float] = None
    recommended_schedule: Optional[str] = Field(
        default=None, description="When to schedule: 'today', 'tomorrow', 'this_week', 'next_maintenance_window'"
    )
    parts_needed: list[PartRequirement] = Field(default_factory=list)
    safety_considerations: list[str] = Field(default_factory=list)
    requires_shutdown: bool = False
    confidence: float = Field(ge=0.0, le=1.0)
    reasoning: str = Field(description="Why this work order was created with this priority")


class WorkOrderTransitionRequest(BaseModel):
    """Request to transition a work order to a new status."""
    work_order_id: str
    to_status: Literal[
        'pending_approval', 'approved', 'rejected', 'assigned',
        'in_progress', 'completed', 'verified', 'cancelled'
    ]
    reason: str
    assigned_to: Optional[str] = None
    actual_hours: Optional[float] = None
    actual_cost: Optional[float] = None
    completion_notes: Optional[str] = None
    parts_replaced: Optional[list[dict]] = None


# ============================================================================
# USE CASE 2: ROOT CAUSE INVESTIGATION
# ============================================================================

class EvidenceStep(BaseModel):
    """A single step in the investigation evidence chain."""
    step_number: int
    finding: str = Field(description="What was discovered in this step")
    source: str = Field(description="Tool or data source used (e.g., 'get_latest_readings', 'knowledge_base')")
    confidence: float = Field(ge=0.0, le=1.0)
    supports_hypothesis: bool = Field(description="Whether this finding supports the working hypothesis")


class SimilarIncident(BaseModel):
    """A past incident similar to the current investigation."""
    compressor_id: str
    date: str
    failure_mode: str
    similarity_score: float = Field(ge=0.0, le=1.0)
    outcome: str = Field(description="What was done and whether it worked")


class KnowledgeSource(BaseModel):
    """A knowledge base document referenced in the investigation."""
    doc_id: str
    title: str
    relevance_score: float = Field(ge=0.0, le=1.0)
    excerpt: str = Field(description="Relevant excerpt from the document")


class InvestigationReport(BaseModel):
    """Structured output from the Root Cause Investigation Agent."""
    investigation_id: str = Field(description="Generated investigation ID (INV-YYYY-NNNNN)")
    compressor_id: str
    root_cause: str = Field(description="Primary root cause identified")
    failure_mode: Optional[str] = Field(
        default=None,
        description="Identified failure mode: bearing_wear, cooling_degradation, valve_failure, ring_wear, packing_leak, fouling"
    )
    severity: Literal['healthy', 'early_warning', 'warning', 'critical', 'emergency']
    confidence: float = Field(ge=0.0, le=1.0)
    evidence_chain: list[EvidenceStep] = Field(description="Step-by-step evidence gathered during investigation")
    contributing_factors: list[str] = Field(default_factory=list)
    similar_incidents: list[SimilarIncident] = Field(default_factory=list)
    recommended_actions: list[RecommendedAction] = Field(default_factory=list)
    estimated_rul_hours: Optional[float] = None
    estimated_repair_cost: Optional[float] = None
    knowledge_sources: list[KnowledgeSource] = Field(default_factory=list)


class InvestigationFeedback(BaseModel):
    """Technician feedback on an investigation report."""
    investigation_id: str
    feedback_rating: int = Field(ge=1, le=5, description="1-5 rating of diagnosis accuracy")
    was_correct: bool = Field(description="Whether the root cause was correct")
    technician_feedback: str = Field(description="Free-text feedback from technician")
    actual_root_cause: Optional[str] = Field(
        default=None, description="The actual root cause if diagnosis was wrong"
    )


# ============================================================================
# USE CASE 3: FLEET OPTIMIZATION
# ============================================================================

class OptimizationRecommendation(BaseModel):
    """Structured output from the Fleet Optimization Copilot."""
    recommendation_id: str = Field(description="Generated recommendation ID (OPT-YYYY-NNNNN)")
    rec_type: Literal[
        'load_balance', 'deferred_maintenance', 'emissions_reduction',
        'efficiency_improvement', 'preventive_schedule', 'fleet_reconfig'
    ]
    scope: Literal['compressor', 'station', 'basin', 'fleet']
    target_ids: list[str] = Field(description="Compressor, station, or basin IDs affected")
    title: str = Field(max_length=300)
    description: str
    priority: Literal['critical', 'high', 'medium', 'low', 'informational']
    estimated_savings_usd: Optional[float] = None
    estimated_emissions_reduction_tonnes: Optional[float] = None
    estimated_uptime_improvement_pct: Optional[float] = None
    scenario_comparison: Optional[dict] = Field(
        default=None, description="Baseline vs. optimized scenario comparison"
    )
    confidence: float = Field(ge=0.0, le=1.0)


class WhatIfRequest(BaseModel):
    """Input for a what-if simulation."""
    scenario_type: Literal['load_balance', 'shutdown_impact', 'maintenance_defer', 'emissions_reduction']
    target_compressor_ids: list[str]
    parameters: dict = Field(description="Scenario-specific parameters (e.g., defer_days, load_pct)")


class WhatIfResult(BaseModel):
    """Output from a what-if simulation."""
    scenario_type: str
    target_ids: list[str]
    baseline: dict = Field(description="Current state metrics")
    projected: dict = Field(description="Projected state after change")
    risk_assessment: str = Field(description="Assessment of risks from this change")
    recommendation: str = Field(description="Whether to proceed and why")
    confidence: float = Field(ge=0.0, le=1.0)


class FleetScanResult(BaseModel):
    """Output from a fleet optimization scan."""
    scan_timestamp: str
    total_compressors: int
    health_distribution: dict = Field(description="{'healthy': N, 'warning': N, 'critical': N}")
    fleet_health_score: float = Field(ge=0.0, le=100.0)
    top_risks: list[dict] = Field(description="Top at-risk compressors with details")
    recommendations: list[OptimizationRecommendation] = Field(default_factory=list)


# ============================================================================
# DIAGNOSTIC REPORT (existing, kept for backward compatibility)
# ============================================================================

class DiagnosticReport(BaseModel):
    """Structured diagnostic report for a compressor unit (existing agent output)."""
    compressor_id: str = Field(description="The compressor identifier (e.g., COMP-003)")
    severity: str = Field(description="Overall severity: healthy, warning, critical, or emergency")
    root_cause_analysis: str = Field(description="Analysis of what is causing the current condition")
    contributing_factors: list[str] = Field(description="List of factors contributing to the diagnosis")
    recommended_actions: list[RecommendedAction] = Field(description="Prioritized list of recommended actions")
    estimated_time_to_failure: Optional[str] = Field(
        default=None, description="Estimated time until critical failure, if applicable"
    )
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence in the diagnosis (0.0 to 1.0)")
    data_summary: str = Field(description="Summary of the sensor data analyzed")
