# Altaviz Study Guide — File-by-File Learning Path

> Your curriculum for mastering every piece of Altaviz before Day 1 at Archrock.
> Estimated time: 2-3 weeks at 4-6 hours/day.
> Every file has comprehensive learning comments explaining WHY each decision was made.

---

## How to Use This Guide

1. Read files in the order listed (they build on each other)
2. After reading each file, run the associated command to see it in action
3. Check the "You should now understand" boxes before moving on
4. The comment blocks in each file use this format:
   ```
   # PATTERN: [Design pattern name]
   # WHY: [Why this approach was chosen]
   # SCALING: [How it behaves at 4,700 compressors]
   # ALTERNATIVE: [What else could have been used]
   ```

---

## Week 1: Foundation + Data Pipeline

### Day 1: Business Context & Architecture

| # | File | Lines | What You'll Learn |
|---|------|-------|-------------------|
| 1 | `docs/prepare.md` | 880 | Archrock's business ($1.49B revenue, 4.7M HP fleet), your role, KPIs, 90-day blueprint, team dynamics |
| 2 | `docs/architecture.md` | 126 | System diagram, technology choices, data flow, security architecture |
| 3 | `CLAUDE.md` | 410 | Critical rules, key commands, environment variables, file reference |
| 4 | `config/thresholds.yaml` | 223 | Sensor ranges (vibration: normal <4.5, warning >6.0, critical >8.0), station locations, alert rules |
| 5 | `config/etl_config.yaml` | 139 | Window sizes (1hr/4hr/24hr), quality thresholds (4-sigma, 5% missing rate), Spark tuning |
| 6 | `config/fabric_config.yaml` | 153 | OneLake paths (ABFS protocol), Event Hubs (16 partitions), Fabric workspace config |

**Try it:**
```bash
# Read the config files
cat config/thresholds.yaml | head -50
cat config/etl_config.yaml | head -30
```

**You should now understand:**
- [ ] Why fleet utilization (95%+) is the #1 KPI
- [ ] What the Bronze → Silver → Gold → ML pipeline does
- [ ] What sensors exist on a compressor (vibration, temp, pressure, HP, flow)
- [ ] Why Archrock needs predictive maintenance

---

### Day 2: Data Contracts & Simulation

| # | File | Lines | What You'll Learn |
|---|------|-------|-------------------|
| 7 | `src/etl/schemas.py` | 438 | Explicit PySpark StructType schemas (why 10-100x faster than inferSchema) |
| 8 | `src/data_simulator/compressor_profiles.py` | 360 | 7 compressor models (Ajax, Ariel, Caterpillar), 10 basins, station distribution |
| 9 | `src/data_simulator/failure_scenarios.py` | 351 | 6 failure modes: bearing wear (exponential vibration), cooling degradation (linear temp), valve failure (pressure oscillations), ring wear (flow loss), packing leak (emissions), fouling (temp spikes) |
| 10 | `src/data_simulator/fleet_simulator.py` | 545 | Batch generation for memory management, failure injection, Parquet output |

**Try it:**
```bash
# Generate 100 compressors, 1 day of data
python3 -m src.data_simulator.fleet_simulator --compressors 100 --days 1

# Check the output
ls data/raw/
```

**You should now understand:**
- [ ] What a sensor reading looks like (schema fields and their physical meaning)
- [ ] The 6 failure modes and how each manifests in sensor data
- [ ] Why ~5% of fleet is degrading and ~1% is critical at any time
- [ ] Why explicit schemas matter (type safety, performance, evolution)

---

### Day 3: ETL Pipeline — Bronze & Silver

