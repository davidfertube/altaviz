# Archrock Interview Preparation Guide

## Cloud/AI Engineer Role | Interview: February 10, 2026 at 1:00 PM CST

---

## 1. Quick Reference Card

| Detail | Info |
|--------|------|
| **Company** | Archrock (NYSE: AROC) |
| **Role** | Cloud/AI Engineer |
| **Date/Time** | February 10, 2026, 1:00 PM CST |
| **Platform** | Microsoft Teams (video -- wear business professional shirt) |
| **Duration** | 30-45 minutes |
| **Interviewer** | Kunal Sharma -- Head of Data Engineering and Analytics |
| **Format** | Technical screen by a data engineering leader. Expect architecture and implementation depth, not LeetCode. |

### Your Elevator Pitch (Practice This Out Loud 10+ Times)

> "I built Altaviz, a production-ready MLOps platform for predictive maintenance of natural gas compression equipment. It processes over 50,000 sensor readings from 10 compressors across 4 Texas stations through a PySpark medallion architecture -- Bronze, Silver, Gold -- with Delta Lake for ACID transactions, writes aggregated metrics to PostgreSQL or Azure SQL, and visualizes fleet health through an interactive dashboard. I specifically designed it around the same equipment manufacturers Archrock operates -- Ajax, Ariel, Caterpillar, Waukesha -- because I wanted to demonstrate domain-relevant engineering, not just a generic data pipeline."

### Three Key Talking Points (Steer Toward These No Matter What)

1. **"I built this for your exact domain"** -- Same compressor manufacturers (Ajax, Ariel, Caterpillar, Waukesha), same sensor types (vibration, temperature, pressure), same Texas oil and gas basins (Eagle Ford, Permian, Haynesville, Barnett)
2. **"My PySpark code is Fabric-ready by design"** -- Delta Lake format, medallion architecture, and Spark APIs are the same runtime that powers Microsoft Fabric Lakehouses. Migration path is configuration change, not code rewrite
3. **"I think end-to-end, from sensor to decision"** -- Not just ETL -- I designed the data model, feature engineering, quality monitoring, alert system, and ML prediction infrastructure as an integrated platform

---

## 2. Know Your Interviewer: Kunal Sharma

### Background
- **Current Role**: Head of Data Engineering and Analytics at Archrock (Houston, TX)
- **Previous Experience**: BHP (global mining and resources company), L&T Infotech (IT services)
- **Education**: University of Texas at Austin (2021-2024) -- likely MS in Data Science or Analytics
- **Public Profile**: Featured on the **"AI SuccessFactors" podcast** (December 2024, 31 min) in an episode titled **"AI's Impact on Midstream Energy"**

### What Kunal Said on the AI SuccessFactors Podcast

These are the themes he publicly discussed -- reference them naturally in conversation:

1. **AI and IoT optimize equipment, enhance safety, ensure emission compliance** -- He sees AI as a multi-value tool, not just predictive maintenance
2. **Centralizing data and empowering technicians with actionable insights** -- The end user is a field technician, not a data scientist. Dashboards must be simple and actionable
3. **Predictive models for emissions and equipment monitoring enable proactive decision-making** -- He cares about preventing problems, not just detecting them
4. **Digital twins and edge computing are the next phase of midstream transformation** -- He is forward-looking and thinking about the future architecture
5. **Aligning AI initiatives with strategic goals ensures long-term success** -- He fights for AI budget internally and needs projects that tie to business outcomes

### How to Use This in the Interview

When answering questions, naturally bridge to his known priorities:

> "I listened to your conversation on AI SuccessFactors, and your point about empowering technicians with actionable insights really resonated with how I designed the dashboard layer of Altaviz -- the Fleet Health Summary view gives operators a single-screen answer to 'which compressors need attention right now?'"

> "You mentioned digital twins as the next phase. My Gold layer feature engineering -- rolling window statistics at multiple time horizons -- is exactly the kind of feature set that feeds a digital twin model. The 1-hour window captures immediate anomalies, the 24-hour window captures long-term degradation trends."

### What This Tells You About What He Wants in a Candidate

- **Architectural thinking**: He hires people who see the whole system, not just their piece
- **Practical AI**: He wants ML that field techs can use, not research papers
- **Business alignment**: Every technical decision must connect to a business outcome
- **Edge-to-cloud awareness**: He thinks about the full data journey from compressor sensor to executive dashboard
- **Growth mindset**: He is actively learning and pushing AI adoption, so he wants people who keep up with emerging trends

---

## 3. Know the Company: Archrock

### Company Profile

| Fact | Detail |
|------|--------|
| **What They Do** | Largest natural gas compression services provider in the U.S. |
| **Headquarters** | Houston, TX |
| **Employees** | 1,300+ (as of Dec 2024) |
| **Ticker** | NYSE: AROC |
| **Fleet Size** | 4.5+ million operating horsepower |
| **History** | 65+ year legacy (founded 1954) |
| **Operations** | Every major U.S. oil and gas producing region |

### Core Business Lines

1. **Contract Compression** -- Own, operate, service, and maintain natural gas compression equipment. Gas-driven and electric motor-driven (EMD) units. This is the core business
2. **Aftermarket Services** -- Field service, shop maintenance, parts for all major OEMs (including Ajax, Ariel, Caterpillar, Waukesha)
3. **Methane & NGL Solutions** -- Ecotec methane monitoring and compliance, Carbon Hawk methane mitigation, MaCH4 NGL recovery

### Why Your Altaviz Project Is a Perfect Fit

Your simulator uses the **exact same compressor manufacturers** that Archrock operates:

| Altaviz Model (`compressor_simulator.py:45`) | Archrock Fleet |
|------|------|
| Ajax DPC-360 | Ajax units across fleet |
| Ariel JGK/4 | Ariel units across fleet |
| Caterpillar G3516 | Caterpillar gas engines |
| Waukesha 7042GSI | Waukesha gas engines |

Your stations are in the **same Texas basins** where Archrock operates (`thresholds.yaml:97-145`):
- Eagle Ford Shale (South Texas)
- Permian Basin (West Texas) -- Archrock's biggest region, expanded via NGCS acquisition
- Haynesville Shale (East Texas)
- Barnett Shale (North Texas)

### Recent Acquisitions (Show You Track the Business)

- **TOPS Acquisition (Aug 2024)**: ~$983M -- Added ~580,000 HP of electric motor drive (EMD) compression
- **NGCS Acquisition (May 2025)**: ~$357M -- Added ~351,000 HP, expanded Permian Basin operations
- **Total**: $1.3B+ in acquisitions -- they are rapidly scaling, which means **data integration challenges** (merging telemetry systems, standardizing schemas)

### Digital Transformation

- **2019-2021**: Invested ~$50M in digital transformation -- ERP, supply chain, remote monitoring
- **2021**: Selected **Detechtion Technologies** (Enbase product) for IIoT remote monitoring across entire fleet
- **Current**: All compressors equipped with telematic devices for remote monitoring
- **Active**: Azure Synapse/Fabric migration (per the job description)

### What This Means for You as a Candidate

Archrock is in the middle of a platform modernization. Kunal's team is likely building the centralized data platform that:
- Ingests telemetry from thousands of compressor units (Detechtion IIoT)
- Processes sensor data through an ETL pipeline (PySpark on Azure)
- Stores aggregated metrics in a cloud data warehouse (Synapse/Fabric)
- Powers dashboards for field operations and executive reporting
- Feeds ML models for predictive maintenance and emissions monitoring

**This is exactly what Altaviz does at a smaller scale.** Your job in the interview is to prove you can scale it up.

---

## 4. Job Description: Bullet-by-Bullet Coverage

Each responsibility from the job description is mapped to specific Altaviz code you can reference.

---

### JD Bullet 1: "Learn and adapt quickly to new tools, technologies, and domain-specific knowledge"

**Your Evidence:**

You built this entire project from scratch, self-teaching:
- **PySpark 3.5.0** with Delta Lake 3.0.0 -- distributed data processing with ACID transactions
- **Natural gas compression domain** -- industry-standard thresholds based on API 618 (reciprocating compressor standards) and ISO 10816 (vibration severity standards)
- **PostgreSQL schema design** for time-series data with advanced indexing

**Code References:**

