# ===========================================================================
# PATTERN: Adapter Pattern — LangGraph Nodes Wrapping Pydantic AI Agents
# WHY: Each node function is a thin adapter that bridges two interfaces:
#      1. LangGraph's node interface: async fn(state: TypedDict) -> dict
#      2. Pydantic AI's agent interface: agent.run(prompt) -> StructuredOutput
#      This keeps the Pydantic AI agents completely unaware of LangGraph.
#      You can test agents standalone (via CLI, API, or unit tests) without
#      any LangGraph dependency. You can also swap LangGraph for another
#      orchestrator by writing new adapters — the agents don't change.
# SCALING: At Archrock scale, each node runs 1 LLM call (~2-5 seconds).
#          The full 4-node workflow takes ~10-20 seconds end-to-end.
#          LangGraph runs nodes sequentially (not parallel) because each
#          node depends on the previous node's output.
# ALTERNATIVE: Could embed LangGraph state handling directly into the
#              Pydantic AI agents, but that creates tight coupling and
#              makes agents untestable outside the graph context.
# ===========================================================================

"""
LangGraph node functions for the closed-loop maintenance workflow.

Each node wraps an existing Pydantic AI agent, converting its
structured output into the shared AgentState.
"""

import logging
from typing import Any

from .state import AgentState

logger = logging.getLogger(__name__)


# ===========================================================================
# PATTERN: Async Node Functions
# WHY: LangGraph supports both sync and async nodes. We use async because:
#      1. The underlying Pydantic AI agents use async (agent.run() is async)
#      2. LangGraph's ainvoke() runs the full graph in a single event loop
#      3. If we used sync nodes, LangGraph would have to run them in a
#         thread pool, adding overhead and complexity
# NOTE: All nodes follow the same signature: async fn(state) -> partial_dict
#       The returned dict is MERGED into the existing state (not replaced).
# ===========================================================================


async def investigation_node(state: AgentState) -> dict[str, Any]:
    """Run the investigation agent for root cause analysis.

    Reads: compressor_id, trigger, trigger_id, organization_id
    Writes: investigation_id, root_cause, failure_mode, severity,
            confidence, investigation_report
    """
    # -----------------------------------------------------------------------
    # PATTERN: Deferred Import
    # WHY: Import the agent module inside the function, not at module level.
    #      This avoids circular imports (agents may import shared utilities
    #      that this module also uses) and speeds up module loading (the
    #      heavyweight agent module is only loaded when the node actually runs).
    # -----------------------------------------------------------------------
    from src.agents.investigation_agent import run_investigation

    compressor_id = state["compressor_id"]
    logger.info(f"[LangGraph] Investigation node: analyzing {compressor_id}")

    try:
        report = await run_investigation(
            compressor_id=compressor_id,
            organization_id=state.get("organization_id"),
            trigger_type=state.get("trigger", "graph"),
            trigger_id=state.get("trigger_id"),
        )

        # -------------------------------------------------------------------
        # PATTERN: Immutable State Updates
        # WHY: We create a NEW list from completed_nodes rather than mutating
        #      the existing one. LangGraph's state channels expect each node
        #      to return a fresh dict. Mutating the existing state in-place
        #      could cause subtle bugs with checkpointing and state replay.
        # -------------------------------------------------------------------
        completed = list(state.get("completed_nodes", []))
        completed.append("investigate")

        return {
            "investigation_id": report.investigation_id,
            "root_cause": report.root_cause,
            "failure_mode": report.failure_mode,
            "severity": report.severity,
            "confidence": report.confidence,
            "investigation_report": report.model_dump(),
            "completed_nodes": completed,
        }
    except Exception as e:
        # -------------------------------------------------------------------
        # PATTERN: Error Propagation via State (not exceptions)
        # WHY: Instead of letting the exception crash the graph, we catch it
        #      and set state.error. This lets downstream conditional edges
        #      route to knowledge_update_node to save partial results.
        #      The workflow completes (with an error recorded) rather than
        #      leaving the checkpointed state in a broken intermediate state.
        # -------------------------------------------------------------------
        logger.error(f"[LangGraph] Investigation failed: {e}")
        return {"error": str(e), "completed_nodes": list(state.get("completed_nodes", []))}


