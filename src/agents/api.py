"""
Altaviz Agent API

FastAPI sidecar that exposes all 3 agentic systems + the original diagnostics agent.
Run alongside the Next.js frontend.

Usage:
    uvicorn src.agents.api:app --port 8001

Agents:
    - Diagnostics Agent (existing): POST /diagnose
    - Investigation Agent (Use Case 2): POST /investigations/*
    - Work Order Agent (Use Case 1): POST /work-orders/*
    - Fleet Optimization Copilot (Use Case 3): POST /optimization/*
"""

# ===========================================================================
# PATTERN: Sidecar API (FastAPI)
# WHY: FastAPI was chosen over Flask/Django for three reasons:
#   1. Async-first — all agent calls are async (LLM API calls, DB queries),
#      FastAPI's native async support avoids thread pool overhead
#   2. Pydantic integration — request/response models share the same Pydantic
#      types used by agents, eliminating serialization boilerplate
#   3. Auto-generated OpenAPI docs — every endpoint gets Swagger UI at /docs,
#      critical for frontend team to self-serve API integration
# SCALING: This sidecar runs as a separate process from the Next.js frontend,
#   allowing independent scaling (e.g., 2 API replicas behind a load balancer
#   while the frontend has its own scaling policy)
# ALTERNATIVE: Django (too heavy, sync-first), Flask (no native async,
#   no built-in Pydantic), gRPC (overhead for internal-only API)
# ===========================================================================

import os
import re
import json
import logging
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .shared.tracing import observe, flush_tracing, shutdown_tracing, is_tracing_enabled

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

# Regex pattern for compressor ID validation. Format: COMP-NNN or COMP-NNNN.
# This is a server-side guardrail — prevents typos and injection attempts from
# reaching the database. The frontend also validates, but never trust the client.
COMPRESSOR_ID_PATTERN = re.compile(r'^COMP-\d{3,4}$')


# ===========================================================================
# PATTERN: Lifespan Context Manager (ASGI lifecycle)
# WHY: FastAPI's lifespan replaces the older @app.on_event("startup")/"shutdown"
#   decorators. It uses a single async context manager so startup and shutdown
#   logic share the same scope — any resources opened in startup are guaranteed
#   to be cleaned up in shutdown (e.g., tracing flush).
# SCALING: At scale, this is where you'd initialize connection pools, warm ML
#   model caches, or register with a service discovery system.
# ALTERNATIVE: @app.on_event was deprecated in FastAPI 0.103+ in favor of
#   lifespan because on_event couldn't share state between startup/shutdown.
# ===========================================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Altaviz Agent API starting...")
    model = os.environ.get('DIAGNOSTICS_MODEL', 'openai:gpt-4o-mini')
    logger.info(f"Using model: {model}")
    logger.info("Agents: diagnostics, investigation, work_order, optimization")
    if is_tracing_enabled():
        logger.info("Langfuse tracing: enabled")
    yield
    # Shutdown: flush any pending traces to Langfuse before the process exits.
    # Without this, the last few seconds of traces would be lost.
    shutdown_tracing()
    logger.info("Altaviz Agent API shutting down...")


app = FastAPI(
    title="Altaviz Agent API",
    description="AI-powered compressor fleet management with 4 specialized agents",
    version="2.0.0",
    lifespan=lifespan,
)

# ===========================================================================
# CORS Configuration
# WHY: The Next.js frontend (port 3000/3001) calls this API (port 8001) from
#   the browser. Without CORS headers, the browser blocks cross-origin requests.
# ORIGINS:
#   - localhost:3000 = Next.js dev server (npm run dev)
#   - localhost:3001 = alternate dev port (when running multiple instances)
#   - NEXTAUTH_URL = production URL (Vercel deployment)
# SECURITY: We explicitly list allowed origins instead of using "*" (wildcard)
#   to prevent arbitrary websites from making authenticated API calls.
# METHODS: Only POST (create/action), GET (read), PATCH (update) — no DELETE
#   because work orders are cancelled via state transition, never deleted.
# ===========================================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        os.environ.get("NEXTAUTH_URL", "https://altaviz.vercel.app"),
    ],
    allow_methods=["POST", "GET", "PATCH"],
    allow_headers=["*"],
)