- `thresholds.yaml:217` -- Comment explicitly states: "Thresholds are based on industry standards (API 618, ISO 10816, etc.)"
- `compressor_simulator.py:49-71` -- Sensor ranges and thresholds from domain research, not arbitrary values
- `thresholds.yaml:14-71` -- Every threshold has a `description` field explaining the domain rationale (e.g., "High vibration indicates bearing wear, misalignment, or imbalance")
- `thresholds.yaml:187-214` -- Compressor model specifications (cylinder count, type, rated HP) show genuine understanding of the equipment

**Talking Point:**

> "I self-taught the natural gas compression domain to build realistic simulations. The thresholds in my system are based on API 618 for reciprocating compressors and ISO 10816 for vibration severity. For example, my critical vibration threshold of 8.0 mm/s corresponds to ISO 10816 Zone D for rigid-mounted rotating machinery. I also modeled the specific compressor types in Archrock's fleet -- Ajax, Ariel, Caterpillar, and Waukesha -- with their actual horsepower ratings and cylinder configurations."

**If Asked to Elaborate:**

Explain the degradation patterns you simulated (`compressor_simulator.py:99-133`):
- **Vibration**: Exponential increase -- because bearing degradation accelerates as surfaces deteriorate (line 122: `multiplier = 1 + (days_degrading / 2) ** 1.5`)
- **Temperature**: Linear increase -- thermal degradation is usually gradual (line 125: `multiplier = 1 + (days_degrading * 0.15)`)
- **Pressure**: Sinusoidal fluctuations -- pressure issues often oscillate as valves and seals degrade intermittently (line 128: `multiplier = 1 + np.sin(days_degrading) * 0.3`)

---

### JD Bullet 2: "Manage and maintain Python-based code repositories"

**Your Evidence:**

Altaviz demonstrates professional Python project structure and best practices:

**Code References:**

- **Modular architecture**: `src/data_simulator/`, `src/etl/`, `src/dashboard/` -- independent packages with clear separation of concerns
- **Pinned dependencies**: `requirements.txt` with exact versions (e.g., `pyspark==3.5.0`, `delta-spark==3.0.0`)
- **Configuration externalization**: Three YAML config files in `config/` -- no hardcoded values in Python code
- **Environment variable security**: `utils.py:77-120` -- `substitute_env_vars()` function with `${VAR:-default}` pattern, reading from `.env` (gitignored)
- **Type hints**: `compressor_simulator.py:18` -- uses `List`, `Dict`, `Tuple` from typing
- **Docstrings**: Every function has a docstring with Args, Returns, and Examples (e.g., `utils.py:36-70`, `schemas.py:202-216`)
- **`__init__.py` files**: Proper Python package structure
- **`.gitignore`**: Excludes `data/`, `.env`, `__pycache__/`, IDE configs, Terraform state

**Talking Point:**

> "I structured Altaviz with clean separation of concerns -- data simulation, ETL, and dashboard are independent packages. Configuration is externalized to YAML files with environment variable substitution so the same codebase works across dev, test, and prod environments. Secrets never touch version control -- credentials live in `.env` which is gitignored, and my config loader automatically substitutes environment variables at runtime using a regex pattern I built."

**If Asked About Config Pattern:**

Walk through `utils.py:77-120`:
```python
# Pattern: ${VAR_NAME:-default_value}
# Example in database.yaml: host: "${DB_HOST:-localhost}"
# utils.py substitutes at load time using regex
env_var_pattern = re.compile(r'\$\{([^}:]+)(?::-([^}]+))?\}')
```
This means the same config file works in Docker (where `DB_HOST=postgres`), in local dev (defaults to `localhost`), and in Azure (where `DB_HOST` points to the managed instance).

---

### JD Bullet 3: "Oversee and optimize workflows associated with Microsoft Fabric, Azure Synapse Analytics, PySpark"

**Your Evidence:**

This is the most critical bullet. Your PySpark pipeline demonstrates five specific optimization patterns that directly apply to Fabric/Synapse workloads.

**Code References:**

#### Optimization 1: Explicit Schemas (10-100x Faster)
- `schemas.py:1-17` -- Module docstring explains why explicit schemas matter
- `schemas.py:37-78` -- SENSOR_SCHEMA with 9 typed fields, inline comments for each
- `schemas.py:134-195` -- GOLD_SCHEMA with 24 feature columns

```python
# FAST: Explicit schema (schemas.py:37)
df = spark.read.schema(SENSOR_SCHEMA).parquet('data/raw/sensor_readings.parquet')

# SLOW: Schema inference (requires full file scan)
df = spark.read.option("inferSchema", "true").parquet('data/raw/sensor_readings.parquet')
```

> "Explicit schemas are 10 to 100x faster because Spark doesn't need to scan the entire file to guess types. For 50,000 records that's noticeable. For Archrock's scale -- millions of readings from thousands of compressors -- it's the difference between minutes and hours."

#### Optimization 2: Single Select vs. Chained withColumn
```python
# BAD: N passes through the data
df.withColumn("a", ...).withColumn("b", ...).withColumn("c", ...)

# GOOD: Single pass (agents.md:354-392 template)
df.select(
    col("*"),
    avg("vibration").over(window_1hr).alias("vibration_1hr_mean"),
    stddev("vibration").over(window_1hr).alias("vibration_1hr_std"),
    max("vibration").over(window_1hr).alias("vibration_1hr_max"),
)
```

> "Each `.withColumn()` creates a new DataFrame object and can cause Spark to re-evaluate the execution plan. A single `.select()` gives the Catalyst optimizer a complete picture to optimize at once."

#### Optimization 3: Broadcast Joins for Small Tables
```python
from pyspark.sql.functions import broadcast
sensor_readings.join(broadcast(compressor_metadata), "compressor_id")
```

> "Compressor metadata is 10 rows. Sensor readings is 50,000+. Broadcasting the small table sends a copy to every executor node, avoiding an expensive shuffle of the large table across the network."

#### Optimization 4: Adaptive Query Execution (AQE)
- `etl_config.yaml:76` -- `spark.sql.adaptive.enabled: "true"`
- `etl_config.yaml:80` -- `spark.sql.adaptive.coalescePartitions.enabled: "true"`

> "AQE lets Spark re-optimize the execution plan at runtime based on actual data statistics. It coalesces small partitions after shuffles, which reduces the overhead of many tiny tasks."

#### Optimization 5: Arrow Optimization
- `etl_config.yaml:103` -- `spark.sql.execution.arrow.pyspark.enabled: "true"`

> "Arrow columnar data transfer between PySpark and Pandas is significantly faster than the default row-based serialization. Critical when exporting Gold layer DataFrames to Pandas for PostgreSQL writes."

**Bridge to Fabric/Synapse:**

> "My PySpark code uses the same Spark runtime that powers Synapse Spark Pools and Fabric Lakehouses. The Delta Lake format, the medallion architecture, the explicit schemas -- all of it ports directly. The migration path from my local pipeline to Fabric would be: create a Lakehouse with Bronze/Silver/Gold layers, upload existing Delta tables or re-run in Fabric Spark Notebooks, replace PostgreSQL with the Fabric SQL Endpoint, and orchestrate with Fabric Data Pipelines instead of local scripts. The YAML configuration pattern means I only update connection strings, not pipeline logic."

---

### JD Bullet 4: "Monitor and ensure the reliability and performance of data systems -- ensuring seamless execution of ETL/ELT pipelines and batch processes"

**Your Evidence:**

You built monitoring and reliability into the pipeline itself, not as an afterthought.

**Code References:**

#### Data Quality Framework
- `schema.sql:171-187` -- `data_quality_metrics` table with four dimensions:
  - `freshness` -- Is the data recent?
  - `completeness` -- Are readings missing?
  - `consistency` -- Does the schema match?
  - `accuracy` -- Are values within expected ranges?
- `schema.sql:176` -- CHECK constraint: `metric_type IN ('freshness', 'completeness', 'consistency', 'accuracy')`
- `schema.sql:179` -- JSONB `details` column for flexible metadata about each quality check

#### Quality Thresholds
- `etl_config.yaml:49-61`:
  - `max_missing_rate: 0.05` -- Alert if more than 5% of readings are missing
  - `outlier_std_threshold: 4.0` -- 4 standard deviations (more conservative than typical 3-sigma)
  - `freshness_sla_minutes: 15` -- Alert if latest reading is older than 15 minutes

#### Pipeline Reliability
- `etl_config.yaml:126-129` -- Retry logic: `max_retries: 3`, `retry_delay_seconds: 60`
- `etl_config.yaml:114` -- Batch processing: `compressor_batch_size: 5` (process in groups to manage memory)

