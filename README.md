# Altaviz

**Compressor fleet monitoring platform for midstream oil & gas operators**

## Overview

Altaviz provides real-time integrity monitoring for compressor fleets, combining sensor data processing (PySpark ETL with Delta Lake), ML-powered anomaly detection, and automated EPA Subpart W compliance reporting. Four AI agents form a closed-loop autonomous maintenance system: Diagnostics (5 sensor tools), Investigation (RAG-powered root cause analysis with evidence chains), Work Order (HITL state machine with approval gates), and Fleet Optimization (proactive scanning with what-if simulation). Designed for Archrock-scale operations — 4,700+ compressors, 10 basins, 200+ stations — the platform delivers 48-hour advance failure warnings and reduces unplanned shutdowns by 40%.

### Key Features

- **Fleet Health Monitoring**: Track vibration, temperature, pressure, horsepower, and gas flow across your compressor fleet
- **ML-Powered Predictions**: Isolation Forest anomaly detection, temperature drift prediction, EPA emissions estimation, and Remaining Useful Life
- **EPA Compliance**: Automated Subpart W emissions tracking and OOOOb compliance reporting
- **PySpark ETL Pipeline**: Distributed Bronze/Silver/Gold medallion architecture with Delta Lake ACID transactions
- **Multi-Tenant SaaS**: Organization-scoped data isolation, role-based access (owner/admin/operator/viewer)
- **Authentication & Billing**: Email/password via NextAuth.js v5, Stripe billing with Free/Pro/Enterprise tiers
- **AI Investigation Agent**: RAG-powered root cause analysis with pgvector embeddings, evidence chains, technician feedback loop
- **Work Order Orchestration**: 9-state machine with human-in-the-loop approval gates for high-risk operations (>$10K, emergency, shutdown)
- **Fleet Optimization Copilot**: Proactive fleet scans, what-if simulation engine, conversational chat interface
- **Agentic Workflows**: Automated alert escalation, auto-resolve, data freshness checks, stale alert cleanup
- **Security Hardened**: Rate limiting, CSP headers, input validation, timing-safe auth, parameterized SQL, audit logging
- **Azure Integration**: Terraform IaC, Container Apps, Key Vault, Application Insights, ACR

## Architecture

```
Data Simulator → PySpark ETL (Bronze/Silver/Gold) → PostgreSQL / OneLake
                                                         ↓
Landing Page (/) ← Next.js 16 → Dashboard (/dashboard/*) → API Routes → DB (org-scoped)
                                     ↓
                    Auth (NextAuth v5) + Stripe Billing + Agentic Workflows
                                     ↓
                    AI Agents (FastAPI sidecar, port 8001)
                    Fleet Optimization → Investigation (RAG) → Work Order (HITL)
                         ↑                                          ↓
                         └────────── feedback loop ─────────────────┘
                                     ↓
                    Azure Container Apps ← Terraform IaC → Key Vault + App Insights
```

### System Components

1. **Fleet Simulator**: Synthetic compressor sensor data for 4,700 units across 10 basins
2. **ETL Pipeline**: PySpark-based Bronze → Silver → Gold transformation with Delta Lake
3. **ML Inference**: Anomaly detection, temperature drift, emissions estimation, RUL prediction
4. **Database**: PostgreSQL (local) or OneLake (production) for dashboard-optimized aggregates
5. **Dashboard**: Next.js 16 + React 19 multi-tenant SaaS with auth, billing, and workflows
6. **AI Agents**: 4 Pydantic AI agents — Diagnostics, Investigation (RAG), Work Order (HITL), Fleet Optimization
7. **Infrastructure**: Azure Container Apps, ACR, Key Vault, App Insights via Terraform

## Quick Start

### Prerequisites

- Python 3.10+
- Java 11+ (for PySpark)
- Node.js 18+
- Docker
- PostgreSQL 14 (via Docker)

### Installation

```bash
# Clone the repository
git clone https://github.com/davidfertube/altaviz.git
cd altaviz

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Install frontend dependencies
cd frontend && npm install && cd ..

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Generate Sample Data

```bash
# Production fleet (4,700 compressors, 10 days)
python -m src.data_simulator.fleet_simulator

# Small test fleet
python -m src.data_simulator.fleet_simulator --compressors 100
```

### Run ETL Pipeline

```bash
# Start PostgreSQL
docker-compose up -d

