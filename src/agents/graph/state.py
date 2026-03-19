# ===========================================================================
# PATTERN: TypedDict State Schema for LangGraph
# WHY: LangGraph requires TypedDict (not Pydantic BaseModel) for its state
#      channels. This is because LangGraph uses dict-based state merging
#      internally -- each node returns a partial dict that gets merged into
#      the accumulated state. Pydantic BaseModel would add validation
#      overhead on every merge and doesn't support partial updates natively.
# SCALING: State size is small (~1KB per workflow) regardless of fleet size.
#          The state travels through the graph in-memory; only checkpointing
#          touches the database.
# ALTERNATIVE: Pydantic BaseModel would give runtime validation but would
#              require .model_copy(update=...) for partial updates, which
#              LangGraph's state channel system doesn't support. dataclass
#              would work but lacks the partial-update semantics that
#              total=False provides.
# ===========================================================================

"""
LangGraph state schema for the closed-loop maintenance workflow.

Defines the TypedDict that flows through the graph, accumulating
results from each agent node.
"""

from typing import Optional, Any
from typing_extensions import TypedDict


# ===========================================================================
# PATTERN: Progressive State Accumulation (total=False)
# WHY: total=False makes ALL fields optional in the TypedDict. This is
#      critical for LangGraph because each node only writes its own fields.
#      The investigation node doesn't know about work_order_id, and the
#      work_order node doesn't set investigation_id. Without total=False,
#      every node would need to return every field (most as None), which
#      is fragile and verbose.
# HOW IT WORKS: The graph starts with just {compressor_id, trigger, ...}.
#      After the investigation node, the state gains {investigation_id,
#      root_cause, ...}. After the work order node, it gains
#      {work_order_id, priority, ...}. Each node adds its slice.
# ===========================================================================
class AgentState(TypedDict, total=False):
    """State that flows through the closed-loop agent graph.

    Each node reads what it needs and adds its results.
    """
    # -----------------------------------------------------------------------
    # Input fields: Set once at workflow start, read by all downstream nodes.
    # These identify WHAT to investigate and WHO triggered it.
    # -----------------------------------------------------------------------
    compressor_id: str
    organization_id: str
    trigger: str  # "alert", "scan", "manual"
    trigger_id: Optional[str]

    # -----------------------------------------------------------------------
    # Investigation results: Written by investigation_node.
    # The investigation agent performs root cause analysis using sensor data,
    # thresholds, and the knowledge base (RAG). These fields feed directly
    # into the work order node's context string.
    # -----------------------------------------------------------------------
    investigation_id: Optional[str]
    root_cause: Optional[str]
    failure_mode: Optional[str]
    severity: Optional[str]
    confidence: Optional[float]
    investigation_report: Optional[dict]

    # -----------------------------------------------------------------------
    # Work order results: Written by work_order_node.
    # The work order agent generates a maintenance plan based on the
    # investigation findings. requires_approval drives the conditional
    # edge to the HITL approval node.
    # -----------------------------------------------------------------------
    work_order_id: Optional[str]
    priority: Optional[str]
    estimated_cost: Optional[float]
    requires_approval: Optional[bool]
    work_order_plan: Optional[dict]

    # -----------------------------------------------------------------------
    # Approval fields: Written by approval_node (HITL checkpoint).
    # In production, approval_status stays "pending" until a human calls
    # graph.update_state() to set it to "approved" or "rejected".
    # -----------------------------------------------------------------------
    approval_status: Optional[str]  # "approved", "rejected", "pending"
    approved_by: Optional[str]
    approval_reason: Optional[str]

    # -----------------------------------------------------------------------
    # Knowledge base update: Written by knowledge_update_node.
    # Records the investigation + work order as a "learned lesson" so
    # future similar incidents can be found via RAG similarity search.
    # -----------------------------------------------------------------------
    knowledge_updated: Optional[bool]
    lesson_id: Optional[str]

    # -----------------------------------------------------------------------
    # Workflow metadata: Used for error handling and audit trail.
    # error: If any node fails, it sets this field. Downstream conditional
    #   edges check for errors and route to knowledge_update (to save
    #   partial results) instead of continuing the happy path.
    # completed_nodes: Append-only list tracking which nodes have run.
    #   This serves as an audit trail and enables debugging: if a workflow
    #   fails, you can see exactly which nodes completed before the failure.
    # -----------------------------------------------------------------------
    error: Optional[str]
    completed_nodes: list[str]