# ============================================================================
# REQUEST/RESPONSE MODELS
# ===========================================================================
# PATTERN: Pydantic Request Models (API Gateway Validation)
# WHY: Each endpoint has its own request model rather than accepting raw dicts.
#   This gives us: (1) automatic validation with clear error messages,
#   (2) OpenAPI schema generation for frontend code-gen, (3) type safety
#   so the IDE catches mismatches before runtime.
# ALTERNATIVE: Using raw dict parameters and manual validation — more code,
#   worse error messages, no auto-docs.
# ============================================================================

class DiagnoseRequest(BaseModel):
    compressor_id: str = Field(description="Compressor ID (e.g., COMP-003)")

class InvestigationRequest(BaseModel):
    compressor_id: str
    trigger_type: str = 'manual'
    trigger_id: Optional[str] = None

class InvestigationFeedbackRequest(BaseModel):
    feedback_rating: int = Field(ge=1, le=5)
    was_correct: bool
    technician_feedback: str
    actual_root_cause: Optional[str] = None

class WorkOrderCreateRequest(BaseModel):
    compressor_id: str
    source_type: str = 'manual'
    source_id: Optional[str] = None
    context: Optional[str] = None

class WorkOrderTransitionRequest(BaseModel):
    """Fields for transitioning a work order through the state machine.
    Most fields are optional because different transitions need different data:
    - approved: needs approved_by
    - assigned: needs assigned_to
    - completed: needs actual_hours, actual_cost, completion_notes, parts_replaced
    The state machine (work_order_state_machine.py) enforces which fields are
    actually required for each transition — the API layer just passes them through.
    """
    to_status: str
    reason: str
    assigned_to: Optional[str] = None
    approved_by: Optional[str] = None
    actual_hours: Optional[float] = None
    actual_cost: Optional[float] = None
    completion_notes: Optional[str] = None
    parts_replaced: Optional[list[dict]] = None

class FleetScanRequest(BaseModel):
    organization_id: Optional[str] = None
    scan_type: str = 'full'

class WhatIfRequest(BaseModel):
    scenario_type: str
    compressor_id: Optional[str] = None
    station_id: Optional[str] = None
    organization_id: Optional[str] = None
    defer_days: Optional[int] = None

class ChatRequest(BaseModel):
    message: str
    organization_id: Optional[str] = None
    conversation_history: Optional[list[dict]] = None


# ============================================================================
# DIAGNOSTICS (existing)
# ============================================================================

# ===========================================================================
# PATTERN: Lazy Imports Inside Endpoints
# WHY: Agent modules (diagnostics_agent, investigation_agent, etc.) are
#   imported inside each endpoint function, not at the top of the file.
#   Three reasons:
#   1. Avoid circular imports — agents import shared modules that may
#      reference API types
#   2. Reduce cold start time — only the requested agent's code is loaded,
#      not all 4 agents on every request
#   3. Graceful degradation — if one agent has a broken dependency, the
#      other endpoints still work
# ALTERNATIVE: Top-level imports are cleaner but create tight coupling
#   between all agent modules at import time.
# ===========================================================================

# ===========================================================================
# PATTERN: Observe Decorator (Langfuse Tracing)
# WHY: The @observe decorator is placed on the API endpoint, not on the
#   agent's internal run() function. This captures the full request lifecycle
#   (validation + agent execution + response serialization) as a single trace
#   span. The agent's internal tool calls create child spans automatically
#   via Pydantic AI's built-in Langfuse integration.
# SCALING: At 4,700 compressors, traces help identify slow endpoints and
#   diagnose which tool calls dominate latency.
# ===========================================================================
@app.post("/diagnose")
@observe(name="diagnose")
async def diagnose(request: DiagnoseRequest):
    """Run AI diagnostics for a specific compressor."""
    if not COMPRESSOR_ID_PATTERN.match(request.compressor_id):
        raise HTTPException(status_code=400, detail="Invalid compressor ID format. Expected COMP-XXX")

    # Lazy import: only load diagnostics_agent when this endpoint is called
    from src.agents.diagnostics_agent import diagnose_compressor
    try:
        report = await diagnose_compressor(request.compressor_id)
        return report.model_dump()  # Pydantic model_dump() converts to JSON-safe dict
    except Exception as e:
        logger.error(f"Diagnosis failed for {request.compressor_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Diagnosis failed: {str(e)}")