| # | File | Lines | What You'll Learn |
|---|------|-------|-------------------|
| 11 | `src/etl/utils.py` | 474 | Config loading with env var substitution, Spark session creation, logging setup |
| 12 | `src/etl/onelake.py` | 438 | ABFS protocol for OneLake, Fabric auto-detection, local fallback, Delta MERGE upserts, OPTIMIZE + ZORDER |
| 13 | `src/etl/pipeline.py` | 443 | Template Method Pattern — fixed Bronze→Silver→Gold→ML order, each stage is idempotent |
| 14 | `src/etl/bronze/ingest.py` | 225 | Immutability principle — raw data is NEVER modified, only appended. Ingestion metadata for lineage |
| 15 | `src/etl/silver/cleanse.py` | 360 | 5-step cleaning: dedup (composite key), null handling, 4-sigma outlier removal, type casting, validation |
| 16 | `src/etl/silver/quality.py` | 405 | 5 quality checks: fleet completeness (85%), freshness (15-min SLA), sensor completeness (95%), volume, pressure consistency |

**Try it:**
```bash
# Run the full pipeline on simulated data
python3 -m src.etl.pipeline

# Or run individual stages
python3 -m src.etl.pipeline --stage bronze
python3 -m src.etl.pipeline --stage silver
```

**You should now understand:**
- [ ] Why Bronze is immutable (recovery point if Silver has bugs)
- [ ] Why 4-sigma for outlier removal (not 3-sigma: compressor data has fat tails from failure modes)
- [ ] Why each stage is idempotent (safe to re-run on failure)
- [ ] What ABFS protocol is and how OneLake stores data
- [ ] What a quality check report looks like

---

### Day 4: ETL Pipeline — Gold Layer & Ingestion

| # | File | Lines | What You'll Learn |
|---|------|-------|-------------------|
| 17 | `src/etl/gold/aggregate.py` | 455 | Multi-window aggregation (1hr for dashboards, 4hr for trends, 24hr for reports), threshold status flags, fleet health summary |
| 18 | `src/ingestion/schema_registry.py` | 200 | Avro schema validation at ingestion boundary, dead-letter routing for bad messages |
| 19 | `src/ingestion/event_hub_producer.py` | 244 | Basin-to-partition mapping (10 basins → 16 Event Hub partitions), throughput math (16 msg/sec) |
| 20 | `src/ingestion/event_hub_consumer.py` | 391 | Spark Structured Streaming, 4-hour watermark (satellite uplink delays), 5-min micro-batch trigger |

**You should now understand:**
- [ ] Why Gold pre-computes 1hr/4hr/24hr aggregations (avoid expensive GROUP BY at dashboard query time)
- [ ] Why partition by date + region, Z-order by compressor_id
- [ ] How Event Hubs partitions map to basins (data locality)
- [ ] What exactly-once semantics means (checkpoint + watermark)
- [ ] What dead-letter routing does with malformed messages

---

### Day 5: Monitoring & Testing Basics

| # | File | Lines | What You'll Learn |
|---|------|-------|-------------------|
| 21 | `src/monitoring/metrics.py` | 364 | PipelineMonitor context manager, Azure Monitor integration, Teams webhook alerts |
| 22 | `tests/test_schemas.py` | 61 | Schema validation tests |
| 23 | `tests/integration/test_onelake_connectivity.py` | 154 | End-to-end pipeline test: raw → Bronze → Silver → Gold |
| 24 | `tests/load/test_fleet_scale.py` | 129 | Fleet simulator at 4,700 scale, validate Parquet output |

**Try it:**
```bash
# Run unit tests (fast, no dependencies)
pytest tests/unit/ -v

# Run schema tests
pytest tests/test_schemas.py -v
```

**You should now understand:**
- [ ] How the PipelineMonitor tracks stage durations and row counts
- [ ] How to write tests for PySpark transformations
- [ ] How to test at fleet scale (4,700 compressors)

---

## Week 2: Machine Learning + AI Agents

### Day 6: ML Models

