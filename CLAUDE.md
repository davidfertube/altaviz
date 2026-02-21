# Altaviz

Production-grade data engineering platform for compressor fleet integrity management.
Designed for Archrock-scale operations: 4,700+ compressors, 10 basins, 200+ stations.

Stack: PySpark 3.5 + Delta Lake 3.0 | Azure Fabric / OneLake | Azure Event Hubs | MLflow | Pydantic AI | Terraform
Status: Production architecture — Streaming + batch ETL, 4 ML models, AI diagnostics agent, fleet simulator, pipeline observability, data quality framework, infrastructure as code.

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

# Legacy Simulator (10 compressors, original demo)
python src/data_simulator/compressor_simulator.py

# Production Pipeline (OneLake)
python -m src.etl.pipeline                          # Full pipeline (batch mode)
python -m src.etl.pipeline --mode stream            # Streaming from Event Hubs
python -m src.etl.pipeline --skip-ml                # ETL only, no ML inference
python -m src.etl.pipeline --skip-quality           # Skip data quality checks

# Legacy Pipeline (local Delta + PostgreSQL)
python src/etl/pyspark_pipeline.py                  # Original demo pipeline
python src/etl/pyspark_pipeline.py --skip-ml        # Without ML
python src/etl/pyspark_pipeline.py --skip-db        # Without database export

# AI Diagnostics Agent
python -m src.agents.run_diagnosis COMP-0003        # Run diagnosis (4-digit IDs at scale)
uvicorn src.agents.api:app --port 8001              # Start diagnostics API

# Tests
pytest tests/ -v                                    # All Python tests
pytest tests/load/ -v                               # Fleet scale tests
pytest tests/integration/ -v                        # Integration tests (requires Spark)
pytest tests/unit/ -v                               # Unit tests

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
│  - Pydantic AI Diagnostics Agent (FastAPI sidecar)                      │
│  - Pipeline Monitor (Azure Monitor + Teams alerts)                      │
│  - OneLake SQL endpoint for BI (Power BI, Synapse)                      │
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
| Anomaly Detection | `src/ml/models/anomaly_detector.py` | Isolation Forest (scikit-learn) | Vibration pattern anomalies, 24-48hr early warning |
| Temperature Drift | `src/ml/models/temp_drift_predictor.py` | Linear Regression (scipy) | Hours until temp warning/critical thresholds |
| Emissions | `src/ml/models/emissions_estimator.py` | EPA Subpart W factors | CH4/CO2e emissions for OOOOb compliance |
| RUL Prediction | `src/ml/models/rul_predictor.py` | Heuristic (rule-based) | Remaining Useful Life from sensor degradation |

ML Lifecycle: Feature Store → MLflow Training → Model Registry → Batch Prediction → OneLake

## AI Diagnostics Agent

- **Framework:** Pydantic AI (type-safe structured outputs)
- **Agent:** `src/agents/diagnostics_agent.py` — 5 database tools
- **API:** `src/agents/api.py` — FastAPI sidecar (port 8001)
- **CLI:** `python -m src.agents.run_diagnosis COMP-0003`
- **Output:** `DiagnosticReport` with root cause, contributing factors, actions

## Data Quality Framework

- **Module:** `src/etl/silver/quality.py`
- **Checks:** Fleet completeness (85% threshold), data freshness (15-min SLA), sensor completeness (95%), volume consistency, pressure consistency
- **Report:** `QualityReport` with pass/fail per check, auto-logged to monitor

## Pipeline Observability

- **Monitor:** `src/monitoring/metrics.py` — `PipelineMonitor` class
- **Tracks:** Stage durations, row counts, rejection rates, ML results
- **Destinations:** Structured logs, Azure Monitor (Log Analytics), Teams webhook on failure
- **Legacy:** `src/etl/pipeline_observer.py` (PostgreSQL-based, demo mode)

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

# AI Agent
DIAGNOSTICS_MODEL=openai:gpt-4o-mini

# Legacy (PostgreSQL for demo mode)
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
| `config/etl_config.yaml` | Window sizes, Spark config, data paths (legacy) |
| `config/thresholds.yaml` | Sensor ranges, station locations, alert rules |
| `config/database.yaml` | PostgreSQL connection settings (legacy) |
| **Data Simulator** | |
| `src/data_simulator/fleet_simulator.py` | 4,700 compressor fleet generator |
| `src/data_simulator/compressor_profiles.py` | 7 compressor models, 10 basins, station definitions |
| `src/data_simulator/failure_scenarios.py` | 6 failure modes with degradation curves |
| `src/data_simulator/compressor_simulator.py` | Original 10-unit demo simulator |
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
| `src/etl/pyspark_pipeline.py` | Legacy demo pipeline (local Delta + PostgreSQL) |
| `src/etl/database_writer.py` | Legacy PostgreSQL JDBC writer |
| `src/etl/pipeline_observer.py` | Legacy pipeline observability |
| **ML** | |
| `src/ml/models/anomaly_detector.py` | Isolation Forest anomaly detection |
| `src/ml/models/temp_drift_predictor.py` | Temperature drift predictor |
| `src/ml/models/emissions_estimator.py` | EPA Subpart W emissions |
| `src/ml/models/rul_predictor.py` | Remaining Useful Life heuristic |
| `src/ml/serving/batch_predictor.py` | Parallel batch inference for fleet |
| `src/ml/serving/model_registry.py` | MLflow integration + model lifecycle |
| `src/ml/feature_store/store.py` | Feature computation, serving, drift monitoring |
| **Monitoring** | |
| `src/monitoring/metrics.py` | Production pipeline monitor (Azure Monitor + Teams) |
| **AI Agent** | |
| `src/agents/diagnostics_agent.py` | Pydantic AI diagnostics agent |
| `src/agents/api.py` | FastAPI sidecar (port 8001) |
| `src/agents/run_diagnosis.py` | CLI diagnostics runner |
| **Infrastructure** | |
| `infrastructure/terraform/main.tf` | Azure resources (Event Hubs, Key Vault, monitoring) |
| `infrastructure/sql/schema.sql` | PostgreSQL DDL (legacy) |
| **Tests** | |
| `tests/load/test_fleet_scale.py` | Fleet simulator, profiles, failure scenarios |
| `tests/integration/test_onelake_connectivity.py` | OneLake, Bronze/Silver/Gold, quality |
| `tests/unit/` | Schema, transformation, ML model unit tests |
