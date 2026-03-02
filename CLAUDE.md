# Altaviz

Production-grade data engineering platform for compressor fleet integrity management.
Designed for Archrock-scale operations: 4,700+ compressors, 10 basins, 200+ stations.

Stack: PySpark 3.5 + Delta Lake 3.0 | Azure Fabric / OneLake | Azure Event Hubs | MLflow | Pydantic AI | pgvector | Terraform
Status: Production architecture — Streaming + batch ETL, 4 ML models, 4 AI agents (closed-loop autonomous maintenance), fleet simulator, pipeline observability, data quality framework, infrastructure as code.

## Critical Rules

- NEVER use `inferSchema`; always use explicit `StructType` schemas from `src/etl/schemas.py`
- NEVER chain `.withColumn()` calls; use a single `.select()` with all new columns
- NEVER hardcode credentials; use environment variables or Azure Key Vault
- NEVER commit `.env` files, `.env.local`, or `data/` directory contents
- Maintain Bronze → Silver → Gold → ML medallion pattern; Bronze is immutable raw data
- Use `broadcast()` for joins with small tables (metadata, stations)
- Partition Gold layer by `date` and `region`; Z-order by `compressor_id`
- All sensor thresholds live in `config/thresholds.yaml`, not in application code
- OneLake paths use ABFS protocol: `abfss://<workspace>@onelake.dfs.fabric.microsoft.com/<lakehouse>/`
- Prerequisites: Python 3.10+, Java 11+ (for PySpark)

## Key Commands

```bash
# Fleet Simulator (4,700 compressors)
python -m src.data_simulator.fleet_simulator                    # Full fleet, 10 days, Parquet output
python -m src.data_simulator.fleet_simulator --compressors 100  # Small test fleet
python -m src.data_simulator.fleet_simulator --output eventhub  # Stream to Event Hubs

# Production Pipeline (OneLake)
python -m src.etl.pipeline                          # Full pipeline (batch mode)
python -m src.etl.pipeline --mode stream            # Streaming from Event Hubs
python -m src.etl.pipeline --skip-ml                # ETL only, no ML inference
python -m src.etl.pipeline --skip-quality           # Skip data quality checks

# AI Agents (all 4 served via FastAPI sidecar)
python -m src.agents.run_diagnosis COMP-0003        # Run diagnostics CLI
uvicorn src.agents.api:app --port 8001              # Start agent API (all 4 agents)

# Tests
pytest tests/ -v                                    # All Python tests
pytest tests/load/ -v                               # Fleet scale tests
pytest tests/integration/ -v                        # Integration tests (requires Spark)
pytest tests/unit/ -v                               # Unit tests (guardrails, state machine, models, IDs)

# Infrastructure
cd infrastructure/terraform && terraform plan       # Preview Azure changes
cd infrastructure/terraform && terraform apply      # Deploy infrastructure
```

## Architecture

