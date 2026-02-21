"""
Diagnostics Agent API

FastAPI sidecar that exposes the Pydantic AI diagnostics agent
as a REST endpoint. Run alongside the Next.js frontend.

Usage:
    uvicorn src.agents.api:app --port 8001

Endpoints:
    POST /diagnose  - Run diagnostics for a compressor
    GET  /health    - Health check

Author: David Fernandez
"""

import os
import re
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from src.agents.diagnostics_agent import diagnose_compressor, DiagnosticReport

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

COMPRESSOR_ID_PATTERN = re.compile(r'^COMP-\d{3}$')


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Diagnostics Agent API starting...")
    model = os.environ.get('DIAGNOSTICS_MODEL', 'openai:gpt-4o-mini')
    logger.info(f"Using model: {model}")
    yield
    logger.info("Diagnostics Agent API shutting down...")


app = FastAPI(
    title="Altaviz Diagnostics Agent",
    description="AI-powered compressor diagnostics using Pydantic AI",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        os.environ.get("NEXTAUTH_URL", "https://altaviz.vercel.app"),
    ],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


class DiagnoseRequest(BaseModel):
    compressor_id: str = Field(description="Compressor ID (e.g., COMP-003)")


@app.post("/diagnose", response_model=DiagnosticReport)
async def diagnose(request: DiagnoseRequest):
    """Run AI diagnostics for a specific compressor."""
    if not COMPRESSOR_ID_PATTERN.match(request.compressor_id):
        raise HTTPException(status_code=400, detail="Invalid compressor ID format. Expected COMP-XXX")

    try:
        report = await diagnose_compressor(request.compressor_id)
        return report
    except Exception as e:
        logger.error(f"Diagnosis failed for {request.compressor_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Diagnosis failed: {str(e)}")


@app.get("/health")
async def health():
    """Health check for the diagnostics agent."""
    return {
        "status": "healthy",
        "model": os.environ.get("DIAGNOSTICS_MODEL", "openai:gpt-4o-mini"),
        "service": "diagnostics-agent",
    }
