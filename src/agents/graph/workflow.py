# ===========================================================================
# PATTERN: StateGraph Compilation (Define -> Add Nodes -> Add Edges -> Compile)
# WHY: LangGraph uses a builder pattern: you construct the graph declaratively
#      (nodes + edges), then compile it into an immutable, executable object.
#      The compiled graph is thread-safe and can be reused across requests.
#      This is similar to how TensorFlow builds a computation graph before
#      executing it, or how Spark builds a DAG before running a job.
# SCALING: Each closed-loop workflow runs 2 LLM calls (investigation +
#          work order) + 2-3 DB writes (knowledge base + checkpoint).
#          At Archrock scale (~50-100 workflows/day), this is well within
#          the capacity of a single process. For higher throughput, run
#          multiple workers with a shared PostgreSQL checkpointer.
# ALTERNATIVE: Could use a simple async pipeline (await investigate();
#              await create_wo(); ...) but that loses: checkpointing,
#              HITL interrupts, conditional routing, and state persistence.
# ===========================================================================

"""
LangGraph closed-loop maintenance workflow.

Builds and runs the graph:
  investigate -> create_work_order -> [needs approval?] -> approval / skip -> update_knowledge -> END

Features:
- Durable execution with checkpointing
- Conditional routing based on approval requirements
- Human-in-the-loop for high-risk work orders
- Full state persistence for audit trail
"""

import logging
import uuid
from typing import Optional

from .state import AgentState
from .nodes import (
    investigation_node,
    work_order_node,
    approval_node,
    knowledge_update_node,
)

logger = logging.getLogger(__name__)


# ===========================================================================
# PATTERN: Conditional Edge Functions
# WHY: LangGraph's add_conditional_edges() takes a function that inspects
#      the current state and returns the NAME of the next node. This is
#      how you implement branching logic in the graph. The function must
#      return one of the keys in the routing dict passed to
#      add_conditional_edges().
# DESIGN: Both functions check for errors first. On error, they skip to
#         knowledge_update to save partial results. This ensures the
#         workflow always reaches a terminal state (never hangs).
# ===========================================================================


def _should_require_approval(state: AgentState) -> str:
    """Conditional edge: route to approval or skip to knowledge update.

    Uses the guardrails.requires_human_approval result that was computed
    in work_order_node and stored in state['requires_approval'].
    """
    if state.get("error"):
        return "update_knowledge"  # Skip approval on error, still record what we learned
    if state.get("requires_approval"):
        return "human_approval"
    return "update_knowledge"


def _should_continue_after_investigation(state: AgentState) -> str:
    """Conditional edge: skip work order if investigation failed.

    If the investigation node set state.error (e.g., LLM timeout, DB error),
    there's no root cause to base a work order on. Skip straight to
    knowledge_update to record the partial failure for debugging.
    """
    if state.get("error"):
        return "update_knowledge"
    return "create_work_order"


def build_closed_loop_graph():
    """Build the LangGraph StateGraph for the closed-loop workflow.

    Returns:
        Compiled graph ready for invocation.
    """
    try:
        from langgraph.graph import StateGraph, END
        from langgraph.checkpoint.memory import MemorySaver
    except ImportError:
        logger.error(
            "langgraph not installed. Install with: pip install langgraph"
        )
        raise

    # -----------------------------------------------------------------------
    # Step 1: Create the graph with our state schema.
    # StateGraph(AgentState) tells LangGraph the shape of the state dict
    # that flows between nodes. LangGraph uses this to set up state channels.
    # -----------------------------------------------------------------------
    graph = StateGraph(AgentState)

    # -----------------------------------------------------------------------
    # Step 2: Add nodes. Each node is a named async function.
    # The name string ("investigate", etc.) is used in edge definitions
    # and appears in checkpointed state for debugging.
    # -----------------------------------------------------------------------
    graph.add_node("investigate", investigation_node)
    graph.add_node("create_work_order", work_order_node)
    graph.add_node("human_approval", approval_node)
    graph.add_node("update_knowledge", knowledge_update_node)

    # -----------------------------------------------------------------------
    # Step 3: Set entry point. This is where the graph starts execution.
    # -----------------------------------------------------------------------
    graph.set_entry_point("investigate")

    # -----------------------------------------------------------------------
    # Step 4: Add edges (both conditional and unconditional).
    #
    # The graph topology:
    #   investigate --[ok]--> create_work_order --[needs approval]--> human_approval --> update_knowledge --> END
    #              \--[err]-> update_knowledge   \--[no approval]---> update_knowledge
    #
    # Conditional edges take: (source_node, routing_function, {return_value: target_node})
    # The routing_function receives the current state and returns a string
    # that maps to one of the target nodes.
    # -----------------------------------------------------------------------
    graph.add_conditional_edges(
        "investigate",
        _should_continue_after_investigation,
        {
            "create_work_order": "create_work_order",
            "update_knowledge": "update_knowledge",
        },
    )

    graph.add_conditional_edges(
        "create_work_order",
        _should_require_approval,
        {
            "human_approval": "human_approval",
            "update_knowledge": "update_knowledge",
        },
    )

    graph.add_edge("human_approval", "update_knowledge")
    graph.add_edge("update_knowledge", END)

    # -----------------------------------------------------------------------
    # PATTERN: MemorySaver Checkpointer (Dev) vs PostgreSQL (Production)
    # WHY: MemorySaver stores graph state in a Python dict — fast for
    #      development but lost on process restart. In production, replace
    #      with langgraph-checkpoint-postgres for durable execution:
    #
    #        from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
    #        checkpointer = AsyncPostgresSaver.from_conn_string(DATABASE_URL)
    #
    #      This enables: crash recovery (resume from last checkpoint),
    #      HITL approval (pause for days, resume when human approves),
    #      and multi-worker execution (shared state across processes).
    # -----------------------------------------------------------------------
    checkpointer = MemorySaver()
    return graph.compile(checkpointer=checkpointer)