# ============================================================================
# INVESTIGATION AGENT (Use Case 2)
# ============================================================================

@app.post("/investigations/start")
@observe(name="investigation-start")
async def start_investigation(request: InvestigationRequest):
    """Start a root cause investigation for a compressor."""
    if not COMPRESSOR_ID_PATTERN.match(request.compressor_id):
        raise HTTPException(status_code=400, detail="Invalid compressor ID format")

    from src.agents.investigation_agent import run_investigation
    try:
        report = await run_investigation(
            compressor_id=request.compressor_id,
            trigger_type=request.trigger_type,
            trigger_id=request.trigger_id,
        )
        return report.model_dump()
    except Exception as e:
        logger.error(f"Investigation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/investigations/{investigation_id}")
async def get_investigation(investigation_id: str):
    """Get an investigation report by ID."""
    from src.agents.shared.db_tools import query_db, _serialize_rows
    rows = query_db(
        "SELECT * FROM investigation_reports WHERE investigation_id = %s",
        [investigation_id]
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return _serialize_rows(rows)[0]


@app.get("/investigations")
async def list_investigations(
    organization_id: Optional[str] = None,
    compressor_id: Optional[str] = None,
    limit: int = Query(default=20, le=100),
):
    """List investigation reports."""
    from src.agents.shared.db_tools import query_db, _serialize_rows

    if not organization_id:
        org_rows = query_db("SELECT id FROM organizations WHERE slug = 'altaviz-demo' LIMIT 1", [])
        organization_id = str(org_rows[0]['id']) if org_rows else None

    conditions = ["organization_id = %s"]
    params = [organization_id]
    if compressor_id:
        conditions.append("compressor_id = %s")
        params.append(compressor_id)
    params.append(limit)

    rows = query_db(
        f"""SELECT investigation_id, compressor_id, root_cause, failure_mode,
                   severity, confidence, created_at
            FROM investigation_reports
            WHERE {' AND '.join(conditions)}
            ORDER BY created_at DESC LIMIT %s""",
        params
    )
    return _serialize_rows(rows)


@app.post("/investigations/{investigation_id}/feedback")
async def submit_investigation_feedback(investigation_id: str, request: InvestigationFeedbackRequest):
    """Submit technician feedback on an investigation."""
    from src.agents.investigation_agent import submit_feedback
    from src.agents.shared.models import InvestigationFeedback

    feedback = InvestigationFeedback(
        investigation_id=investigation_id,
        feedback_rating=request.feedback_rating,
        was_correct=request.was_correct,
        technician_feedback=request.technician_feedback,
        actual_root_cause=request.actual_root_cause,
    )
    result = await submit_feedback(feedback)
    if 'error' in result:
        raise HTTPException(status_code=500, detail=result['error'])
    return result


# ============================================================================
# WORK ORDER AGENT (Use Case 1)
# ============================================================================

@app.post("/work-orders/create")
@observe(name="work-order-create")
async def create_work_order(request: WorkOrderCreateRequest):
    """Create a work order using the AI agent."""
    if not COMPRESSOR_ID_PATTERN.match(request.compressor_id):
        raise HTTPException(status_code=400, detail="Invalid compressor ID format")

    from src.agents.work_order_agent import create_work_order as create_wo
    try:
        result = await create_wo(
            compressor_id=request.compressor_id,
            source_type=request.source_type,
            source_id=request.source_id,
            context=request.context,
        )
        return result
    except Exception as e:
        logger.error(f"Work order creation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/work-orders/{work_order_id}")
async def get_work_order_detail(work_order_id: str):
    """Get a work order with its transition timeline."""
    from src.agents.work_order_agent import get_work_order
    wo = get_work_order(work_order_id)
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")
    return wo


@app.get("/work-orders")
async def list_work_orders_endpoint(
    organization_id: Optional[str] = None,
    status: Optional[str] = None,
    compressor_id: Optional[str] = None,
    limit: int = Query(default=50, le=200),
):
    """List work orders with filters."""
    from src.agents.work_order_agent import list_work_orders
    from src.agents.shared.db_tools import query_db

    if not organization_id:
        org_rows = query_db("SELECT id FROM organizations WHERE slug = 'altaviz-demo' LIMIT 1", [])
        organization_id = str(org_rows[0]['id']) if org_rows else ''

    return list_work_orders(organization_id, status=status, compressor_id=compressor_id, limit=limit)


@app.post("/work-orders/{work_order_id}/transition")
async def transition_work_order_endpoint(work_order_id: str, request: WorkOrderTransitionRequest):
    """Transition a work order to a new status (approve, reject, assign, complete, etc.)."""
    from src.agents.work_order_state_machine import transition_work_order, InvalidTransitionError

    try:
        result = transition_work_order(
            work_order_id=work_order_id,
            to_status=request.to_status,
            reason=request.reason,
            assigned_to=request.assigned_to,
            approved_by=request.approved_by,
            actual_hours=request.actual_hours,
            actual_cost=request.actual_cost,
            completion_notes=request.completion_notes,
            parts_replaced=request.parts_replaced,
        )
        return result
    except InvalidTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# FLEET OPTIMIZATION COPILOT (Use Case 3)
# ============================================================================

@app.post("/optimization/scan")
@observe(name="fleet-scan")
async def run_fleet_scan(request: FleetScanRequest):
    """Trigger a fleet optimization scan."""
    from src.agents.optimization_agent import run_fleet_scan as scan
    try:
        result = await scan(
            organization_id=request.organization_id,
            scan_type=request.scan_type,
        )
        return result.model_dump()
    except Exception as e:
        logger.error(f"Fleet scan failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/optimization/what-if")
async def run_what_if(request: WhatIfRequest):
    """Run a what-if scenario simulation."""
    from src.agents import simulator

    try:
        if request.scenario_type == 'maintenance_defer':
            if not request.compressor_id or not request.defer_days:
                raise HTTPException(status_code=400, detail="compressor_id and defer_days required")
            result = simulator.run_maintenance_deferral(request.compressor_id, request.defer_days)
        elif request.scenario_type == 'load_balance':
            if not request.station_id:
                raise HTTPException(status_code=400, detail="station_id required")
            org_id = request.organization_id or ''
            result = simulator.run_load_balance_simulation(request.station_id, org_id)
        else:
            raise HTTPException(status_code=400, detail=f"Unknown scenario type: {request.scenario_type}")

        return json.loads(result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/optimization/recommendations")
async def list_recommendations(
    organization_id: Optional[str] = None,
    status: Optional[str] = None,
    rec_type: Optional[str] = None,
    limit: int = Query(default=20, le=100),
):
    """List optimization recommendations."""
    from src.agents.optimization_agent import list_recommendations as list_recs
    from src.agents.shared.db_tools import query_db

    if not organization_id:
        org_rows = query_db("SELECT id FROM organizations WHERE slug = 'altaviz-demo' LIMIT 1", [])
        organization_id = str(org_rows[0]['id']) if org_rows else ''

    return list_recs(organization_id, status=status, rec_type=rec_type, limit=limit)


@app.post("/optimization/chat")
@observe(name="optimization-chat")
async def optimization_chat(request: ChatRequest):
    """Conversational interface for fleet optimization questions."""
    from src.agents.optimization_agent import chat

    try:
        response = await chat(
            message=request.message,
            organization_id=request.organization_id,
            conversation_history=request.conversation_history,
        )
        return {"response": response}
    except Exception as e:
        logger.error(f"Chat failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# CLOSED-LOOP WORKFLOW (LangGraph)
# ============================================================================

class ClosedLoopRequest(BaseModel):
    compressor_id: str
    trigger: str = "manual"
    trigger_id: Optional[str] = None
    organization_id: Optional[str] = None


# ===========================================================================
# PATTERN: Closed-Loop Multi-Agent Orchestration (LangGraph)
# WHY: This endpoint chains all 4 agents in sequence:
#   optimization (detect) → investigation (diagnose) → work order (plan) → knowledge (learn)
#   LangGraph provides durable execution so if the work order step fails,
#   the investigation results are not lost and can be retried.
# SCALING: At fleet scale, this runs autonomously for each flagged compressor.
#   The optimization agent triggers investigations which trigger work orders
#   in a continuous feedback loop — no human needed for routine issues.
# ALTERNATIVE: Simple sequential async calls would work but lack retry/resume
#   capability if one step fails partway through.
# ===========================================================================
@app.post("/workflows/closed-loop")
@observe(name="closed-loop-workflow")
async def run_closed_loop_workflow(request: ClosedLoopRequest):
    """Run the full closed-loop workflow: investigate → work order → approval → knowledge.

    Uses LangGraph for durable execution and state management.
    """
    if not COMPRESSOR_ID_PATTERN.match(request.compressor_id):
        raise HTTPException(status_code=400, detail="Invalid compressor ID format")

    try:
        # Lazy import with graceful fallback — LangGraph is an optional dependency.
        # If not installed, the endpoint returns 501 (Not Implemented) instead of 500.
        from src.agents.graph.workflow import run_closed_loop
        result = await run_closed_loop(
            compressor_id=request.compressor_id,
            trigger=request.trigger,
            organization_id=request.organization_id,
            trigger_id=request.trigger_id,
        )
        return result
    except ImportError:
        raise HTTPException(
            status_code=501,
            detail="LangGraph not installed. Install with: pip install langgraph",
        )
    except Exception as e:
        logger.error(f"Closed-loop workflow failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# SHARED: AGENT SESSIONS
# ============================================================================

@app.get("/sessions")
async def list_agent_sessions(
    organization_id: Optional[str] = None,
    agent_type: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(default=20, le=100),
):
    """List agent sessions across all agent types."""
    from src.agents.shared.memory import list_sessions
    from src.agents.shared.db_tools import query_db

    if not organization_id:
        org_rows = query_db("SELECT id FROM organizations WHERE slug = 'altaviz-demo' LIMIT 1", [])
        organization_id = str(org_rows[0]['id']) if org_rows else ''

    return list_sessions(organization_id, agent_type=agent_type, status=status, limit=limit)


@app.get("/sessions/{session_id}")
async def get_session_detail(session_id: str):
    """Get a specific agent session with conversation history."""
    from src.agents.shared.memory import get_session
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


# ============================================================================
# KNOWLEDGE BASE
# ============================================================================

@app.get("/knowledge-base")
async def list_knowledge_docs(
    organization_id: Optional[str] = None,
    doc_type: Optional[str] = None,
    limit: int = Query(default=50, le=200),
):
    """List knowledge base documents."""
    from src.agents.shared.db_tools import query_db, _serialize_rows

    if not organization_id:
        org_rows = query_db("SELECT id FROM organizations WHERE slug = 'altaviz-demo' LIMIT 1", [])
        organization_id = str(org_rows[0]['id']) if org_rows else ''

    conditions = ["organization_id = %s"]
    params = [organization_id]
    if doc_type:
        conditions.append("doc_type = %s")
        params.append(doc_type)
    params.append(limit)

    rows = query_db(
        f"""SELECT doc_id, doc_type, title, compressor_models, failure_modes,
                   components, version, created_at
            FROM knowledge_base
            WHERE {' AND '.join(conditions)}
            ORDER BY created_at DESC LIMIT %s""",
        params
    )
    return _serialize_rows(rows)


# ============================================================================
# HEALTH CHECK
# ============================================================================

@app.get("/health")
async def health():
    """Health check for the agent API."""
    return {
        "status": "healthy",
        "model": os.environ.get("DIAGNOSTICS_MODEL", "openai:gpt-4o-mini"),
        "service": "altaviz-agent-api",
        "version": "2.0.0",
        "agents": ["diagnostics", "investigation", "work_order", "optimization"],
        "tracing": "langfuse" if is_tracing_enabled() else "disabled",
    }