```
                        PRODUCTION ARCHITECTURE (4,700 Compressors)

┌──────────────────────────────────────────────────────────────────────────┐
│  IoT Devices (4,700 compressors, 5-min intervals)                       │
│       ↓ MQTT/HTTPS                                                       │
│  Azure Event Hubs (16 partitions, partitioned by basin)                  │
│       ↓ Spark Structured Streaming                                       │
├──────────────────────────────────────────────────────────────────────────┤
│  BRONZE (OneLake lh_bronze_raw)                                          │
│  - Raw telemetry, zero transformations                                   │
│  - Partitioned by ingestion_date                                         │
│  - 1.35M rows/day, 7-year retention (EPA compliance)                    │
├──────────────────────────────────────────────────────────────────────────┤
│  SILVER (OneLake lh_silver_cleaned)                                      │
│  - Deduplicated, null-handled, outlier-removed                          │
│  - Per-compressor statistical validation (4-sigma)                      │
│  - Quality checks: completeness, freshness, consistency                 │
│  - Partitioned by date                                                   │
├──────────────────────────────────────────────────────────────────────────┤
│  GOLD (OneLake lh_gold_curated)                                          │
│  - Rolling aggregations (1hr, 4hr, 24hr windows)                        │
│  - Derived metrics (pressure differential, temp rate of change)         │
│  - Threshold status flags (normal/warning/critical)                     │
│  - Partitioned by date + region, Z-ordered by compressor_id             │
├──────────────────────────────────────────────────────────────────────────┤
│  ML INFERENCE (OneLake lh_ml_serving)                                    │
│  - Anomaly Detection (Isolation Forest)                                  │
│  - Temperature Drift (Linear Regression)                                │
│  - Emissions (EPA Subpart W)                                            │
│  - RUL Prediction (Heuristic)                                           │
│  - Feature Store + MLflow Model Registry                                │
├──────────────────────────────────────────────────────────────────────────┤
│  SERVING                                                                 │
│  - Pipeline Monitor (Azure Monitor + Teams alerts)                      │
│  - OneLake SQL endpoint for BI (Power BI, Synapse)                      │
├──────────────────────────────────────────────────────────────────────────┤
│  AI AGENTS (Pydantic AI + FastAPI sidecar, port 8001)                    │
│                                                                          │
│  Fleet Optimization ──→ Investigation ──→ Work Order ──→ Knowledge Base │
│  (proactive scans)      (RAG + evidence)   (HITL + state machine)       │
│       ↑                                          │                       │
│       └──────────── feedback loop ───────────────┘                       │
│                                                                          │
│  Shared: guardrails, tier limits, rate limits, session tracking          │
│  Storage: pgvector embeddings, 7 agent tables, 2 agent views            │
└──────────────────────────────────────────────────────────────────────────┘
```

## Fleet Scale

| Metric | Demo (10 units) | Production (4,700 units) |
|--------|-----------------|--------------------------|
| Compressors | 10 | 4,700 |
| Stations | 4 (Texas) | 200+ (10 basins) |
| Basins | 1 | 10 (Permian, Eagle Ford, Marcellus, etc.) |
| Readings/day | 14,400 | 1,353,600 |
| Storage/day | ~3 MB | ~270 MB |
| Hourly aggregates/day | 240 | 112,800 |
| Active alerts (~5%) | 2-3 | ~235 |
| ML predictions/run | 40 | 18,800 |

## ML Models

| Model | File | Algorithm | Purpose |
|-------|------|-----------|---------|
| Anomaly Detection | `src/ml/anomaly_detector.py` | Isolation Forest (scikit-learn) | Vibration pattern anomalies, 24-48hr early warning |
| Temperature Drift | `src/ml/temp_drift_predictor.py` | Linear Regression (scipy) | Hours until temp warning/critical thresholds |
| Emissions | `src/ml/emissions_estimator.py` | EPA Subpart W factors | CH4/CO2e emissions for OOOOb compliance |
| RUL Prediction | `src/ml/rul_predictor.py` | Heuristic (rule-based) | Remaining Useful Life from sensor degradation |

ML Lifecycle: Feature Store → MLflow Training → Model Registry → Batch Prediction → OneLake

## AI Agents (4 total — closed-loop autonomous maintenance)

**Framework:** Pydantic AI (type-safe structured outputs) | **API:** FastAPI sidecar (port 8001) | **Storage:** pgvector for RAG embeddings

| Agent | File | Tools | Output | Purpose |
|-------|------|-------|--------|---------|
| Diagnostics | `src/agents/diagnostics_agent.py` | 5 DB tools | `DiagnosticReport` | Root cause analysis from sensor data |
| Investigation | `src/agents/investigation_agent.py` | 12 tools | `InvestigationReport` | RAG-powered deep investigation with 7-step methodology, evidence chains, technician feedback |
| Work Order | `src/agents/work_order_agent.py` | 10 tools | `WorkOrderPlan` | 9-state machine (draft→verified), HITL approval for high-risk (>$10K, shutdown >4hr, emergency) |
| Fleet Optimization | `src/agents/optimization_agent.py` | 11 tools | `OptimizationRecommendation` | Proactive fleet scans, what-if simulation, conversational copilot |