#### Observability
- `utils.py:306-328` -- `Timer` context manager for timing every pipeline stage
- `utils.py:335-359` -- `log_dataframe_stats()` logs row count, column count, and partition count at each stage
- `utils.py:36-70` -- Structured logging with timestamps: `2024-02-05 10:30:15 [INFO] ETL pipeline started`

**Talking Point:**

> "I built a four-dimensional data quality framework: freshness, completeness, consistency, and accuracy. Each dimension has a dedicated threshold. For example, I use 4 standard deviations for outlier detection instead of the typical 3-sigma. In an industrial setting like compression, brief sensor spikes are operationally normal -- a compressor cycling on and off can spike vibration momentarily. Using 3-sigma would generate too many false positives and cause alert fatigue."

**If Asked About Alert Fatigue:**

Reference your alert aggregation rules (`thresholds.yaml:169-174`):
- Group alerts within 30-minute windows
- Max 5 alerts per compressor per window
- Auto-resolve after 3 consecutive normal readings (`thresholds.yaml:178-180`)

> "Alert fatigue is a real problem in industrial monitoring. My alert configuration groups similar alerts within a 30-minute window and caps at 5 per compressor. Alerts auto-resolve when 3 consecutive normal readings come in. This means operators see actionable alerts, not noise."

---

### JD Bullet 5: "Develop a strong understanding of data models to support efficient data storage, transformation, and retrieval processes"

**Your Evidence:**

You designed a complete PostgreSQL schema optimized for time-series workloads with sophisticated indexing.

**Code References:**

#### Schema Design
- `schema.sql` -- 7 tables, 3 views, 15 indexes, 1 trigger, 1 PL/pgSQL function (343 lines)

#### Key Design Decisions

**Decision 1: Aggregated Storage (83% Volume Reduction)**
- `schema.sql:64` -- Comment: "Storing hourly aggregates instead of raw 10-min readings to reduce volume"
- 10-minute readings for 10 compressors over 7 days = 100,800 rows
- Hourly aggregates for 3 windows = ~5,040 rows (83% reduction)
- Raw data stays in Delta Lake for audit trail; PostgreSQL gets only what the dashboard needs

**Decision 2: Multi-Window Discriminator Pattern**
- `schema.sql:69` -- `window_type VARCHAR(10) NOT NULL CHECK (window_type IN ('1hr', '4hr', '24hr'))`
- Single `sensor_readings_agg` table with a `window_type` discriminator column instead of 3 separate tables
- Advantages: Simpler ETL write logic, easy to add new window types, single index serves all patterns
- Tradeoff: Slightly larger indexes, but composite index `(compressor_id, window_type, agg_timestamp DESC)` handles it

**Decision 3: Composite Index Strategy**
- `schema.sql:115` -- `idx_readings_compressor_time ON (compressor_id, agg_timestamp DESC)` -- Most common query: "latest readings for a compressor"
- `schema.sql:116` -- `idx_readings_timestamp ON (agg_timestamp DESC)` -- Time-range queries across fleet
- `schema.sql:117` -- `idx_readings_window_type ON (window_type)` -- Filter by aggregation level
- `schema.sql:118` -- `idx_readings_composite ON (compressor_id, window_type, agg_timestamp DESC)` -- The triple-filter query

**Decision 4: Partial Index on Unresolved Alerts**
- `schema.sql:169` -- `idx_alert_unresolved ON (resolved, alert_timestamp DESC) WHERE resolved = FALSE`
- Only indexes unresolved alerts (tiny subset of total). Active alert queries are extremely fast because the index is small
- In a system with 10,000 total alerts but only 15 active ones, the partial index is orders of magnitude more efficient

**Decision 5: Views for Common Access Patterns**
- `schema.sql:215-231` -- `v_latest_readings`: Uses PostgreSQL `DISTINCT ON` to get most recent 1hr aggregate per compressor
- `schema.sql:235-254` -- `v_active_alerts`: Joins alert_history with compressor_metadata and station_locations
- `schema.sql:258-292` -- `v_fleet_health_summary`: Complete fleet overview with health status logic (`critical` > `warning` > `healthy`)

**Decision 6: JSONB for Flexible Metadata**
- `schema.sql:179` -- `data_quality_metrics.details JSONB` -- Flexible quality check metadata
- `schema.sql:198` -- `ml_predictions.features_used JSONB` -- Store which features the model used (enables model lineage)

**Talking Point:**

> "I designed a multi-window aggregation table using a discriminator pattern -- single table with a `window_type` column for 1hr, 4hr, and 24hr aggregates. This is more maintainable than three separate tables because the ETL write logic is simpler and adding new window types is just a new value, not a new table. I also used partial indexing -- the unresolved alerts index with `WHERE resolved = FALSE` -- so active alert queries are extremely fast even when the table has thousands of historical alerts."

**If Asked About Scaling:**

> "At Archrock's scale with thousands of compressors, I'd partition `sensor_readings_agg` by month using PostgreSQL's native table partitioning. The composite index on `(compressor_id, window_type, agg_timestamp DESC)` already supports partition pruning. On Azure, I'd move to Fabric SQL Endpoint or Azure SQL with columnstore indexes for analytical queries."

---

### JD Bullet 6: "Implement, manage, and optimize machine learning models, working closely with data scientists on tasks such as training, deployment, evaluation, and monitoring"

**Your Evidence:**

You designed the ML infrastructure and feature engineering pipeline, even though the LSTM model itself is the next phase.

**Code References:**

#### ML-Ready Feature Engineering
- `schemas.py:134-195` -- GOLD_SCHEMA with 24 feature columns designed for ML:
  - **Rolling window statistics** (lines 146-167): `vibration_1hr_mean`, `vibration_1hr_std`, `vibration_1hr_max`, `temp_4hr_mean`, `pressure_24hr_mean` -- Captures both short-term anomalies and long-term degradation trends
  - **Rate of change** (line 172): `temp_1hr_delta` -- Temperature gradient in F/hour. Failing compressors show consistent positive delta
  - **Derived metrics** (line 175): `pressure_differential` -- Discharge minus suction pressure. Indicates compression ratio health
  - **Threshold flags** (lines 179-181): `vibration_status`, `temp_status`, `pressure_status` -- Categorical features for model input
  - **Time features** (lines 185-191): `hour_of_day`, `day_of_week`, `is_weekend` -- Temporal patterns (compressors behave differently during day vs night operations)

#### ML Prediction Infrastructure
- `schema.sql:189-209` -- `ml_predictions` table ready for model output:
  - `rul_days DECIMAL(10, 2)` -- Remaining Useful Life in days (line 194)
  - `failure_probability DECIMAL(5, 4)` -- 0 to 1 with CHECK constraint (line 195)
  - `confidence_score DECIMAL(5, 4)` -- Model confidence with CHECK constraint (line 196)
  - `model_version VARCHAR(50)` -- Track which model version made the prediction (line 197)
  - `features_used JSONB` -- Store exact features used for this prediction (line 198) -- enables model debugging and A/B testing
- `schema.sql:208` -- Partial index: `idx_predictions_rul ON (rul_days) WHERE rul_days < 30` -- Fast lookup for compressors approaching failure

#### Failure Simulation for Training Data
- `compressor_simulator.py:73-75` -- Two failure compressors with staggered degradation:
  - COMP-003: Degradation starts Day 3, failure Day 6
  - COMP-007: Degradation starts Day 5, failure Day 8 (estimated)
- `compressor_simulator.py:99-133` -- Three distinct degradation patterns for labeled training data

#### ML Dependencies
- `requirements.txt` includes: TensorFlow 2.15.0, scikit-learn 1.4.0, ONNX 1.15.0, scipy 1.12.0

**Talking Point:**

> "I designed the Gold layer specifically to produce ML-ready features. The rolling window statistics at three time horizons -- 1 hour, 4 hours, 24 hours -- serve different purposes. The 1-hour window captures sudden anomalies like a bearing starting to fail. The 24-hour window captures long-term degradation trends. The temperature rate of change is particularly powerful -- in my simulation, failing compressors show a consistent positive temperature gradient starting 3 days before failure. For the model architecture, I'm planning an LSTM that takes a 24-hour sliding window of these features as input and predicts Remaining Useful Life in days. ONNX export enables deployment to both cloud inference endpoints and edge devices."

**If Asked About Model Monitoring:**

> "The `ml_predictions` table stores `model_version` and `features_used` as JSONB for every prediction. This enables A/B comparison between model versions. For drift detection, I'd use KS tests on the input feature distributions and Population Stability Index on the prediction distribution. The `scipy` library in my requirements includes these statistical tests. A PSI above 0.25 would trigger retraining."