| # | File | Lines | What You'll Learn |
|---|------|-------|-------------------|
| 25 | `src/ml/feature_store/store.py` | 267 | Feature Store Pattern — compute once, serve consistently for training and inference. 5 feature sets, drift monitoring |
| 26 | `src/ml/anomaly_detector.py` | 354 | Isolation Forest — why over LOF/DBSCAN/Autoencoders (no labeled anomaly data). contamination=0.05 (5% of fleet degrading) |
| 27 | `src/ml/temp_drift_predictor.py` | 373 | Linear regression for temperature drift — why linear (physics of cooling degradation). Hours-to-threshold extrapolation |
| 28 | `src/ml/emissions_estimator.py` | 412 | EPA Subpart W (40 CFR Part 98) — emission factors, CH4 GWP=28 (IPCC AR5), OOOOb compliance |
| 29 | `src/ml/rul_predictor.py` | 324 | Heuristic RUL — every magic number explained. Why heuristic over LSTM (insufficient labeled failure-to-end-of-life data) |

**Try it:**
```bash
# Run ML model tests
pytest tests/test_anomaly_detector.py -v
pytest tests/test_temp_drift_predictor.py -v
pytest tests/test_emissions_estimator.py -v
pytest tests/test_rul_predictor.py -v
```

**You should now understand:**
- [ ] Why Isolation Forest for anomaly detection (unsupervised, works with mixed features)
- [ ] Why linear regression for temperature drift (matches the physics)
- [ ] What EPA Subpart W requires and how emissions are calculated
- [ ] Why RUL uses heuristics (and the upgrade path to LSTM when enough data exists)
- [ ] What a Feature Store is and why it prevents training-serving skew

---

### Day 7: ML Serving & MLOps

| # | File | Lines | What You'll Learn |
|---|------|-------|-------------------|
| 30 | `src/ml/serving/batch_predictor.py` | 431 | Parallel batch inference for 4,700 compressors (ThreadPoolExecutor, 15 min target) |
| 31 | `src/ml/serving/model_registry.py` | 275 | MLflow lifecycle — Factory Pattern for tracking URI (local → Azure ML → remote MLflow). Staging → Production promotion |

**You should now understand:**
- [ ] How to score 4,700 compressors in parallel with 4 models
- [ ] What MLflow model registry stages mean (None → Staging → Production → Archived)
- [ ] How to roll back a bad model version
- [ ] How Azure ML integrates with MLflow

---

### Day 8: Agent Infrastructure

| # | File | Lines | What You'll Learn |
|---|------|-------|-------------------|
| 32 | `src/agents/shared/models.py` | 209 | Pydantic models: DiagnosticReport, InvestigationReport, WorkOrderPlan, FleetScanResult — typed structured outputs |
| 33 | `src/agents/shared/db_tools.py` | 307 | Repository Pattern — 7 centralized query functions. Parameterized SQL, connection management |
| 34 | `src/agents/shared/guardrails.py` | 215 | Python-level guardrails (not LLM-level): confidence > 0.6, cost < $10K, rate limits, tier enforcement |
| 35 | `src/agents/shared/id_generator.py` | 107 | Sequential IDs: WO-2026-00001 — human-readable, sortable, collision-free |
| 36 | `src/agents/shared/memory.py` | 192 | Session lifecycle: create → append messages → complete. JSONB for flexible message storage |
| 37 | `src/agents/shared/tracing.py` | 257 | Langfuse observability — Singleton client, @observe decorator, graceful no-op when unconfigured |

**Try it:**
```bash
# Run guardrail tests
pytest tests/unit/test_guardrails.py -v
pytest tests/unit/test_models.py -v
pytest tests/unit/test_id_generator.py -v
```

**You should now understand:**
- [ ] Why guardrails are Python functions, not LLM prompts (deterministic, auditable, testable)
- [ ] Why $10K cost threshold, 4hr shutdown threshold, 0.6 confidence threshold
- [ ] How Langfuse traces agent calls without changing agent logic
- [ ] What the Repository Pattern gives you (centralized queries, easy to test)