**Closed-loop flow:** Optimization (proactive scan) → Investigation (deep dive) → Work Order (execution) → Knowledge Base (learning)

### Shared Agent Infrastructure (`src/agents/shared/`)

| Module | Purpose |
|--------|---------|
| `db_tools.py` | 7 shared DB query functions (readings, alerts, predictions, maintenance, metadata, knowledge base, similar incidents) |
| `models.py` | Pydantic models: `WorkOrderPlan`, `InvestigationReport`, `OptimizationRecommendation`, `EvidenceStep`, `DiagnosticReport` |
| `guardrails.py` | Tier limits (free/pro/enterprise), cost caps ($10K), confidence thresholds (0.6), rate limits (10 WO/hr) |
| `memory.py` | Agent session CRUD — tracks token usage, costs, durations |
| `id_generator.py` | Sequential IDs: `WO-2026-00001`, `INV-2026-00001`, `OPT-2026-00001`, `SNAP-2026-02-26-daily` |

### Work Order State Machine

```
draft → pending_approval → approved → assigned → in_progress → completed → verified
                ↓                                                    ↑
            rejected → draft (re-draft)              cancelled ←─────┘
```

Human approval required for: emergency/urgent priority, cost > $10K, shutdown > 4 hours.

## Data Quality Framework

- **Module:** `src/etl/silver/quality.py`
- **Checks:** Fleet completeness (85% threshold), data freshness (15-min SLA), sensor completeness (95%), volume consistency, pressure consistency
- **Report:** `QualityReport` with pass/fail per check, auto-logged to monitor

## Pipeline Observability

- **Monitor:** `src/monitoring/metrics.py` — `PipelineMonitor` class
- **Tracks:** Stage durations, row counts, rejection rates, ML results
- **Destinations:** Structured logs, Azure Monitor (Log Analytics), Teams webhook on failure

## Failure Scenarios

6 realistic failure modes defined in `src/data_simulator/failure_scenarios.py`:

| Mode | Primary Sensor | Fleet Probability | Progression |
|------|---------------|-------------------|-------------|
| Bearing Wear | vibration_mms | 2.5%/month | Exponential vibration increase |
| Cooling Degradation | discharge_temp_f | 2.0%/month | Linear temperature rise |
| Valve Failure | discharge_pressure_psi | 1.5%/month | Pressure oscillations |
| Ring Wear | gas_flow_mcf | 2.0%/month | Gradual efficiency loss |
| Packing Leak | discharge_pressure_psi | 1.5%/month | Pressure loss + emissions |
| Fouling | discharge_temp_f | 3.0%/month | Slow temp increase + spikes |

At any time: ~5% of fleet degrading, ~1% critical.

## Environment Variables

```bash
# Azure Fabric
FABRIC_WORKSPACE_ID=               # Fabric workspace GUID
FABRIC_BRONZE_LAKEHOUSE_ID=        # Bronze lakehouse GUID
FABRIC_SILVER_LAKEHOUSE_ID=
FABRIC_GOLD_LAKEHOUSE_ID=
FABRIC_ML_LAKEHOUSE_ID=

# Azure Event Hubs
EVENTHUB_CONNECTION_STRING=        # Full connection string with EntityPath
EVENTHUB_NAMESPACE=                # Namespace (alternative to connection string)
EVENTHUB_NAME=compressor-telemetry
EVENTHUB_CONSUMER_GROUP=$Default

# Monitoring
LOG_ANALYTICS_WORKSPACE_ID=        # Azure Log Analytics workspace
TEAMS_WEBHOOK_URL=                 # Microsoft Teams alert webhook

# ML
MLFLOW_TRACKING_URI=               # MLflow server (default: file:./mlruns)

# AI Agents
OPENAI_API_KEY=sk-...                    # Required for RAG embeddings (text-embedding-3-small)
DIAGNOSTICS_MODEL=openai:gpt-4o-mini     # LLM model for all 4 agents
AGENT_API_URL=http://localhost:8001      # Agent FastAPI sidecar URL

# Legacy (PostgreSQL)
DATABASE_URL=postgresql://...
ETL_ORGANIZATION_ID=
```