# ===========================================================================
# PATTERN: Lazy Singleton for Compiled Graph
# WHY: Building the graph involves importing LangGraph, creating nodes,
#      and compiling — moderate overhead. We do it once (on first use)
#      and reuse the compiled graph for all subsequent workflow runs.
#      The compiled graph is immutable and thread-safe.
# NOTE: In a multi-worker deployment (e.g., gunicorn with multiple workers),
#       each worker gets its own compiled graph instance. This is fine
#       because the graph definition is stateless — all state lives in
#       the checkpointer.
# ===========================================================================

# Module-level compiled graph (lazy initialization)
_compiled_graph = None


def _get_graph():
    """Get or build the compiled graph."""
    global _compiled_graph
    if _compiled_graph is None:
        _compiled_graph = build_closed_loop_graph()
    return _compiled_graph


async def run_closed_loop(
    compressor_id: str,
    trigger: str = "manual",
    organization_id: Optional[str] = None,
    trigger_id: Optional[str] = None,
) -> dict:
    """Run the full closed-loop workflow for a compressor.

    Args:
        compressor_id: The compressor to investigate (e.g., "COMP-0003")
        trigger: What triggered the workflow ("alert", "scan", "manual")
        organization_id: Org scope for multi-tenant
        trigger_id: ID of the triggering entity

    Returns:
        Final state dict with investigation, work order, and knowledge update results
    """
    from src.agents.shared.db_tools import query_db

    # Resolve org ID if not provided
    if not organization_id:
        rows = query_db(
            "SELECT id FROM organizations WHERE slug = 'altaviz-demo' LIMIT 1", []
        )
        organization_id = str(rows[0]["id"]) if rows else ""

    initial_state: AgentState = {
        "compressor_id": compressor_id,
        "organization_id": organization_id,
        "trigger": trigger,
        "trigger_id": trigger_id,
        "completed_nodes": [],
    }

    # -----------------------------------------------------------------------
    # PATTERN: Thread ID for Durable Execution
    # WHY: Each workflow invocation gets a unique thread_id (UUID). LangGraph
    #      uses this as the primary key for checkpointed state. If the
    #      process crashes mid-workflow, you can resume by calling
    #      graph.ainvoke(None, {"configurable": {"thread_id": thread_id}}).
    #      The graph picks up from the last completed node.
    # HITL: For human-in-the-loop, the thread_id is returned to the caller.
    #       When the human approves, the frontend calls resume with the
    #       same thread_id to continue the paused workflow.
    # -----------------------------------------------------------------------
    thread_id = str(uuid.uuid4())
    config = {"configurable": {"thread_id": thread_id}}

    logger.info(
        f"[LangGraph] Starting closed-loop workflow for {compressor_id} "
        f"(thread: {thread_id}, trigger: {trigger})"
    )

    graph = _get_graph()
    final_state = await graph.ainvoke(initial_state, config)

    logger.info(
        f"[LangGraph] Workflow complete for {compressor_id}: "
        f"nodes={final_state.get('completed_nodes', [])}, "
        f"investigation={final_state.get('investigation_id')}, "
        f"work_order={final_state.get('work_order_id')}"
    )

    return dict(final_state)
