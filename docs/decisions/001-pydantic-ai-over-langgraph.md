# ADR-001: Pydantic AI for Agent Logic, LangGraph for Orchestration

## Status
Accepted

## Context
Altaviz needs 4 AI agents that produce structured diagnostic reports, investigation findings, work order plans, and optimization recommendations. These agents must:
- Produce validated, typed outputs (not free-form text)
- Call database tools and knowledge base
- Coordinate in a closed-loop workflow with human-in-the-loop approval

## Decision
Use **Pydantic AI** for individual agent logic and **LangGraph** for multi-agent orchestration.

### Pydantic AI (agent logic)
- `result_type=DiagnosticReport` enforces output schema at the framework level
- Tools registered via `@agent.tool_plain` decorator — simple, explicit
- System prompts are plain strings (no complex chain/graph definition)
- Async-first (`agent.run()` returns validated Pydantic model)

### LangGraph (orchestration)
- `StateGraph` coordinates: investigate → work order → approval → knowledge
- Durable execution with checkpointing (resume after crash)
- Built-in human-in-the-loop via `interrupt()` (pauses graph at approval node)
- Conditional routing (skip approval for low-risk work orders)

## Alternatives Considered
- **LangGraph for everything**: More complex, loses Pydantic AI's type-safe structured outputs
- **CrewAI**: Would require rewriting all 4 agents to role-based abstraction
- **AutoGen/Semantic Kernel**: Being superseded by Microsoft Agent Framework (not GA yet)
- **DSPy**: Not production-ready, conflicts with explicit prompt engineering approach

## Consequences
- Two frameworks to maintain (Pydantic AI + LangGraph)
- Clear separation of concerns: agent logic vs orchestration
- Each agent can be tested independently without the graph
- Graph can be visualized for debugging the closed-loop flow