## Coding Patterns

### PySpark
- Load with explicit schema: `spark.read.schema(SENSOR_SCHEMA).parquet(path)`
- Single select for all transforms: `df.select(col("*"), avg("col").over(window).alias("new"))`
- Broadcast small tables: `large_df.join(broadcast(small_df), "compressor_id")`
- NEVER use doubled backslashes `\\` in code (PySpark SyntaxError bug)
- `date_format()` returns StringType: must `.cast("timestamp")` before writes

### OneLake / Delta Lake
- Read: `spark.read.format("delta").load("abfss://workspace@onelake.dfs.fabric.microsoft.com/lakehouse/Tables/table")`
- Write: `df.write.format("delta").mode("append").partitionBy("date").save(path)`
- Upsert: Use Delta MERGE for idempotent writes
- Optimize: Run `OPTIMIZE` + `ZORDER BY` after batch writes
- Vacuum: `VACUUM delta.\`path\` RETAIN 168 HOURS` (weekly)

### Streaming
- Watermark: `.withWatermark("timestamp", "15 minutes")` for late data
- Checkpoint: Always set `checkpointLocation` for exactly-once
- Trigger: `processingTime="5 minutes"` for micro-batch

## File Reference

| File | Purpose |
|------|---------|
| **Config** | |
| `config/fabric_config.yaml` | Fabric workspace, lakehouses, Event Hubs, schedule |
| `config/etl_config.yaml` | Window sizes, Spark config, data paths |
| `config/thresholds.yaml` | Sensor ranges, station locations, alert rules |
| `config/database.yaml` | PostgreSQL connection settings |
| **Data Simulator** | |
| `src/data_simulator/fleet_simulator.py` | 4,700 compressor fleet generator |
| `src/data_simulator/compressor_profiles.py` | 7 compressor models, 10 basins, station definitions |
| `src/data_simulator/failure_scenarios.py` | 6 failure modes with degradation curves |
| **Ingestion** | |
| `src/ingestion/event_hub_producer.py` | Stream telemetry to Azure Event Hubs |
| `src/ingestion/event_hub_consumer.py` | Spark Structured Streaming from Event Hubs |
| `src/ingestion/schema_registry.py` | Avro schema validation, dead letter routing |
| **ETL Pipeline** | |
| `src/etl/pipeline.py` | Production orchestrator (OneLake, Fabric) |
| `src/etl/onelake.py` | OneLake read/write client (ABFS + local fallback) |
| `src/etl/bronze/ingest.py` | Bronze layer ingestion |
| `src/etl/silver/cleanse.py` | Silver layer cleaning (dedup, outliers, validation) |
| `src/etl/silver/quality.py` | Data quality framework (5 check types) |
| `src/etl/gold/aggregate.py` | Gold layer aggregations, alerts, fleet health |
| `src/etl/schemas.py` | PySpark StructType schemas |
| `src/etl/utils.py` | Config loading, Spark session, logging |
| **ML** | |
| `src/ml/anomaly_detector.py` | Isolation Forest anomaly detection |
| `src/ml/temp_drift_predictor.py` | Temperature drift predictor |
| `src/ml/emissions_estimator.py` | EPA Subpart W emissions |
| `src/ml/rul_predictor.py` | Remaining Useful Life heuristic |
| `src/ml/serving/batch_predictor.py` | Parallel batch inference for fleet |
| `src/ml/serving/model_registry.py` | MLflow integration + model lifecycle |
| `src/ml/feature_store/store.py` | Feature computation, serving, drift monitoring |
| **Monitoring** | |
| `src/monitoring/metrics.py` | Production pipeline monitor (Azure Monitor + Teams) |
| **AI Agents** | |
| `src/agents/diagnostics_agent.py` | Pydantic AI diagnostics agent (5 tools) |
| `src/agents/investigation_agent.py` | Investigation agent (12 tools, RAG, evidence chains) |
| `src/agents/knowledge_base.py` | Knowledge base CRUD + pgvector similarity search |
| `src/agents/work_order_agent.py` | Work order agent (10 tools, HITL) |
| `src/agents/work_order_state_machine.py` | 9-state machine with transition validation |
| `src/agents/optimization_agent.py` | Fleet optimization copilot (11 tools, chat) |
| `src/agents/fleet_scanner.py` | Proactive fleet anomaly scanner |
| `src/agents/simulator.py` | What-if simulation engine |
| `src/agents/api.py` | FastAPI sidecar (port 8001, all 4 agents) |
| `src/agents/run_diagnosis.py` | CLI diagnostics runner |
| `src/agents/shared/db_tools.py` | 7 shared database query functions |
| `src/agents/shared/models.py` | Pydantic models (WorkOrderPlan, InvestigationReport, etc.) |
| `src/agents/shared/guardrails.py` | Tier limits, cost caps, confidence thresholds, rate limits |
| `src/agents/shared/memory.py` | Agent session CRUD (token/cost tracking) |
| `src/agents/shared/id_generator.py` | Sequential ID generation (WO-, INV-, OPT-, SNAP-) |
| **Frontend — Agent Pages** | |
| `frontend/src/app/(dashboard)/dashboard/investigations/page.tsx` | Investigation list with severity filters |
| `frontend/src/app/(dashboard)/dashboard/investigations/[invId]/page.tsx` | Investigation detail + feedback form |
| `frontend/src/app/(dashboard)/dashboard/work-orders/page.tsx` | Work order kanban board + list view |
| `frontend/src/app/(dashboard)/dashboard/work-orders/[woId]/page.tsx` | Work order detail + state transitions |
| `frontend/src/app/(dashboard)/dashboard/optimization/page.tsx` | Optimization recommendations + fleet scan |
| `frontend/src/app/(dashboard)/dashboard/optimization/chat/page.tsx` | Conversational optimization copilot |
| **Frontend — Agent Components** | |
| `frontend/src/components/agents/` | 10 components: ConfidenceBadge, SeverityBadge, PriorityBadge, StatusPill, EvidenceChain, WorkOrderCard, WorkOrderTimeline, RecommendationCard, ChatInterface, AgentActivityFeed |
| `frontend/src/hooks/useAgents.ts` | 6 SWR hooks for agent data fetching |
| **Frontend — Agent API Routes** | |
| `frontend/src/app/api/agent/` | 11 proxy routes: investigations (CRUD + feedback), work-orders (CRUD + transition), optimization (scan, what-if, recommendations, chat), sessions |
| **Infrastructure** | |
| `infrastructure/terraform/main.tf` | Azure resources (Event Hubs, Key Vault, monitoring) |
| `infrastructure/sql/schema.sql` | PostgreSQL DDL (20 tables, 5 views, triggers, seed data) |
| **Tests** | |
| `tests/test_schemas.py` | Schema validation tests |
| `tests/test_anomaly_detector.py` | Isolation Forest anomaly detection tests |
| `tests/test_temp_drift_predictor.py` | Temperature drift prediction tests |
| `tests/test_emissions_estimator.py` | EPA Subpart W emissions estimation tests |
| `tests/test_rul_predictor.py` | Remaining Useful Life prediction tests |
| `tests/load/test_fleet_scale.py` | Fleet simulator, profiles, failure scenarios |
| `tests/integration/test_onelake_connectivity.py` | OneLake, Bronze/Silver/Gold, quality |
| `tests/unit/test_guardrails.py` | Agent guardrail tests (confidence, approval, tiers, rates) |
| `tests/unit/test_state_machine.py` | Work order state machine transition tests |
| `tests/unit/test_models.py` | Pydantic model validation tests |
| `tests/unit/test_id_generator.py` | Sequential ID generation tests |