---

### JD Bullet 7: "Collaborate with stakeholders to define data processing requirements and ensure alignment with business objectives"

**Your Evidence:**

You externalized all business logic to stakeholder-readable configuration.

**Code References:**

- `thresholds.yaml` -- 223 lines of stakeholder-readable threshold definitions with:
  - **Plain English descriptions** for every sensor (e.g., line 17: "High vibration indicates bearing wear, misalignment, or imbalance")
  - **Business rationale** for each threshold (e.g., line 20: "Noticeable vibration, schedule inspection")
  - **Units** for every metric (mm/s, F, PSI, HP, Mcf/day)
- `etl_config.yaml:29-46` -- Feature engineering parameters are configurable, not hardcoded:
  - Window sizes adjustable without code changes (short/medium/long)
  - Rate of change lookback periods configurable
- `thresholds.yaml:149-180` -- Alert rules with business-defined escalation:
  - Critical alerts escalate after 15 minutes
  - Warning alerts escalate after 60 minutes
  - Auto-resolve after 3 consecutive normal readings

**Talking Point:**

> "I externalized all business logic to YAML configuration files. A domain expert -- say an operations manager at Archrock -- could adjust the vibration warning threshold from 6.0 to 5.5 mm/s in the YAML file without touching any Python code. This separates domain knowledge from engineering implementation. In practice, this means I can collaborate with operations teams by reviewing threshold configurations together rather than walking through code."

**Bridge to Archrock:**

> "With Archrock's TOPS and NGCS acquisitions bringing in different equipment fleets, threshold calibration per model type becomes critical. My configuration structure already supports per-model specifications -- the `compressor_models` section in thresholds.yaml defines rated horsepower and type for each model. Extending this to model-specific thresholds is straightforward."

---

### JD Bullet 8: "Apply principles from machine learning practices to solve practical business challenges using structured and unstructured data"

**Your Evidence:**

Your failure simulation demonstrates understanding of the business problem and its financial impact.

**Code References:**

- `compressor_simulator.py:73-75` -- Two compressors fail with realistic patterns
- `compressor_simulator.py:210-219` -- Failure events include `downtime_hours: random.uniform(12, 24)` -- a single failure causes 12-24 hours of downtime
- `compressor_simulator.py:217` -- Failure description: "Bearing failure detected - high vibration levels" -- realistic root cause

**Business Impact Framing:**

> "Each unplanned compressor shutdown at Archrock's scale can cost $50,000 to $100,000 per day in lost throughput, emergency dispatch, and repair costs. A compressor that's down for 24 hours at a key Permian Basin gathering station directly impacts gas delivery commitments. If my RUL model predicts failure 3 days in advance with 90%+ accuracy, operations can schedule maintenance during a planned downtime window, pre-order parts, and dispatch the right technician. That converts a $100K emergency into a $15K scheduled maintenance event."

**If Asked for Specific ML Approach:**

> "The approach is supervised learning using the labeled failure data from the simulator. I'd train an LSTM on 24-hour sliding windows of Gold layer features -- the 20 rolling window statistics, the rate of change metrics, and the time features. The target variable is days until failure (RUL). For deployment, I'd use ONNX to export the model from TensorFlow, enabling inference on both Azure ML endpoints for batch scoring and potentially edge devices at compressor sites for real-time scoring. The `ml_predictions` table is already designed to store the output."

---

### JD Bullet 9: "Stay updated on emerging trends in the data engineering and machine learning domains"

**Your Evidence:**

Your technology choices reflect current industry trends, not legacy patterns.

| Trend | Your Implementation |
|-------|---------------------|
| **Medallion Architecture** | Bronze/Silver/Gold with Delta Lake -- the pattern adopted by Databricks and Microsoft Fabric |
| **Delta Lake 3.0** | ACID transactions on data lakes, schema evolution, time travel -- replacing legacy Hive tables |
| **PySpark 3.5.0** | Latest stable release with AQE, Arrow optimization |
| **ONNX** | Cross-platform ML model deployment -- train in TensorFlow, deploy anywhere |
| **Infrastructure as Code** | Terraform planned for Azure deployment (referenced in requirements.txt) |
| **Lakehouse Architecture** | Combining data lake (Delta) with warehouse (PostgreSQL/SQL Endpoint) -- the Fabric vision |
| **Data Quality as Code** | Programmatic quality checks with configurable thresholds, not manual spot-checks |

**Talking Point:**

> "I chose Delta Lake specifically because it's the native format for Microsoft Fabric Lakehouses. As Archrock moves from Synapse to Fabric, having data already in Delta format eliminates a migration step. Similarly, I chose ONNX for model export because it's platform-agnostic -- the same model works on Azure ML, Databricks, or even edge inference on compressor site hardware."

---

### Required Skill 1: "Proficiency in Python programming with the ability to debug, maintain, and enhance existing codebases"

**Your Evidence:**

- `compressor_simulator.py` -- 313 lines, OOP design with CompressorSimulator class
- `schemas.py` -- 337 lines, reusable schema definitions with validation functions
- `utils.py` -- 411 lines, utility module with config management, Spark session, timing, logging
- `schema.sql` -- 343 lines of PostgreSQL DDL

Total: ~1,400 lines of well-documented, production-structured Python code with type hints, docstrings, and modular architecture.

---

### Required Skill 2: "Experience with PySpark for distributed data processing and data engineering tasks"

**Your Evidence:**

See JD Bullet 3 above. Five specific PySpark optimization patterns with code references.

Key point: "My PySpark code is portable to Synapse Spark Pools and Fabric Lakehouses without modification because I use the same Spark runtime and Delta Lake format."

---

### Required Skill 3: "Familiarity with Microsoft Fabric and Azure Synapse Analytics"

**Honest Bridge:**

> "I haven't used Fabric or Synapse in production yet, but I designed Altaviz to be Fabric-ready by architecture. My PySpark code uses the same Spark 3.5 runtime, Delta Lake is the native Lakehouse format, and the medallion architecture maps directly to how Fabric organizes data. The migration path from my local pipeline would be: create a Fabric workspace with a Lakehouse, upload the Delta tables to OneLake, run my notebooks in Fabric Spark, and replace PostgreSQL with the Fabric SQL Endpoint. I've studied the Fabric Data Engineering documentation and understand the key differences -- OneLake's single-copy architecture, Spark compute autoscaling, and the SQL Endpoint for T-SQL analytics."

---

### Required Skill 4: "Strong understanding of relational and non-relational data models"

**Your Evidence:**

- **Relational**: PostgreSQL schema with 7 normalized tables, foreign keys, CHECK constraints, views (`schema.sql`)
- **Semi-structured**: JSONB columns for flexible metadata (`data_quality_metrics.details`, `ml_predictions.features_used`)
- **Columnar/Lake**: Delta Lake on Parquet format with partitioning by date
- **Star Schema elements**: Dimension tables (`station_locations`, `compressor_metadata`) + Fact tables (`sensor_readings_agg`, `alert_history`)

---

### Required Skill 5: "Solid grasp of ML lifecycle concepts and experience in implementing machine learning models in a production environment"

**Your Evidence:**

See JD Bullet 6 above. Your implementation covers:
- **Data preparation**: Feature engineering in Gold layer (20+ features)
- **Model training**: Labeled failure data from simulator, LSTM architecture planned
- **Model deployment**: ONNX for cross-platform inference
- **Model monitoring**: `ml_predictions` table with `model_version`, `features_used`, and drift detection via KS test / PSI
- **Model lineage**: Every prediction stores which model version and features produced it

---

## 5. STAR-Format Answers

Practice these out loud. Each should take 60-90 seconds to deliver.

---

### STAR 1: "Tell me about a time you optimized a data pipeline"

**Situation**: My PySpark ETL pipeline was initially processing 50K sensor readings very slowly because I was using schema inference and chained `.withColumn()` calls.

**Task**: I needed to achieve sub-90-second processing for near-real-time requirements.

**Action**: I implemented three optimizations. First, I replaced `inferSchema` with explicit `StructType` schemas defined in a dedicated module (`schemas.py`), which eliminated a full-file scan. Second, I replaced 12 chained `.withColumn()` calls with a single `.select()` statement that lets Spark's Catalyst optimizer see all transformations at once. Third, I enabled Adaptive Query Execution in my Spark config to dynamically optimize join strategies at runtime.