# Run production pipeline (Bronze → Silver → Gold)
python -m src.etl.pipeline
```

### Launch Dashboard

```bash
cd frontend && npm run dev
# Open http://localhost:3000
```

## Project Structure

```
altaviz/
├── src/
│   ├── data_simulator/              # Synthetic data generation
│   │   ├── fleet_simulator.py       # 4,700 compressors, 10 basins, Parquet/EventHub output
│   │   ├── compressor_profiles.py   # 7 compressor models, 10 basins, station definitions
│   │   └── failure_scenarios.py     # 6 failure modes with degradation curves
│   ├── agents/                      # AI Agent system (Pydantic AI + FastAPI)
│   │   ├── diagnostics_agent.py     # Diagnostics agent (5 tools)
│   │   ├── investigation_agent.py   # Investigation agent (12 tools, RAG)
│   │   ├── work_order_agent.py      # Work order agent (10 tools, HITL)
│   │   ├── optimization_agent.py    # Fleet optimization copilot (11 tools)
│   │   ├── work_order_state_machine.py  # 9-state machine
│   │   ├── fleet_scanner.py         # Proactive fleet anomaly scanner
│   │   ├── simulator.py             # What-if simulation engine
│   │   ├── knowledge_base.py        # pgvector RAG + knowledge CRUD
│   │   ├── api.py                   # FastAPI sidecar (all 4 agents)
│   │   ├── run_diagnosis.py         # CLI diagnostics runner
│   │   └── shared/                  # Shared agent infrastructure
│   │       ├── db_tools.py          # 7 shared DB query functions
│   │       ├── models.py            # Pydantic models
│   │       ├── guardrails.py        # Tier limits, cost caps, rate limits
│   │       ├── memory.py            # Session CRUD
│   │       └── id_generator.py      # Sequential IDs
│   ├── etl/                         # PySpark ETL pipeline
│   │   ├── pipeline.py              # Production orchestrator (OneLake, Fabric)
│   │   ├── onelake.py               # OneLake read/write client (ABFS + local fallback)
│   │   ├── schemas.py               # Explicit StructType schemas (SENSOR, METADATA, GOLD)
│   │   ├── utils.py                 # Config loading, Spark session, logging
│   │   ├── bronze/ingest.py         # Bronze layer ingestion
│   │   ├── silver/cleanse.py        # Silver layer cleaning (dedup, outliers, validation)
│   │   ├── silver/quality.py        # Data quality framework (5 check types)
│   │   └── gold/aggregate.py        # Gold layer aggregations, alerts, fleet health
│   ├── ingestion/                   # Streaming ingestion
│   │   ├── event_hub_producer.py    # Stream telemetry to Azure Event Hubs
│   │   ├── event_hub_consumer.py    # Spark Structured Streaming from Event Hubs
│   │   └── schema_registry.py       # Avro schema validation, dead letter routing
│   ├── ml/                          # ML models
│   │   ├── anomaly_detector.py      # Isolation Forest anomaly detection
│   │   ├── temp_drift_predictor.py  # Temperature drift predictor
│   │   ├── emissions_estimator.py   # EPA Subpart W emissions
│   │   ├── rul_predictor.py         # Remaining Useful Life heuristic
│   │   ├── serving/                 # Model serving
│   │   │   ├── batch_predictor.py   # Parallel batch inference for fleet
│   │   │   └── model_registry.py    # MLflow integration + model lifecycle
│   │   └── feature_store/store.py   # Feature computation, serving, drift monitoring
│   └── monitoring/metrics.py        # Production pipeline monitor (Azure Monitor + Teams)
├── tests/                           # Python test suite
│   ├── conftest.py                  # SparkSession fixture, sample data
│   ├── test_schemas.py              # Schema validation tests
│   ├── test_anomaly_detector.py     # Isolation Forest tests
│   ├── test_temp_drift_predictor.py # Temperature drift tests
│   ├── test_emissions_estimator.py  # EPA emissions tests
│   ├── test_rul_predictor.py        # RUL prediction tests
│   ├── load/test_fleet_scale.py     # Fleet simulator scale tests
│   ├── integration/                 # Integration tests (requires Spark)
│   └── unit/                        # Agent unit tests
│       ├── test_guardrails.py       # Confidence, approval, tier limits, rate limits
│       ├── test_state_machine.py    # Work order state machine transitions
│       ├── test_models.py           # Pydantic model validation
│       └── test_id_generator.py     # Sequential ID generation
├── frontend/                        # Next.js 16 + React 19 SaaS dashboard
│   ├── src/app/                     # App Router pages
│   │   ├── (marketing)/             # Public pages (landing, pricing, about, contact, changelog, legal)
│   │   ├── (dashboard)/dashboard/   # Authenticated pages (fleet, monitoring, alerts, agents)
│   │   │   ├── investigations/      # AI investigation list + detail + feedback
│   │   │   ├── work-orders/         # Work order kanban + detail + transitions
│   │   │   └── optimization/        # Recommendations + fleet scan + chat copilot
│   │   ├── (auth)/login/            # Authentication page
│   │   └── api/                     # 26+ API routes (org-scoped, validated, rate-limited)
│   │       └── agent/               # 11 agent proxy routes → FastAPI sidecar
│   ├── src/components/              # Reusable UI components
│   │   └── agents/                  # 10 agent components (badges, cards, timeline, chat)
│   ├── src/hooks/                   # SWR data fetching hooks
│   ├── src/lib/                     # Shared utilities
│   │   ├── auth.ts                  # NextAuth.js v5 config (credentials, RBAC)
│   │   ├── session.ts               # getAppSession() / requireSession() helpers
│   │   ├── db.ts                    # node-postgres Pool singleton
│   │   ├── queries.ts               # 12 org-scoped parameterized SQL query functions
│   │   ├── workflows.ts             # 4 agentic workflows (escalation, auto-resolve, etc.)
│   │   ├── stripe.ts                # Stripe client (lazy-init)
│   │   ├── plans.ts                 # Plan definitions + feature gates
│   │   ├── validation.ts            # Input validation (int bounds, enum, UUID)
│   │   ├── rate-limit.ts            # In-memory rate limiter (60 req/min/IP)
│   │   ├── crypto.ts                # Timing-safe comparison utility
│   │   ├── errors.ts                # Sanitized error responses with requestId
│   │   ├── fetcher.ts               # Shared SWR fetcher with retry logic
│   │   ├── env.ts                   # Startup env var validation
│   │   ├── email.ts                 # Email notifications via Resend API
│   │   ├── email-templates.ts       # Email HTML templates (alerts, invitations)
│   │   ├── types.ts                 # TypeScript interfaces
│   │   └── constants.ts             # Sensor thresholds, colors, nav items
│   └── __tests__/                   # Frontend test suite
│       ├── lib/                     # Unit tests (validation, plans, crypto, session, db, email, RBAC)
│       └── api/                     # API route tests (fleet, alerts, readings, workflows, stripe, team)
├── config/                          # Configuration files
│   ├── database.yaml                # PostgreSQL connection settings
│   ├── etl_config.yaml              # Window sizes, Spark config, data paths
│   └── thresholds.yaml              # Sensor normal/warning/critical ranges
├── infrastructure/
│   ├── sql/
│   │   ├── schema.sql               # PostgreSQL DDL (20 tables, 5 views, 15+ indexes)
│   │   ├── migrations/              # Numbered migration scripts
│   │   └── azure/                   # Azure SQL DDL + seed data
│   └── terraform/                   # Azure IaC (Container Apps, PostgreSQL, Key Vault, ACR)
│       └── envs/                    # Environment-specific configs (staging, prod)
├── .github/workflows/               # CI (lint, typecheck, tests, build, security) + CD
└── docker-compose.yml               # PostgreSQL 14 + Frontend
```

## Data Schema

### Sensor Readings (Raw)

| Field | Type | Description |
|-------|------|-------------|
| `compressor_id` | VARCHAR(50) | Unique compressor identifier (COMP-0001 to COMP-4700) |
| `timestamp` | TIMESTAMP | Reading timestamp (5-min intervals) |
| `vibration_mms` | FLOAT | Vibration level (mm/s) |
| `discharge_temp_f` | FLOAT | Discharge temperature (F) |
| `suction_pressure_psi` | FLOAT | Suction pressure (PSI) |
| `discharge_pressure_psi` | FLOAT | Discharge pressure (PSI) |
| `horsepower_consumption` | FLOAT | Power consumption (HP) |
| `gas_flow_mcf` | FLOAT | Gas flow rate (Mcf/day) |

### Gold Layer Features (Engineered)

| Feature Category | Examples |
|-----------------|----------|
| **Rolling Windows** | `vibration_1hr_mean`, `temp_4hr_mean`, `pressure_24hr_mean` |
| **Rate of Change** | `temp_1hr_delta` (F per hour) |
| **Derived Metrics** | `pressure_differential` (discharge - suction) |
| **Threshold Flags** | `vibration_status`, `temp_status`, `pressure_status` (normal/warning/critical) |
| **Time Features** | `hour_of_day`, `day_of_week`, `is_weekend` |

## Technical Highlights

### PySpark Optimizations

- Explicit schema definition (no `inferSchema` — 10-100x faster loads)
- Single `.select()` statements instead of chained `.withColumn()` (2-5x faster)
- Broadcast joins for small dimension tables (10-100x faster joins)
- Adaptive Query Execution (AQE) for runtime optimization
- Arrow optimization for PySpark-to-Pandas data transfer
- Date-based partitioning for efficient time-series queries

### Dashboard Features

- B2B enterprise landing page with animated data flow visualizations
- Fleet overview with station map and color-coded compressor health
- Compressor detail pages with radial gauges and time-series charts
- Alert management with filtering, acknowledge, and resolve actions
- AI investigation and work order management with kanban boards
- Data quality monitoring with fleet health metrics
- Organization settings with Stripe billing management
- Dark/light theme toggle, responsive layout, loading skeletons
- Role-based access control (owner, admin, operator, viewer)

## Branching Strategy

```
main      ← production (protected, requires PR + approval)
staging   ← pre-production validation (protected, requires PR)
develop   ← active development (default branch for PRs)
```

**PR flow**: `feature/my-feature` → `develop` → `staging` → `main`

CI runs lint, typecheck, tests, build, and security scan on every PR. Production deploys require GitHub Environment approval.

## Deployment

### Local Development

```bash
docker-compose up -d                                       # Start PostgreSQL
python -m src.data_simulator.fleet_simulator --compressors 100  # Generate sensor data
python -m src.etl.pipeline                                 # Run ETL pipeline
cd frontend && npm run dev                                 # Launch dashboard (localhost:3000)
```

### Staging & Production (Azure)

```bash
git push origin staging                             # Auto-deploys to staging
git push origin main                                # Deploys to production (requires approval)
```

Post-deploy verification: `curl -f https://<app-url>/api/health`