async def work_order_node(state: AgentState) -> dict[str, Any]:
    """Create a work order based on investigation findings.

    Reads: compressor_id, investigation_id, root_cause, failure_mode, severity
    Writes: work_order_id, priority, estimated_cost, requires_approval, work_order_plan
    """
    from src.agents.work_order_agent import create_work_order
    from src.agents.shared.guardrails import requires_human_approval

    compressor_id = state["compressor_id"]
    investigation_id = state.get("investigation_id", "")
    logger.info(f"[LangGraph] Work order node: creating WO for {compressor_id}")

    try:
        # -------------------------------------------------------------------
        # PATTERN: Context String Assembly
        # WHY: The work order agent expects a natural-language context string,
        #      not structured data. We assemble this from the investigation
        #      results in the state. This keeps the agent's interface clean
        #      (it doesn't need to know about AgentState) and lets the LLM
        #      reason about the context in natural language.
        # -------------------------------------------------------------------
        context = (
            f"Investigation {investigation_id} found: {state.get('root_cause', 'unknown')}. "
            f"Failure mode: {state.get('failure_mode', 'unknown')}. "
            f"Severity: {state.get('severity', 'unknown')}."
        )

        result = await create_work_order(
            compressor_id=compressor_id,
            source_type="investigation",
            source_id=investigation_id,
            context=context,
        )

        # -------------------------------------------------------------------
        # PATTERN: HITL Gate Check (Guardrails)
        # WHY: The guardrails module (shared/guardrails.py) contains the
        #      deterministic rules for when a human must approve a work order.
        #      This is NOT an LLM decision — it's a hard-coded policy:
        #        - Emergency/urgent priority
        #        - Cost > $10,000
        #        - Shutdown > 4 hours
        #      By checking here (in the adapter), the work order agent
        #      doesn't need to know about approval gates. The result is
        #      stored in requires_approval, which the conditional edge
        #      _should_require_approval reads to route the graph.
        # -------------------------------------------------------------------
        plan = result if isinstance(result, dict) else result
        priority = plan.get("priority", "medium")
        cost = plan.get("estimated_cost", 0)
        shutdown = plan.get("requires_shutdown", False)
        shutdown_hrs = plan.get("shutdown_hours", 0)

        needs_approval = requires_human_approval(
            priority=priority,
            estimated_cost=cost,
            requires_shutdown=shutdown,
            shutdown_hours=shutdown_hrs,
        )

        completed = list(state.get("completed_nodes", []))
        completed.append("create_work_order")

        return {
            "work_order_id": plan.get("work_order_id"),
            "priority": priority,
            "estimated_cost": cost,
            "requires_approval": needs_approval,
            "work_order_plan": plan,
            "completed_nodes": completed,
        }
    except Exception as e:
        logger.error(f"[LangGraph] Work order creation failed: {e}")
        return {"error": str(e), "completed_nodes": list(state.get("completed_nodes", []))}


# ===========================================================================
# PATTERN: Human-in-the-Loop (HITL) Checkpoint
# WHY: Some work orders are too risky to auto-execute. LangGraph provides
#      interrupt() to pause the graph and wait for human input. The graph
#      state is checkpointed, so even if the process restarts, the workflow
#      resumes exactly where it left off.
# PRODUCTION: Replace the auto-approve logic below with:
#      from langgraph.types import interrupt
#      decision = interrupt({"work_order": state["work_order_plan"]})
#      Then the human calls graph.update_state(thread_id, {"approval_status": "approved"})
# DEV MODE: Currently auto-sets approval_status to "pending" for testing.
#      This lets the full graph run without blocking on human input.
# ===========================================================================
async def approval_node(state: AgentState) -> dict[str, Any]:
    """Human-in-the-loop approval checkpoint.

    In production, this node pauses the graph and waits for
    human input via the LangGraph interrupt mechanism.
    For now, auto-approves for testing.
    """
    logger.info(
        f"[LangGraph] Approval node: WO {state.get('work_order_id')} "
        f"requires approval (cost: ${state.get('estimated_cost', 0):,.0f})"
    )

    completed = list(state.get("completed_nodes", []))
    completed.append("human_approval")

    # In production: use LangGraph's interrupt() to pause here
    # The graph resumes when a human calls graph.update_state()
    return {
        "approval_status": "pending",
        "completed_nodes": completed,
    }


# ===========================================================================
# PATTERN: Non-Critical Terminal Node
# WHY: knowledge_update_node is the last node before END. It records what
#      the workflow learned (investigation + work order) as a "learned lesson"
#      in the knowledge base, enabling future RAG retrieval for similar
#      incidents. Critically, this node is NON-CRITICAL: if the knowledge
#      base write fails, the workflow still completes successfully. The
#      investigation and work order are the primary outputs; the knowledge
#      update is a best-effort enhancement.
# SCALING: At Archrock scale, this builds a growing corpus of resolved
#          incidents. After 6 months, the knowledge base may have 500+
#          learned lessons, making RAG retrieval increasingly accurate.
# ===========================================================================
async def knowledge_update_node(state: AgentState) -> dict[str, Any]:
    """Update the knowledge base with investigation findings.

    Creates a knowledge base entry linking the investigation
    to the work order for future similar-incident retrieval.
    """
    logger.info("[LangGraph] Knowledge update node: recording findings")

    completed = list(state.get("completed_nodes", []))
    completed.append("update_knowledge")

    investigation_id = state.get("investigation_id")
    if not investigation_id:
        return {"knowledge_updated": False, "completed_nodes": completed}

    try:
        from src.agents.knowledge_base import add_document

        org_id = state.get("organization_id", "")
        compressor_id = state.get("compressor_id", "")
        failure_mode = state.get("failure_mode", "unknown")

        doc_id = f"WF-{investigation_id}"
        title = f"Workflow: {failure_mode} on {compressor_id}"
        content = (
            f"Closed-loop workflow completed for {compressor_id}. "
            f"Root cause: {state.get('root_cause', 'unknown')}. "
            f"Failure mode: {failure_mode}. "
            f"Work order: {state.get('work_order_id', 'N/A')}. "
            f"Estimated cost: ${state.get('estimated_cost', 0):,.0f}."
        )

        add_document(
            organization_id=org_id,
            doc_id=doc_id,
            doc_type="learned_lesson",
            title=title,
            content=content,
            failure_modes=[failure_mode] if failure_mode != "unknown" else None,
        )

        return {"knowledge_updated": True, "lesson_id": doc_id, "completed_nodes": completed}
    except Exception as e:
        # -------------------------------------------------------------------
        # Non-fatal: log warning but don't set state.error. The workflow
        # has already produced its primary outputs (investigation + WO).
        # -------------------------------------------------------------------
        logger.warning(f"[LangGraph] Knowledge update failed (non-fatal): {e}")
        return {"knowledge_updated": False, "completed_nodes": completed}