**Result**: Pipeline execution time dropped significantly. More importantly, the explicit schema pattern catches data quality issues at load time -- if a column type changes upstream, the pipeline fails fast with a clear error instead of silently producing wrong results downstream.

---

### STAR 2: "Tell me about a data model you designed"

**Situation**: I needed to store time-series sensor data from 10 compressors at three aggregation windows (1hr, 4hr, 24hr) in PostgreSQL for a real-time dashboard.

**Task**: Design a schema that supports fast time-range queries while keeping storage manageable.

**Action**: I chose a discriminator pattern -- a single `sensor_readings_agg` table with a `window_type` column -- instead of three separate tables. I created four composite indexes optimized for the most common query patterns. I stored hourly aggregates rather than raw 10-minute readings, reducing volume by 83%. I also designed three views that encapsulate the most common access patterns -- latest readings, active alerts, and fleet health summary.

**Result**: Dashboard queries return under 100ms. The single-table design simplified ETL writes and made it trivial to add new window types. The partial index on unresolved alerts means the active alert query is fast even when the table has thousands of historical records.

---

### STAR 3: "Describe your experience with distributed data processing"

**Situation**: I built an ETL pipeline for compressor sensor data that needed to transform raw readings into ML-ready features through a medallion architecture.

**Task**: Process raw Parquet data through Bronze (raw), Silver (cleaned), and Gold (feature-engineered) layers using PySpark with Delta Lake.

**Action**: I used PySpark's window functions with `rangeBetween` for rolling aggregations across three time horizons. I defined window specs once and reused them for all aggregate calculations. I used broadcast joins for the small metadata table. I partitioned the Gold layer by date for efficient time-range queries. Delta Lake provided ACID transactions so if the pipeline failed mid-write, the previous valid state remained intact.

**Result**: The pipeline handles 50K+ records through three transformation layers. Delta Lake's time-travel capability means I can query any historical version for debugging, and the audit trail from Bronze through Gold provides full data lineage.

---

### STAR 4: "How do you ensure data quality?"

**Situation**: Sensor data from compressors can have missing readings (communication failures), outliers (sensor malfunctions), and schema drift.

**Task**: Build quality gates into the ETL pipeline that catch issues before they reach the dashboard or ML models.

**Action**: I implemented a four-dimensional quality framework tracked in a dedicated `data_quality_metrics` table: freshness (15-minute SLA), completeness (max 5% missing rate), consistency (programmatic schema validation), and accuracy (4 standard deviation outlier detection). The Silver layer rejects records that fail these checks and logs them for investigation. I also built alert aggregation rules to prevent alert fatigue -- grouping similar alerts within 30-minute windows and capping at 5 per compressor.

**Result**: The Data Quality page on the dashboard gives operators real-time visibility into pipeline health. The 4-sigma threshold is more conservative than typical 3-sigma, reducing false positives. In an industrial setting, brief sensor spikes from compressor cycling are normal and shouldn't trigger alerts.

---

### STAR 5: "Tell me about a time you learned a new domain quickly"

**Situation**: I wanted to build a predictive maintenance platform that was domain-authentic, not a toy demo.

**Task**: Learn enough about natural gas compression to simulate realistic sensor data, choose meaningful thresholds, and model realistic failure patterns.

**Action**: I studied API 618 (reciprocating compressor standards) and ISO 10816 (vibration severity guidelines). I researched the specific compressor models in Archrock's fleet -- Ajax DPC-360, Ariel JGK/4, Caterpillar G3516, Waukesha 7042GSI -- and modeled their actual horsepower ratings and cylinder configurations. I designed three distinct degradation patterns based on real failure modes: exponential vibration increase (bearing wear), linear temperature rise (fouling), and sinusoidal pressure fluctuations (valve degradation).

**Result**: The simulator generates data that matches real-world patterns closely enough to train meaningful ML models. Domain experts can look at the thresholds and sensor ranges and recognize them as realistic. This domain knowledge is what separates my project from a generic time-series demo.

---

### STAR 6: "How would you handle migrating from Azure Synapse to Microsoft Fabric?"