## Security

Security controls include: rate limiting (60 req/min general, 10 req/min auth), CORS validation, CSP + HSTS headers, input validation on all API routes, timing-safe API key auth, parameterized SQL queries, audit logging to `audit_logs` table, and API key rotation with grace period. AI agents include guardrails: cost caps, confidence thresholds, human-in-the-loop approval gates, and rate limits.

## Testing

### Frontend (Jest)

```bash
cd frontend && npm test                  # Run all tests
cd frontend && npm run test:watch        # Watch mode
cd frontend && npm run test:coverage     # With coverage report (60% threshold)
```

Tests cover: input validation, feature gates, timing-safe crypto, session handling, RBAC enforcement, database pool config, email notifications, team management, all API routes (auth, pagination, feature gates, Stripe webhooks, workflows).

### Python ETL + ML + Agents (pytest)

```bash
JAVA_HOME=/opt/homebrew/opt/openjdk@11/libexec/openjdk.jdk/Contents/Home \
PYSPARK_PYTHON=.venv/bin/python \
PYTHONPATH=. \
.venv/bin/python -m pytest tests/ -v
```

Tests cover: schema validation, Gold layer transformations (rolling windows, rate of change, thresholds), all 4 ML models (anomaly detection, temperature drift, emissions estimation, RUL prediction), fleet simulator scale tests, and agent unit tests (guardrails, state machine, Pydantic models, ID generation).