---

### Day 9: The 4 AI Agents

| # | File | Lines | What You'll Learn |
|---|------|-------|-------------------|
| 38 | `src/agents/diagnostics_agent.py` | 152 | 5 tools, quick triage. When to use: first response to an alert |
| 39 | `src/agents/investigation_agent.py` | 604 | 12 tools, RAG search, 7-step methodology. When to use: deep root cause analysis |
| 40 | `src/agents/work_order_agent.py` | 474 | 10 tools, 9-state machine, HITL approval. When to use: create maintenance plan |
| 41 | `src/agents/optimization_agent.py` | 419 | 11 tools, fleet scan, what-if simulation. When to use: proactive fleet optimization |

**Try it:**
```bash
# Start the agent API
uvicorn src.agents.api:app --port 8001 &

# Run a diagnosis (requires OPENAI_API_KEY or AZURE_OPENAI_ENDPOINT)
python3 -m src.agents.run_diagnosis COMP-0003

# Or via API
curl -X POST http://localhost:8001/diagnose \
  -H "Content-Type: application/json" \
  -d '{"compressor_id": "COMP-0003"}'
```

**You should now understand:**
- [ ] The difference between diagnostics (quick, 5 tools) and investigation (deep, 12 tools + RAG)
- [ ] How Pydantic AI enforces structured output via `result_type=InvestigationReport`
- [ ] How tools are registered with `@agent.tool_plain` decorator
- [ ] The 7-step investigation methodology (hypothesize → gather → search → cross-reference → eliminate → conclude → recommend)
- [ ] Why work order approval is required for emergency, >$10K, or >4hr shutdown

---

### Day 10: Knowledge Base, Search & State Machine

| # | File | Lines | What You'll Learn |
|---|------|-------|-------------------|
| 42 | `src/agents/knowledge_base.py` | 341 | RAG with pgvector — Factory Pattern for Azure/OpenAI client, cosine similarity search, learned lessons feedback loop |
| 43 | `src/agents/search_backend.py` | 290 | Strategy Pattern — pluggable pgvector (default) or Azure AI Search (hybrid: vector + BM25 + semantic) |
| 44 | `src/agents/work_order_state_machine.py` | ~150 | State Machine Pattern — 9 states (draft → verified), transition validation, audit trail |
| 45 | `src/agents/fleet_scanner.py` | 290 | Risk scoring: alerts×20 + status×25 + ML×100 (ML predictions weighted highest as leading indicators) |
| 46 | `src/agents/simulator.py` | 275 | What-if engine: maintenance deferral cost ($25K/day × failure probability), load balancing simulation |

**Try it:**
```bash
# Test the state machine
pytest tests/unit/test_state_machine.py -v
```