**Situation**: (Frame as Altaviz's cloud deployment plan) My pipeline currently runs PySpark locally with Delta Lake, and the natural next step is cloud deployment on Fabric.

**Task**: Design a migration path that preserves the existing architecture and code.

**Action**: The key insight is that Fabric Lakehouses use the same Spark runtime and Delta Lake format I already use. So the migration is: (1) create a Fabric workspace with a Lakehouse, (2) upload existing Delta tables to OneLake or re-run the pipeline in Fabric Spark Notebooks, (3) replace PostgreSQL with the Fabric SQL Endpoint for dashboard queries, (4) orchestrate with Fabric Data Pipelines instead of local scripts. My YAML configuration pattern means I only need to update connection strings and paths, not pipeline logic. The same PySpark code runs in both environments.

**Result**: This architectural foresight is why I chose Delta Lake and PySpark from day one -- they're portable. The medallion architecture I implemented is the same pattern Fabric recommends in their documentation.

---

### STAR 7: "Describe a project you built end-to-end"

**Situation**: I wanted to demonstrate production-ready data engineering skills for the energy industry.

**Task**: Build a complete MLOps platform -- from data generation through ETL processing to visualization -- for predictive maintenance of natural gas compressors.

**Action**: I built Altaviz in layers. First, a data simulator that generates 50K+ realistic sensor readings for 10 compressors with simulated failures. Second, a PySpark ETL pipeline with medallion architecture (Bronze/Silver/Gold) using Delta Lake. Third, a PostgreSQL database with 7 tables, 3 views, and 15 optimized indexes. Fourth, a Streamlit dashboard with fleet map, real-time gauges, alert management, and data quality monitoring. Fifth, ML infrastructure including feature engineering (20+ features from rolling windows) and a predictions table ready for LSTM integration. The entire system is configured through YAML files and uses Docker Compose for infrastructure.

**Result**: A complete, working platform that demonstrates every layer of an MLOps system. It uses the same equipment models, sensor types, and geographic regions as Archrock's actual operations.

---

### STAR 8: "Tell me about a design decision where you chose simplicity over complexity"

**Situation**: I needed to decide between a streaming architecture (Kafka + Spark Structured Streaming) and batch processing for my ETL pipeline.

**Task**: Choose the right processing paradigm for compressor health monitoring.

**Action**: I chose batch processing with hourly ETL runs. Compressor health doesn't change second-to-second -- degradation is a multi-day process. Near-real-time (hourly) is sufficient to detect problems before they become failures. Batch is simpler to debug, test, and operate. My configuration already supports upgrading to streaming later (`etl_config.yaml` has `enable_checkpointing: true`), but starting with batch gives me a working system faster with fewer failure modes.

**Result**: The batch approach reduced implementation complexity significantly while still meeting the business need. This follows the principle of starting with the simplest architecture that works, then adding complexity only when there's a clear need. If Archrock needed sub-minute alerting for specific scenarios, I could add a streaming layer alongside the batch pipeline.

---

## 6. Technical Questions Kunal Is Likely to Ask

---

### Q1: "Walk me through your ETL pipeline architecture."

**Answer framework** (2-3 minutes):

Start with the big picture:
> "My pipeline follows a medallion architecture with four stages."

Then walk through each:

1. **Data Generation**: Simulator creates 50K+ sensor readings as Parquet files -- vibration, temperature, pressure, horsepower, gas flow at 10-minute intervals for 10 compressors
2. **Bronze Layer**: Load raw Parquet with explicit schema (no transformation, just add load timestamp). Write to Delta Lake in append mode. This is the immutable audit trail
3. **Silver Layer**: Clean the data -- remove nulls (up to 5% acceptable), detect outliers (4 standard deviations), validate schema, log rejected records. Write to Delta Lake in overwrite mode
4. **Gold Layer**: Feature engineering -- rolling window aggregations at 1hr/4hr/24hr, rate of change calculations, threshold flags, time features. Partitioned by date for efficient queries. This produces ML-ready features
5. **PostgreSQL Export**: Aggregate Gold data to hourly windows, write to `sensor_readings_agg` table, generate alerts from threshold violations, update data quality metrics
6. **Dashboard**: Streamlit reads from PostgreSQL views to show fleet health, real-time monitoring, alerts, and data quality

End with a key architectural decision:
> "A critical design choice was storing aggregates in PostgreSQL, not raw readings. This reduces volume by 83% while keeping the raw data in Delta Lake for audit and reprocessing."

---

### Q2: "Why did you choose Delta Lake over plain Parquet?"

> "Four reasons: ACID transactions, time travel, schema enforcement, and Fabric compatibility.
>
> ACID transactions mean if my pipeline fails mid-write, the table isn't corrupted -- it stays at the last valid state. Time travel lets me query any historical version for debugging: `spark.read.format('delta').option('versionAsOf', 5).load(path)`. Schema enforcement prevents bad data from entering the table -- if a column type changes upstream, the write fails with a clear error. And Delta Lake is the native format for Microsoft Fabric Lakehouses, so my data is already in the format Archrock's target platform uses."

---

### Q3: "How would your system scale from 10 compressors to 4,500+ compressors?"

This is the Archrock bridge question. Key points:

> "I designed for this. Here's the scaling path:
>
> **Compute**: Move from `local[*]` to a Fabric Spark Pool with autoscaling. My batch processing already groups compressors in batches of 5 (`etl_config.yaml` line 114). For 4,500 compressors, I'd increase the batch size and let Spark parallelize across more executors.
>
> **Data Volume**: 10 compressors produce 100K readings/week. 4,500 would produce ~45M. Delta Lake's partition pruning by date and compressor_id handles this. I'd add compressor_id-based partitioning at the Silver and Gold layers.
>
> **Database**: Move from single PostgreSQL to Azure SQL with columnstore indexes, or use Fabric's SQL Endpoint directly. Add monthly table partitioning on `sensor_readings_agg`.
>
> **Pipeline**: Fabric Data Pipelines for orchestration with parallel compressor batch processing. Event-driven triggers instead of scheduled runs.
>
> **Real-time**: If sub-minute alerting is needed for specific scenarios, add a streaming layer with Azure Event Hubs feeding Spark Structured Streaming. The batch pipeline continues for feature engineering and ML training."

---

### Q4: "What's your experience with Microsoft Fabric?"

Be honest, then bridge confidently:

> "I haven't used Fabric in production yet, but I designed Altaviz to be Fabric-compatible by architecture. My PySpark code, Delta Lake format, and medallion architecture are the same stack that Fabric Lakehouses are built on. I've studied the Fabric documentation and understand the key components: OneLake for unified storage, Spark notebooks for transformation, SQL Endpoints for analytics, and Data Pipelines for orchestration.
>
> What I understand about the Synapse-to-Fabric migration path -- which I believe Archrock is going through -- is that Synapse Spark Pools map to Fabric Spark compute, Synapse SQL Pools map to Fabric Warehouse or SQL Endpoint, and the medallion architecture persists as the recommended data organization pattern. My pipeline would need connection string updates, not code rewrites."

---

### Q5: "How do you think about data quality in a pipeline?"

> "Data quality isn't a separate step -- it's embedded throughout the pipeline. I think about it in four dimensions:
>
> **Freshness**: Is the data recent? I have a 15-minute SLA. If the latest reading is older than 15 minutes, something is wrong with the sensor or the ingestion.
>
> **Completeness**: Are readings missing? I accept up to 5% missing rate. Beyond that, the aggregations become unreliable.
>
> **Consistency**: Does the data match the expected schema? My `validate_sensor_schema` function checks column names, types, and nullability programmatically.
>
> **Accuracy**: Are values within physically possible ranges? I use 4 standard deviations for outlier detection. More conservative than 3-sigma because in compression operations, brief sensor spikes during compressor cycling are normal. I don't want to reject valid operational data.
>
> Each check is logged to the `data_quality_metrics` table with JSONB details for debugging, and surfaced on the Data Quality dashboard page."

---

### Q6: "Tell me about your ML approach for predictive maintenance."

> "My approach is in three layers:
>
> **Feature engineering** (implemented): The Gold layer produces 20+ features from rolling window statistics at three time horizons, rate of change calculations, pressure differentials, and temporal features. These capture both sudden anomalies (1-hour window) and long-term degradation trends (24-hour window).
>
> **Model architecture** (designed): An LSTM neural network that takes a 24-hour sliding window of features as input. LSTMs are well-suited for sequential sensor data because they can learn temporal dependencies -- like how vibration gradually increases over days before a bearing failure. The target variable is Remaining Useful Life (RUL) in days.
>
> **Deployment** (planned): ONNX export from TensorFlow enables deployment on Azure ML for batch scoring and potentially edge inference at compressor sites. The `ml_predictions` table stores every prediction with the model version and features used, enabling A/B testing between model iterations and drift detection via KS tests."

---

### Q7: "How do you handle schema evolution?"

> "At the Delta Lake level, schema enforcement rejects writes that don't match the table schema. For intentional changes, `.option('mergeSchema', 'true')` adds new columns without breaking existing data.
>
> At the Python level, my `validate_sensor_schema` function in `schemas.py` provides programmatic validation -- it checks that all required columns exist and types match. If the upstream data source adds a column, the schema validation will pass (new column is just extra), but if it removes or renames a column, the validation fails with a specific error message.
>
> For downstream consumers, the PostgreSQL views decouple the dashboard from the physical schema. If I add a column to `sensor_readings_agg`, the views only need updating if the dashboard needs the new column. This provides a stable API for the dashboard layer."

---

### Q8: "What would you do in your first 90 days at Archrock?"

> "**First 30 days**: Understand the existing data infrastructure. Map the data flow from Detechtion telemetry through the current Synapse/Fabric pipeline to dashboards and reporting. Learn the compressor fleet specifics -- how many units, which models, how telemetry data differs between gas-driven and electric motor-driven units. Meet with the operations team to understand what questions they need the data to answer.
>
> **Days 30-60**: Start contributing to the Fabric migration. Use my PySpark and Delta Lake experience to help optimize existing pipelines. Identify quick wins -- maybe schema optimization, indexing improvements, or quality monitoring gaps. Start building relationships with the team.
>
> **Days 60-90**: Take ownership of a specific pipeline or data product. Propose improvements based on what I've learned about the data and the business needs. By day 90, I want to have shipped something measurable -- a faster pipeline, a new monitoring capability, or a data quality improvement that operations can see."

---

## 7. Questions to Ask Kunal

Pick 3-4 from these categories. Quality matters more than quantity.

### Technical Architecture (pick 1-2)

1. **"Where are you in the Synapse to Fabric migration journey, and what has been the biggest technical challenge?"**
   - Shows you know about the migration. Lets you assess the team's maturity and where you'd fit in

2. **"With the TOPS and NGCS acquisitions adding significant fleet capacity, how are you approaching data integration from different telemetry systems?"**
   - Shows you tracked the $1.3B in acquisitions. The integration challenge is real and directly relevant to your skills

3. **"How does telemetry data flow from Detechtion devices on compressors to your analytics platform? What's the current latency?"**
   - Technical depth question. Shows you understand the edge-to-cloud journey

### Team and Role (pick 1)

4. **"How is the data engineering team structured? What does a typical sprint look like?"**
   - Understand team dynamics and work style

5. **"What does success look like for this role in the first 6 months?"**
   - Shows you're outcome-oriented and want to deliver value quickly

### AI Strategy (pick 1)

6. **"You mentioned on the AI SuccessFactors podcast that aligning AI with strategic goals is critical. What's the biggest AI use case you're most excited about for Archrock this year?"**
   - Reference the podcast naturally. Shows you did your homework. Gets Kunal talking about his vision (people like talking about their vision)

7. **"How do field technicians currently consume the data your team produces? What does the feedback loop look like between data engineering and field operations?"**
   - Directly references Kunal's podcast theme of "empowering technicians with actionable insights"

### Business Impact (pick 1 if time allows)

8. **"What's the current ratio of reactive vs. predictive maintenance across the fleet, and where do you want it to be?"**
   - Shows you understand the business case for predictive maintenance and want to know the target state

---

## 8. Technical Reference Cards

Review these the morning of the interview.

---

### Card 1: PySpark Optimization Patterns

| Pattern | What | Why | Code Reference |
|---------|------|-----|----------------|
| Explicit Schemas | `spark.read.schema(SENSOR_SCHEMA).parquet(path)` | 10-100x faster than inferSchema | `schemas.py:37-78` |
| Single Select | `df.select(col("*"), expr(...).alias("new"))` | Single pass vs N passes | `agents.md:354-392` |
| Broadcast Join | `large.join(broadcast(small), "key")` | Avoid shuffle of large table | CLAUDE.md |
| AQE | `spark.sql.adaptive.enabled=true` | Runtime optimization | `etl_config.yaml:76` |
| Arrow | `spark.sql.execution.arrow.pyspark.enabled=true` | Fast PySpark-Pandas transfer | `etl_config.yaml:103` |
| Partition Pruning | `gold_df.write.partitionBy("date")` | Only read relevant date partitions | `etl_config.yaml:110` |

---

### Card 2: Delta Lake Key Concepts

| Concept | Detail |
|---------|--------|
| **ACID** | Atomic writes -- partial failures don't corrupt tables |
| **Time Travel** | `.option("versionAsOf", N)` -- query any historical version |
| **Schema Enforcement** | Rejects writes that don't match table schema |
| **Schema Evolution** | `.option("mergeSchema", "true")` -- add columns safely |
| **VACUUM** | Cleanup old files after retention period (7 days in my config) |
| **Fabric Native** | Delta is the native format for Fabric Lakehouses and OneLake |
| **Config Reference** | `database.yaml:57-68` -- checkpoint, retention settings |

---

### Card 3: Medallion Architecture

| Layer | Purpose | Format | Mode |
|-------|---------|--------|------|
| **Bronze** | Raw data, add load timestamp, no transformation | Delta Lake | Append |
| **Silver** | Clean, validate, remove nulls (<5%), outlier detection (4-sigma) | Delta Lake | Overwrite |
| **Gold** | Feature engineering, rolling windows, threshold flags, partitioned by date | Delta Lake | Partitioned write |
| **PostgreSQL** | Hourly aggregates for dashboard, 83% volume reduction from raw | Relational | Upsert |

---

### Card 4: PostgreSQL Schema Summary

| Table | Purpose | Key Design Choice |
|-------|---------|-------------------|
| `station_locations` | 4 Texas stations with lat/long | Dimension table |
| `compressor_metadata` | 10 units, FK to station | Trigger auto-updates `updated_at` |
| `sensor_readings_agg` | Core fact table, 3 window types | Discriminator pattern (`window_type` column) |
| `maintenance_events` | Scheduled + failure logs | CHECK constraint on `event_type` |
| `alert_history` | Threshold violations and anomalies | **Partial index** on `resolved=FALSE` |
| `data_quality_metrics` | Pipeline monitoring | **JSONB** `details` column |
| `ml_predictions` | RUL predictions (future) | **JSONB** `features_used` for model lineage |

**Views**: `v_latest_readings` (DISTINCT ON), `v_active_alerts` (3-table JOIN), `v_fleet_health_summary` (health status logic)

**Total**: 7 tables, 3 views, 15 indexes, 1 trigger, 1 function

---

### Card 5: Archrock Quick Facts

| Fact | Detail |
|------|--------|
| **What** | Largest U.S. natural gas compression services provider |
| **Fleet** | 4.5M+ operating horsepower |
| **Employees** | 1,300+ |
| **Acquisitions** | $1.3B+ in 2024-2025 (TOPS + NGCS) |
| **IIoT** | Detechtion Technologies for remote monitoring |
| **Cloud** | Azure Synapse -> Microsoft Fabric migration |
| **Equipment** | Ajax, Ariel, Caterpillar, Waukesha (same as Altaviz) |
| **Regions** | Every major U.S. oil & gas basin |
| **Digital Spend** | ~$50M in digital transformation (2019-2021) |
| **Interviewer** | Kunal Sharma -- Head of Data Engineering, AI evangelist |

---

### Card 6: Feature Engineering Summary

| Feature Category | Examples | ML Purpose |
|------------------|----------|------------|
| 1hr rolling window | `vibration_1hr_mean`, `vibration_1hr_std`, `vibration_1hr_max` | Detect sudden anomalies |
| 4hr rolling window | `temp_4hr_mean`, `pressure_4hr_mean` | Detect medium-term trends |
| 24hr rolling window | `vibration_24hr_mean`, `temp_24hr_mean` | Detect long-term degradation |
| Rate of change | `temp_1hr_delta` (F/hour) | Detect rapid changes (temperature gradient) |
| Derived metrics | `pressure_differential` (discharge - suction) | Compression ratio health |
| Threshold flags | `vibration_status`, `temp_status` | Categorical ML features |
| Time features | `hour_of_day`, `day_of_week`, `is_weekend` | Temporal patterns |

**Why three time horizons**: 1hr catches sudden failures, 4hr captures developing problems, 24hr shows degradation trends that predict failures days in advance.

---

## 9. Confidence Builders and Closing Strategy

### What You Have That Other Candidates Likely Do Not

1. **A working project in Archrock's exact domain** -- Same compressor manufacturers, same sensor types, same Texas basins. No other candidate likely built a gas compression predictive maintenance platform
2. **Knowledge of Kunal's public positions** -- You can reference his podcast naturally and connect your work to his vision
3. **Fabric-ready architecture** -- Your PySpark/Delta Lake/medallion code ports to Fabric without rewrites
4. **Domain-specific feature engineering** -- Not generic ML, but features designed for compressor health (rolling windows, degradation patterns, threshold flags)
5. **End-to-end thinking** -- From data generation to ETL to database to dashboard to ML predictions

### Closing the Interview

End with genuine enthusiasm tied to their specific mission:

> "Predictive maintenance at Archrock's scale -- 4,500+ compressors across the U.S. -- is exactly the kind of high-impact data engineering challenge I want to work on. I built Altaviz because I wanted to demonstrate that I can think about this problem end-to-end, from sensor to decision. I'm excited about the opportunity to bring that thinking to a team that's actively investing in AI and data platform modernization."

### If You Get Asked "Any Final Questions?"

Use this to end strong:

> "What's the one thing that would make you say, six months from now, 'hiring this person was the right call'?"

This forces Kunal to articulate his real priorities -- and gives you one more chance to connect your skills to what he cares about.

---

## 10. Three-Day Study Schedule

### Day 1 (February 7, Friday)

- [ ] Read this entire training.md document end-to-end
- [ ] Listen to Kunal's AI SuccessFactors podcast episode: search "AI SuccessFactors AI's Impact on Midstream Energy" (31 minutes)
- [ ] Review all Altaviz code files -- focus on the files referenced throughout this document:
  - `src/data_simulator/compressor_simulator.py`
  - `src/etl/schemas.py`
  - `src/etl/utils.py`
  - `infrastructure/sql/schema.sql`
  - `config/etl_config.yaml`
  - `config/thresholds.yaml`
- [ ] Practice your elevator pitch 5 times out loud (aim for 30-40 seconds)

### Day 2 (February 8, Saturday)

- [ ] Focus on STAR answers -- practice all 8 out loud, record yourself and listen back
- [ ] Practice answering the 8 technical questions from Section 6 (aim for 60-90 seconds each)
- [ ] Review PySpark optimization patterns (Card 1) until you can explain each without notes
- [ ] Study Microsoft Fabric documentation:
  - Fabric Lakehouse concepts: OneLake, Delta Lake, Spark notebooks
  - Synapse to Fabric migration path
  - Fabric Data Pipelines for orchestration
- [ ] Review Archrock's website: Services page, Investor page (recent earnings), Careers page

### Day 3 (February 9, Sunday)

- [ ] Focus on Archrock business context -- review recent news (NGCS acquisition, Q4 2024 results)
- [ ] Practice the full mock interview flow:
  1. "Tell me about yourself" (elevator pitch)
  2. 3-4 technical questions
  3. 2-3 behavioral STAR questions
  4. Your questions for Kunal
- [ ] Do a final read of the Reference Cards (Section 8)
- [ ] Select your 3-4 questions for Kunal (Section 7) -- have them written down
- [ ] Get to sleep early

### Day of Interview (February 10, Monday)

- [ ] Morning: Review Reference Cards only (15 minutes)
- [ ] Test Microsoft Teams audio and video 30 minutes before the interview
- [ ] Have Altaviz project open in your IDE in case Kunal asks to see code or you want to screenshare
- [ ] Have this training.md open on a second screen for quick reference
- [ ] Have a glass of water nearby
- [ ] Join 5 minutes early as instructed
- [ ] Business professional shirt, clean background, good lighting

---

## Appendix: Key File Quick Reference

| File | Lines | What to Know |
|------|-------|-------------|
| `src/data_simulator/compressor_simulator.py` | 313 | Sensor ranges (49-71), degradation patterns (99-133), failure IDs (73-75) |
| `src/etl/schemas.py` | 337 | SENSOR_SCHEMA (37-78), GOLD_SCHEMA features (134-195), validation (202-239) |
| `src/etl/utils.py` | 411 | Config loading (77-163), Spark session (170-223), Timer (306-328), DataFrame stats (335-359) |
| `infrastructure/sql/schema.sql` | 343 | Tables (26-209), indexes (115-118, 169), views (214-292), trigger (298-311) |
| `config/etl_config.yaml` | 136 | Window sizes (33-36), quality thresholds (49-61), Spark config (64-103), batch size (114) |
| `config/thresholds.yaml` | 223 | Sensor thresholds (14-71), stations (97-145), alert rules (149-180), compressor models (187-214) |
| `config/database.yaml` | 75 | Connection pooling (32-40), SQLAlchemy (43-53), Delta Lake retention (57-68) |

I. Openers & Behavioral (The "Hook")

1. Tell me about yourself.


Answer: "I’m an AI Engineer with 5+ years of experience in Azure architecture and Python development. Recently, I’ve been consulting in the Energy sector, building secure multi-agent workflows. I combine deep technical skills in MLOps with the domain knowledge to solve compliance and data challenges for regulated industries like Archrock."
+1

2. Why Archrock? What interests you about the industry?

Answer: "I want to work where data impacts physical assets. With your acquisition of NGCS growing the fleet to 4.5M horsepower, I see a massive opportunity to use AI for predictive maintenance and optimizing operations in the Permian Basin. I want to help build the systems that support that scale."

3. Describe a time you learned a new technology quickly.

Answer: "As a consultant, a client needed a private Azure Gateway behind a strict firewall. I quickly mastered the networking config and rewrote Python URL validation logic to ensure secure agent deployment. I delivered compliance without sacrificing functionality."

4. How do you handle a risk you identified?

Answer: "At TestMachine, I noticed ML models could drift without detection. I architected a Policy-as-Code engine to validate outputs against audit trails. This automated check flagged compliance risks before deployment, ensuring data integrity."

5. How do you handle vague requirements from stakeholders?

Answer: "I focus on visualization. I built a FastAPI/React dashboard to show stakeholders exactly how agents were reasoning. Seeing the process clarified the requirements instantly and turned complex logic into clear business insights."

II. Core Tech: Python & Data Engineering (The "Bread and Butter")
6. Walk me through your ETL process. How do you handle failure?

Answer: "I build modular Python pipelines with orchestration like GitHub CI/CD. At my startup, I sanitized heterogeneous data from multiple sources. I always include dead-letter queues for bad data and automated retries, so the pipeline never crashes silently."

7. How do you optimize Python code for performance?

Answer: "I target I/O bottlenecks first. At TestMachine, I used asynchronous processing in FastAPI to handle 10K+ daily requests. For data processing, I refactor loops into vectorized operations using Pandas or NumPy to speed up execution."

8. Experience with Microsoft Fabric & Azure Synapse?


Answer: "I use Synapse for granular control over Spark pools and Fabric for unified analytics—both are core skills of mine. In my consulting work, I’ve architected Azure-native retrieval pipelines that feed clean data from these warehouses directly into downstream AI models."

9. How do you ensure data quality in high-volume systems?

Answer: "I validate at the source using Pydantic for schema enforcement. At my startup, I also implemented data lifecycle policies to clean old data, which improved quality and reduced storage costs by 40%."

10. Experience with PySpark and distributed computing?


Answer: "I use PySpark for datasets that exceed single-machine memory. My focus is minimizing shuffles and optimizing partitions to keep executor nodes efficient. I’ve used it to process large-scale logs in Azure environments."

III. MLOps & AI (The "Growth" Area)
11. How do you take a model from notebook to production?


Answer: "I containerize with Docker for consistency. Then I use GitHub Actions for CI/CD to run tests and evaluation metrics. Finally, I deploy to Azure Kubernetes Service (AKS) with liveness probes to ensure high availability."

12. How do you monitor models in production?

Answer: "I monitor both system health and model quality. At TestMachine, I built LLM-powered Root Cause Analysis into the pipeline. I track data drift and alert the team if production data deviates from training data."

13. Explain Retrieval Augmented Generation (RAG) and how you optimize it.


Answer: "I’ve built RAG pipelines using Azure OpenAI and vector DBs like Pinecone. My key optimization is 'semantic chunking' —breaking text by meaning rather than character count. This drastically improves the relevance of the context retrieved for the LLM."

14. How do you secure AI agents interacting with internal APIs?


Answer: "I strictly use private gateways for API access and sanitize all inputs to prevent prompt injection. I also use Azure’s Role-Based Access Control (RBAC) to limit the agent’s permissions to only what is necessary."

15. Have you worked with Agentic Workflows?


Answer: "Yes, I use LangGraph for multi-agent orchestration. I decouple tasks—one agent retrieves data, another summarizes it. This separation improves accuracy and makes debugging much easier than a single massive prompt."

IV. Senior Scenarios & "Curveballs" (The "Real World")
16. How would you predict failure for our 4.5M HP fleet?

Answer: "I’d use an event-driven architecture. IoT sensors feed Azure Event Hubs, processed by PySpark for anomalies. A predictive model on AKS scores this telemetry in real-time, flagging high-risk assets to field techs before they fail."

17. How do you manage Azure cloud costs?

Answer: "I tag all resources for visibility and use auto-scaling on AKS to avoid paying for idle compute. I also use lifecycle policies to move cold data to cheaper storage, which I’ve successfully done to cut costs by 40%."

18. Describe a complex debugging challenge you solved.

Answer: "I fixed a streaming stability bug in Azure AI Client libraries causing drops. I isolated it in staging, analyzed network traces, and applied a patch that restored 99.9% uptime for the production environment."

19. How do you stay updated on AI trends?

Answer: "I experiment constantly. Recently I’ve been using Ragas for model evaluation and LangGraph for agents. I also follow Azure AI Foundry updates to see what new tools can simplify our stack."

20. Do you have questions for me? (The Closer)

Answer: "With the NGCS acquisition, is your priority integrating their data systems into Archrock’s Azure environment, or are you focused on deploying new predictive maintenance models to the existing fleet first?"

21. (Curveball) How do you fix a crashing legacy codebase with no docs?

Answer: "First, stop the bleeding with logging (Sentry). Second, write characterization tests to lock in current behavior. Third, refactor incrementally, adding type hints and docs as I stabilize it."

22. (Curveball) Fabric vs. Synapse: When to use which?

Answer: "I use Fabric for speed and unified SaaS governance ('OneLake'). I use Synapse when I need granular PaaS control or complex custom networking that Fabric doesn’t support yet."

23. (Curveball) A Data Scientist's code works on their laptop but breaks in prod. What do you do?

Answer: "I pair with them to containerize (Docker) their environment. I check for hard-coded paths and optimize memory usage (switching from loading full datasets to batch generators) so it fits the production CI/CD pipeline."

V. Infrastructure & Architecture (The "Plumbing")
24. How do you manage cloud infrastructure changes? (IaC)


Answer: "I use Terraform to define infrastructure as code. This ensures environments (Dev/Staging/Prod) are identical. I store state files remotely with locking to prevent conflicts, and every change goes through a PR review process."

25. When do you choose a Relational Database vs. NoSQL vs. Vector DB?

Answer: "I use SQL for structured, transactional business data. I use NoSQL/Blob Storage for massive telemetry or sensor logs. I use Vector DBs (like Pinecone/ChromaDB) specifically for AI similarity search in RAG apps."

26. How do you handle sensitive data (PII) or corporate secrets?

Answer: "I never hard-code secrets. I use Azure Key Vault to inject credentials at runtime. For PII, I apply masking or hashing at the ingestion layer so sensitive data never enters the analytics logs."

27. What is your strategy for testing data pipelines?

Answer: "I treat data pipelines like software. I write unit tests for transformations and use validation tools (like Great Expectations) to check for nulls or schema changes before loading, ensuring bad data doesn't pollute the warehouse."

VI. Soft Skills & Situational (The "Human Element")
28. How do you explain technical constraints to non-technical teams?

Answer: "I avoid jargon. Instead of discussing 'latency,' I explain the business impact—e.g., 'the dashboard takes 5 seconds because we are running safety checks.' I make them partners in the trade-off decisions."

29. Prioritize: Production bug, stakeholder request, tech debt fix.

Answer: "Production stability is #1—especially with safety/uptime at stake. I fix the bug first. Next, I unblock the stakeholder. I schedule tech debt for the next sprint unless it’s the direct cause of the bug."

30. Tell me about a time you disagreed with a technical decision.

Answer: "At my startup, a peer wanted a complex framework. I disagreed due to maintenance costs. I prototyped both to compare speed. Data showed the simpler approach was faster, and we moved forward. I focused on the outcome, not the argument."

---