### Lint & Typecheck

```bash
cd frontend && npx tsc --noEmit          # TypeScript type checking
cd frontend && npx eslint .              # ESLint
```

## Simulated Failures

6 realistic failure modes in `src/data_simulator/failure_scenarios.py`:

| Mode | Primary Sensor | Fleet Probability | Progression |
|------|---------------|-------------------|-------------|
| Bearing Wear | vibration_mms | 2.5%/month | Exponential vibration increase |
| Cooling Degradation | discharge_temp_f | 2.0%/month | Linear temperature rise |
| Valve Failure | discharge_pressure_psi | 1.5%/month | Pressure oscillations |
| Ring Wear | gas_flow_mcf | 2.0%/month | Gradual efficiency loss |
| Packing Leak | discharge_pressure_psi | 1.5%/month | Pressure loss + emissions |
| Fouling | discharge_temp_f | 3.0%/month | Slow temp increase + spikes |

At any time: ~5% of fleet degrading, ~1% critical.

## Author

**David Fernandez**
- GitHub: [@davidfertube](https://github.com/davidfertube)
- LinkedIn: [davidfertube](https://www.linkedin.com/in/davidfertube/)

---

*Built with PySpark, Delta Lake, PostgreSQL, pgvector, Next.js 16, React 19, Tailwind CSS v4, NextAuth.js v5, Pydantic AI, Stripe, and Terraform*
