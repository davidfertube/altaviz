# Altaviz System Architecture

## Overview

Altaviz is a production-grade data engineering platform for compressor fleet integrity management, built for Archrock-scale operations (4,700+ compressors, 10 basins, 200+ stations). The system combines real-time telemetry processing, ML-powered predictive maintenance, and autonomous AI agents in a closed-loop maintenance workflow.

## System Diagram

```
                    ALTAVIZ PRODUCTION ARCHITECTURE

    ┌─────────────────────────────────────────────────────────────┐
    │  IoT Layer                                                   │
    │  4,700 compressors × 5-min readings = 1.35M rows/day       │
    │  Detechtion/Enbase edge devices → MQTT/HTTPS                │
    └───────────────────────┬─────────────────────────────────────┘
                            ↓
    ┌─────────────────────────────────────────────────────────────┐
    │  Ingestion Layer                                             │
    │  Azure Event Hubs (16 partitions, by basin)                 │
    │  Schema Registry (Avro validation, dead-letter routing)     │
    │  Spark Structured Streaming (5-min micro-batch)             │
    └───────────────────────┬─────────────────────────────────────┘
                            ↓
    ┌─────────────────────────────────────────────────────────────┐
    │  Data Lake (Medallion Architecture on OneLake)               │
    │                                                              │
    │  BRONZE ──→ SILVER ──→ GOLD ──→ ML SERVING                  │
    │  Raw data   Cleaned    Aggregated  Predictions               │
    │  Immutable  Deduped    1hr/4hr/24hr Anomaly/Drift/RUL       │
    │  7yr retain 4-sigma    Thresholds  Feature Store             │
    │                                                              │
    │  Format: Delta Lake (ACID, time travel, MERGE)              │
    │  Partition: date + region | Z-order: compressor_id          │
    └───────────────────────┬─────────────────────────────────────┘
                            ↓
    ┌─────────────────────────────────────────────────────────────┐
    │  ML Layer                                                    │
    │                                                              │
    │  Anomaly Detection ─── Isolation Forest (scikit-learn)       │
    │  Temperature Drift ─── Linear Regression (scipy)            │
    │  Emissions ─────────── EPA Subpart W (regulatory factors)   │
    │  RUL Prediction ────── Heuristic (rule-based baseline)      │
    │                                                              │
    │  Lifecycle: Feature Store → MLflow → Azure ML Registry      │
    │  Serving: Batch predictor (daily) + Azure Functions (API)   │
    └───────────────────────┬─────────────────────────────────────┘
                            ↓
    ┌─────────────────────────────────────────────────────────────┐
    │  AI Agent Layer (Pydantic AI + LangGraph)                    │
    │                                                              │
    │  ┌──────────┐  ┌──────────────┐  ┌───────────┐  ┌────────┐│
    │  │Diagnostics│→│Investigation │→│Work Order │→│Knowledge││
    │  │ 5 tools   │  │ 12 tools+RAG │  │10 tools   │  │  Base  ││
    │  └──────────┘  └──────────────┘  └───────────┘  └────┬───┘│
    │       ↑              ↑                ↑              │     │
    │       │         Langfuse Tracing      │              │     │
    │       │         DeepEval Quality      │              │     │
    │       └───────────────────────────────┘──────────────┘     │
    │                  LangGraph Orchestration                     │
    │                  (closed-loop, HITL, durable execution)     │
    │                                                              │
    │  API: FastAPI sidecar (port 8001)                           │
    │  Search: pgvector (default) or Azure AI Search (hybrid)     │
    │  LLM: OpenAI or Azure OpenAI (configurable)                │
    └───────────────────────┬─────────────────────────────────────┘
                            ↓
    ┌─────────────────────────────────────────────────────────────┐
    │  Frontend (Next.js 16 + React 19)                            │
    │                                                              │
    │  Dashboard ── Fleet health, alerts, monitoring               │
    │  Agents ───── Investigation, work orders, optimization      │
    │  Marketing ── Landing page, pricing, about                  │
    │                                                              │
    │  Auth: NextAuth.js v5 | Billing: Stripe | RBAC: 4 roles    │
    │  Deploy: Azure Container Apps + ACR                         │
    └─────────────────────────────────────────────────────────────┘
```

## Technology Choices

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Agent framework | Pydantic AI | Type-safe structured outputs, simpler than LangGraph for individual agents |
| Orchestration | LangGraph | Durable execution, built-in HITL, state persistence for multi-agent flows |
| Data processing | PySpark + Delta Lake | Distributed processing for 1.35M rows/day, ACID transactions, time travel |
| Storage | Azure Fabric / OneLake | Unified lakehouse, DirectLake mode for Power BI, managed Spark |
| RAG search | pgvector + Azure AI Search | pgvector for zero-infra dev; Azure AI Search for production hybrid search |
| LLM provider | Azure OpenAI | Enterprise compliance, managed endpoints, same models as OpenAI |
| Observability | Langfuse | Open-source, self-hostable, framework-agnostic LLM tracing |
| Evaluation | DeepEval | pytest-native, 50+ metrics, RAGAS built-in, CI quality gates |
| ML tracking | MLflow + Azure ML | Industry standard, Azure ML includes managed MLflow |
| Frontend | Next.js 16 + React 19 | App Router, server components, TypeScript, Vercel deployment |
| IaC | Terraform | Multi-cloud capable, Azure provider mature, state management |

## Data Flow

```
Compressor Sensors (5-min intervals)
    → Event Hubs (Avro serialized, partitioned by basin)
    → Bronze (raw, immutable, 7-year EPA retention)
    → Silver (deduped, validated, 4-sigma outlier removal)
    → Gold (1hr/4hr/24hr aggregations, threshold flags)
    → ML Serving (anomaly scores, RUL predictions, emissions)
    → Dashboard (SWR hooks, 30s refresh) + Agents (on-demand)
```

## Security Architecture

- **Authentication**: NextAuth.js v5 (email/password, OAuth)
- **Authorization**: 4 roles (owner, admin, operator, viewer) with org-scoped data isolation
- **Secrets**: Azure Key Vault (production), .env files (development)
- **API Security**: Rate limiting (60 req/min), CSP headers, input validation, timing-safe auth
- **Data**: Row-level security via organization_id on all queries
- **Audit**: Transition logs for work orders, session tracking for agents

## Scaling Considerations

| Metric | Demo | Production |
|--------|------|-----------|
| Compressors | 10 | 4,700 |
| Readings/day | 14,400 | 1,353,600 |
| Gold rows/day | 240 | 112,800 |
| ML predictions/run | 40 | 18,800 |
| Agent sessions/day | ~5 | ~200 |
| Storage/day | ~3 MB | ~270 MB |