**You should now understand:**
- [ ] How RAG works end-to-end (query → embed → cosine similarity → top-K docs → agent cites them)
- [ ] Why the feedback loop matters (technician corrects diagnosis → learned lesson → better future investigations)
- [ ] Why the state machine uses Python enforcement, not LLM (can't be prompt-injected)
- [ ] How risk scoring weights are chosen (ML predictions are leading, alerts are lagging)

---

## Week 3: Orchestration, Azure, and Operations

### Day 11: LangGraph Orchestration

| # | File | Lines | What You'll Learn |
|---|------|-------|-------------------|
| 47 | `src/agents/graph/state.py` | 108 | TypedDict state schema — why TypedDict (LangGraph requires it), total=False for progressive accumulation |
| 48 | `src/agents/graph/nodes.py` | 279 | Adapter Pattern — wraps Pydantic AI agents as LangGraph nodes. Error propagation via state, not exceptions |
| 49 | `src/agents/graph/workflow.py` | 257 | Closed-loop graph: investigate → work order → [approval?] → knowledge update. MemorySaver for checkpointing |
| 50 | `src/agents/api.py` | 606 | FastAPI sidecar — all endpoints, CORS, lazy imports, @observe decorators, health check |

**Try it:**
```bash
# Run the closed-loop workflow
curl -X POST http://localhost:8001/workflows/closed-loop \
  -H "Content-Type: application/json" \
  -d '{"compressor_id": "COMP-0003", "trigger": "alert"}'
```

**You should now understand:**
- [ ] Why LangGraph for orchestration + Pydantic AI for agent logic (separation of concerns)
- [ ] How conditional routing works (skip approval for low-risk work orders)
- [ ] What durable execution means (resume after crash via checkpointing)
- [ ] How HITL approval gates pause the workflow

---

### Day 12: Agent Evaluation & Quality Gates

| # | File | Lines | What You'll Learn |
|---|------|-------|-------------------|
| 51 | `tests/eval/conftest.py` | 154 | DeepEval fixtures — sample sensor data, context documents, expected outputs |
| 52 | `tests/eval/test_investigation_quality.py` | 227 | Faithfulness (≥0.7), hallucination (≥0.8), answer relevancy, context relevancy |
| 53 | `tests/eval/test_work_order_quality.py` | 185 | HITL trigger accuracy, cost estimate bounds, priority assignment |
| 54 | `tests/eval/test_rag_quality.py` | 165 | Context precision, context recall, RAG faithfulness |

**Try it:**
```bash
# Run evaluation tests (requires OPENAI_API_KEY)
pytest tests/eval/ -v --tb=short

# Or run specific evaluation
pytest tests/eval/test_investigation_quality.py -v
```

**You should now understand:**
- [ ] What faithfulness means (agent's answer is grounded in retrieved evidence)
- [ ] What hallucination detection catches (agent invents sensor readings or citations)
- [ ] Why RAG thresholds are lower (0.6) than generation thresholds (0.7) — retrieval is noisier
- [ ] How to add new eval tests when you discover a failure pattern

---

### Day 13: Architecture Decisions & Azure Integration

| # | File | Lines | What You'll Learn |
|---|------|-------|-------------------|
| 55 | `docs/decisions/001-pydantic-ai-over-langgraph.md` | 37 | Why two frameworks, not one |
| 56 | `docs/decisions/002-pgvector-with-azure-search-fallback.md` | 43 | Strategy Pattern for search backends |
| 57 | `docs/decisions/003-medallion-architecture.md` | 55 | Why Bronze/Silver/Gold on Delta Lake |
| 58 | `config/azure_ai.yaml` | 30 | Azure OpenAI, AI Search, Azure ML configuration |
| 59 | `infrastructure/terraform/ai_services.tf` | ~60 | Azure OpenAI + AI Search Terraform |
| 60 | `infrastructure/terraform/ml_workspace.tf` | ~25 | Azure ML workspace dependencies |
| 61 | `infrastructure/terraform/functions.tf` | ~45 | Azure Functions consumption plan |
| 62 | `infrastructure/terraform/purview.tf` | ~15 | Microsoft Purview data governance |
| 63 | `infrastructure/terraform/main.tf` | ~230 | Event Hubs, Key Vault, Storage, monitoring |

**Try it:**
```bash
# Validate Terraform
cd infrastructure/terraform && terraform validate

# Preview Azure changes
cd infrastructure/terraform && terraform plan -var-file=envs/staging.tfvars
```

**You should now understand:**
- [ ] Why each Azure service was chosen and its free-tier limits
- [ ] How Terraform manages Azure infrastructure as code
- [ ] What Managed Identity is and why it replaces API keys in production
- [ ] The monthly cost estimate (~$10-15/month for dev)

---

### Day 14: Operational Mastery

| # | File | Lines | What You'll Learn |
|---|------|-------|-------------------|
| 64 | `docs/integration.md` | 3,078 | Step-by-step Azure integration (9 phases, CLI commands, cost estimates) |
| 65 | `docs/todo.md` | 415 | Checklist version of integration.md with checkboxes |
| 66 | `docs/runbooks/pipeline-failure.md` | 62 | How to diagnose and recover from ETL failures |
| 67 | `docs/runbooks/model-retraining.md` | 102 | When and how to retrain ML models, promote Staging → Production |
| 68 | `docs/runbooks/agent-debugging.md` | 96 | Check Langfuse traces, run DeepEval, test agents locally |
| 69 | `.claude/rules/python-patterns.md` | 41 | PySpark anti-patterns, design patterns used |
| 70 | `.claude/rules/security.md` | 29 | Never hardcode, parameterized queries, rate limits |
| 71 | `.claude/rules/testing.md` | 35 | Test structure and commands |

**You should now understand:**
- [ ] How to recover from a pipeline failure at 2am
- [ ] How to retrain a model and promote it safely
- [ ] How to debug an agent that's giving bad results
- [ ] The full Azure integration roadmap (week by week)

---

## Appendix A: Design Patterns Cheat Sheet

| Pattern | Where Used | Why |
|---------|-----------|-----|
| **Factory** | `knowledge_base._get_openai_client()` | Switch Azure/OpenAI without code changes |
| **Strategy** | `search_backend.get_search_backend()` | Pluggable pgvector ↔ Azure AI Search |
| **Singleton** | `tracing._langfuse_client` | One Langfuse client per process |
| **State Machine** | `work_order_state_machine.py` | 9-state lifecycle with audit trail |
| **Repository** | `shared/db_tools.py` | Centralized data access layer |
| **Observer/Decorator** | `@observe()` in tracing.py | Non-invasive Langfuse instrumentation |
| **Template Method** | `pipeline.py` | Fixed Bronze→Silver→Gold→ML order |
| **Adapter** | `graph/nodes.py` | Wraps Pydantic AI agents for LangGraph |

## Appendix B: Key Commands Quick Reference

```bash
# Data generation
python3 -m src.data_simulator.fleet_simulator --compressors 100

# ETL pipeline
python3 -m src.etl.pipeline                    # Full pipeline
python3 -m src.etl.pipeline --stage silver     # Just Silver

# Agent API
uvicorn src.agents.api:app --port 8001         # Start API
python3 -m src.agents.run_diagnosis COMP-0003  # CLI diagnosis

# Closed-loop workflow
curl -X POST http://localhost:8001/workflows/closed-loop \
  -H "Content-Type: application/json" \
  -d '{"compressor_id": "COMP-0003", "trigger": "alert"}'

# Tests
pytest tests/unit/ -v                          # Unit (fast)
pytest tests/eval/ -v                          # Agent quality
pytest tests/integration/ -v                   # ETL (needs Spark)
cd frontend && npm test                        # Frontend

# Infrastructure
cd infrastructure/terraform && terraform validate
cd infrastructure/terraform && terraform plan -var-file=envs/staging.tfvars
```

## Appendix C: What to Study for Archrock Specifically

| Topic | Resource | Priority |
|-------|----------|----------|
| Microsoft Fabric | MS Learn: DP-600 certification path | Critical |
| TSQL | SQLServerCentral, LeetCode SQL | Critical |
| Azure DevOps | MS Learn: AZ-400 modules | Critical |
| Azure ML + MLOps | MS Learn: Azure ML tutorials | High |
| PySpark optimization | Spark: The Definitive Guide (tuning chapters) | High |
| Power BI + DAX | SQLBI.com (Marco Russo) | Medium |
| Azure Functions | MS Learn: Azure Functions quickstarts | Medium |
| Data governance (Purview) | MS Learn: Purview modules | Medium |
| Archrock 10-K | SEC EDGAR: search "Archrock" | High |
| Archrock earnings calls | Investor relations page | High |
| Compressor mechanics | YouTube: "reciprocating compressor operation" | Medium |
