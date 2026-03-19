# ===========================================================================
# PATTERN: Dual-Framework Architecture (LangGraph + Pydantic AI)
# WHY: LangGraph handles multi-agent orchestration (state, routing, checkpoints,
#      human-in-the-loop gates). Pydantic AI handles individual agent logic
#      (type-safe structured outputs, tool calling, LLM interaction).
#      This separation means you can swap orchestrators (e.g., move to
#      Temporal, Prefect) without rewriting agent logic, or swap LLM
#      frameworks (e.g., move to LangChain agents) without rewriting
#      the workflow graph.
# SCALING: At Archrock scale (4,700 compressors, ~235 active alerts),
#          the closed-loop runs ~50-100 times/day. Each run is 2 LLM calls
#          (investigation + work order) + DB writes. LangGraph's checkpointing
#          ensures no workflow is lost if the process crashes mid-run.
# ALTERNATIVE: Could use a single framework (e.g., LangChain agents with
#              AgentExecutor), but that couples orchestration to LLM logic
#              and makes testing harder. CrewAI was considered but lacks
#              durable execution and HITL support.
# ===========================================================================

# ===========================================================================
# PATTERN: Closed-Loop Autonomous Maintenance
# WHY: Traditional monitoring is open-loop: detect anomaly -> alert human ->
#      human investigates -> human creates work order. The closed loop
#      automates the middle steps: detect -> investigate (AI) -> create WO
#      (AI) -> approve (human for high-risk) -> learn (knowledge base).
#      This reduces mean-time-to-repair (MTTR) from hours to minutes for
#      routine failures like bearing wear or cooling degradation.
# ===========================================================================

"""
LangGraph Multi-Agent Orchestration for Altaviz.

Coordinates the closed-loop maintenance workflow:
Optimization Scan -> Investigation -> Work Order -> Knowledge Base Update

Uses LangGraph for:
- Durable execution with PostgreSQL-backed checkpointing
- Built-in human-in-the-loop approval gates
- State persistence across agent hand-offs
- Conditional routing based on investigation results

Individual agent logic stays in Pydantic AI (type-safe outputs).
LangGraph handles orchestration between agents.
"""

from .workflow import build_closed_loop_graph, run_closed_loop

__all__ = ["build_closed_loop_graph", "run_closed_loop"]
