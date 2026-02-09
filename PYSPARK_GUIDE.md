# PySpark ETL Pipeline Guide

Complete guide to understanding and running the Altaviz PySpark ETL pipeline.

---

## Table of Contents

1. [Key Concepts](#key-concepts)
2. [Why PySpark?](#why-pyspark)
3. [Delta Lake vs Data Lake](#delta-lake-vs-data-lake)
4. [What is ACID?](#what-is-acid)
5. [Pipeline Architecture](#pipeline-architecture)
6. [Running the Pipeline](#running-the-pipeline)
7. [Performance Optimizations](#performance-optimizations)

---

## Key Concepts

### What is PySpark?

**PySpark** = Python API for Apache Spark (distributed computing framework)

```
Traditional pandas (single machine):
  pandas processes 50K rows → uses 1 CPU → takes X seconds

PySpark (distributed):
  PySpark processes 50M rows → splits across 100 CPUs → takes X seconds
```

**Key capabilities:**
- **Distributed processing**: Splits data across many machines (cluster)
- **In-memory computing**: Keeps data in RAM (100x faster than disk)
- **Lazy evaluation**: Builds execution plan before running (optimizes automatically)
- **Fault tolerance**: If a machine fails, Spark recovers automatically

### When to Use PySpark vs Pandas?

| Use Case | pandas | PySpark |
|----------|--------|---------|
| **Data Size** | < 1GB | > 1GB (millions of rows) |
| **Processing** | Single machine | Distributed cluster |
| **Memory** | Fits in 1 machine's RAM | Splits across cluster RAM |
| **Use for** | Exploration, prototyping, small data | Production pipelines, big data |
| **Syntax** | `df.groupby().mean()` | `df.groupBy().mean()` (similar!) |

**In Altaviz:**
- **Data simulator**: pandas (generates test data once - not production scale)
- **ETL pipeline**: PySpark (production-scale processing with Delta Lake)

---

## Delta Lake vs Data Lake

### Data Lake (Traditional)

**What it is:** Storage for raw files (Parquet, CSV, JSON) without database features

**Problems:**
- ❌ No ACID transactions → data corruption from job failures
- ❌ No concurrent write safety → conflicts when multiple jobs write
- ❌ No time travel → can't rewind to previous version
- ❌ No schema enforcement → bad data silently accepted

**Analogy:** Dropbox folder with files (anyone can upload anything, no version control)

### Delta Lake (Modern)

**What it is:** Data Lake + Database features (ACID transactions, versioning)

**Benefits:**
- ✅ ACID transactions → no corruption, all-or-nothing writes
- ✅ Safe concurrent writes → multiple jobs write without conflicts
- ✅ Time travel → query historical versions (`versionAsOf`)
- ✅ Schema enforcement → rejects data that doesn't match schema

**Analogy:** GitHub repository (version history, merge conflict handling, rollback)

### How Delta Lake Works

```
Data Lake (plain Parquet):
my_table/
├── part-00001.parquet
├── part-00002.parquet
└── part-00003.parquet

Delta Lake:
my_table/
├── _delta_log/                      ← Transaction log
│   ├── 00000000000000000000.json    ← Version 0
│   ├── 00000000000000000001.json    ← Version 1
│   └── 00000000000000000002.json    ← Version 2
├── part-00001.parquet               ← Data files
├── part-00002.parquet
└── part-00003.parquet
```

**Key insight:** Delta Lake = Parquet files + transaction log

The transaction log (`_delta_log/`) records:
- Every operation (write, delete, update)
- Which files are valid for each version
- Schema for each version

**Time travel example:**
```python
# Read current version
current = spark.read.format("delta").load("sensors_gold/")

# Read version from 5 days ago
historical = spark.read.format("delta") \
    .option("versionAsOf", 5) \
    .load("sensors_gold/")
```

**In Altaviz:** All three layers (Bronze, Silver, Gold) use Delta Lake format for reliability.

---

## What is ACID?

**ACID** = Four guarantees that make databases reliable

| Letter | Property | What It Means | Example |
|--------|----------|---------------|---------|
| **A** | **Atomicity** | All-or-nothing | ETL job writes 1,000 rows. If crash at row 500 → ZERO rows written (not 500 partial) |
| **C** | **Consistency** | Rules enforced | Schema says "vibration must be number" → if you write "hello", Delta Lake rejects it |
| **I** | **Isolation** | No interference | Job A reads while Job B writes → Job A sees consistent snapshot, not half-written data |
| **D** | **Durability** | Survives crashes | Once Delta Lake confirms write, it's permanent (even if server crashes 1 sec later) |

### Real-World Example (Altaviz)

**Without ACID (plain Parquet):**
```
1. ETL job starts writing Gold layer (10,000 rows)
2. Job crashes at row 5,000
3. Gold layer now has 5,000 partially written rows
4. Dashboard queries Gold → sees corrupted data → shows wrong alerts
5. Operator shuts down healthy compressor based on bad data
6. Cost: $50,000 in lost production
```

**With ACID (Delta Lake):**
```
1. ETL job starts writing Gold layer (10,000 rows)
2. Job crashes at row 5,000
3. Delta Lake rolls back → Gold layer unchanged (still has previous valid state)
4. Dashboard queries Gold → sees last valid data
5. Re-run ETL job → succeeds → Gold layer updated atomically
6. Cost: $0 (just re-run the job)
```

**Why it matters:** ACID prevents data corruption in production pipelines where reliability is critical.

---

## Pipeline Architecture

### Medallion Architecture (Bronze → Silver → Gold)

```
┌─────────────────────────────────────────────────────────────┐
│ RAW DATA (Parquet files from simulator)                    │
│ - 50,000 sensor readings                                    │
│ - May have nulls, outliers, duplicates                      │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ BRONZE LAYER (Delta Lake)                                   │
│ Purpose: Immutable audit trail                              │
│ Transformations: Add load timestamp only                    │
│ Write Mode: APPEND (never overwrite)                        │
│                                                             │
│ Why immutable? If you make a mistake in Silver/Gold,       │
│ you can always reprocess from Bronze without re-collecting │
│ data from sensors.                                          │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ SILVER LAYER (Delta Lake)                                   │
│ Purpose: Cleaned, validated data                            │
│ Transformations:                                            │
│ - Remove nulls (<5% acceptable missing rate)                │
│ - Detect outliers (4 standard deviations)                   │
│ - Validate timestamps (no future dates, no duplicates)      │
│ - Schema validation                                         │
│ Write Mode: OVERWRITE (can reprocess from Bronze)          │
│                                                             │
│ Data Quality Checks:                                        │
│ - Freshness: Is data recent? (15-min SLA)                  │
│ - Completeness: Missing data rates per column              │
│ - Consistency: Schema matches expected structure            │
│ - Accuracy: Values within physically possible ranges        │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ GOLD LAYER (Delta Lake)                                     │
│ Purpose: ML-ready features                                  │
│ Transformations:                                            │
│ - Rolling window aggregations (1hr, 4hr, 24hr)             │
│   • vibration_1hr_mean, vibration_1hr_std, vibration_1hr_max│
│   • temp_4hr_mean, pressure_24hr_mean                       │
│ - Rate of change: temp_1hr_delta (°F per hour)             │
│ - Derived metrics: pressure_differential                    │
│ - Threshold flags: vibration_status (normal/warning/critical)│
│ - Time features: hour_of_day, day_of_week, is_weekend      │
│ Write Mode: APPEND with PARTITIONING by date               │
│                                                             │
│ Output: 24+ features per reading (original 8 + 16 engineered)│
│                                                             │
│ Why multiple time windows?                                  │
│ - 1hr: Detects sudden anomalies (bearing failure starting) │
│ - 4hr: Captures developing trends (gradual degradation)     │
│ - 24hr: Identifies long-term patterns (predicts failure days ahead)│
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ POSTGRESQL / AZURE SQL (Relational Database)                │
│ Purpose: Dashboard data consumption                         │
│                                                             │
│ Tables Written:                                             │
│ - sensor_readings_agg: Hourly aggregates (90% smaller than raw)│
│ - alert_history: Threshold violations (warning/critical)    │
│ - data_quality_metrics: Pipeline health monitoring          │
│                                                             │
│ Why not write raw Gold to PostgreSQL?                       │
│ - 50,000 rows at 10-min intervals → large DB                │
│ - Aggregate to hourly → 5,000 rows (10x smaller)            │
│ - Dashboard queries are faster on smaller tables            │
│ - Raw Gold stays in Delta Lake for ML training              │
└─────────────────────────────────────────────────────────────┘
```

---

## Running the Pipeline

### Prerequisites

1. **Python 3.10+**
   ```bash
   python --version  # Should be 3.10 or higher
   ```

2. **Java 11+** (required for PySpark)
   ```bash
   java -version  # Should be 11 or higher
   ```

3. **Docker** (for PostgreSQL)
   ```bash
   docker --version
   ```

4. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

5. **Start PostgreSQL**
   ```bash
   docker-compose up -d
   docker-compose ps  # Verify container is healthy
   ```

### Step 1: Generate Test Data

```bash
python src/data_simulator/compressor_simulator.py
```

**What this does:**
- Generates 7 days of sensor data (10-minute intervals)
- 10 compressors × 144 readings/day × 7 days = 10,080 readings
- Simulates 2 failing compressors (COMP-003, COMP-007)
- Outputs to `data/raw/sensor_readings.parquet`

**Expected output:**
```
Generating sensor data for 10 compressors over 7 days...
Total readings: 10,080
Saved to: data/raw/sensor_readings.parquet
Saved metadata to: data/raw/compressor_metadata.csv
Saved maintenance logs to: data/raw/maintenance_logs.csv
```

### Step 2: Run Complete Pipeline

```bash
python src/etl/pyspark_pipeline.py
```

**What this does:**
1. **Bronze Layer**: Loads raw Parquet → writes to Delta Lake (append mode)
2. **Silver Layer**: Applies data quality checks → writes to Delta Lake (overwrite mode)
3. **Gold Layer**: Engineers 24+ features → writes to Delta Lake (append, partitioned by date)
4. **PostgreSQL**: Aggregates to hourly → writes to sensor_readings_agg and alert_history tables

**Expected output:**
```
================================================================================
ALTAVIZ ETL PIPELINE STARTING
Timestamp: 2024-02-08 14:30:00
================================================================================
Creating Spark session...
================================================================================
BRONZE LAYER: Loading raw data
================================================================================
Loaded sensor readings: 10,080 rows, 9 columns
Writing to Bronze Delta Lake: data/processed/delta/sensors_bronze/
Bronze layer complete
[Execution time: 15.3 seconds]
================================================================================
SILVER LAYER: Data quality and cleaning
================================================================================
Step 1: Validating schema... ✓
Step 2: Validating timestamps... ✓
Step 3: Checking missing data rates...
Step 4: Removing rows with null values... (removed 150 rows, 1.5%)
Step 5: Detecting and removing outliers...
  - vibration_mms: 12 outliers detected (0.12%)
  - discharge_temp_f: 8 outliers detected (0.08%)
Silver layer complete: 9,910 rows
[Execution time: 23.7 seconds]
================================================================================
GOLD LAYER: Feature engineering
================================================================================
Step 1: Adding rolling window features... (1hr, 4hr, 24hr)
Step 2: Adding rate of change features...
Step 3: Adding derived metrics...
Step 4: Adding threshold status flags...
Step 5: Adding time features...
Gold layer complete: 9,910 rows, 33 columns
[Execution time: 45.2 seconds]
================================================================================
POSTGRESQL EXPORT: Writing to database
================================================================================
Aggregating Gold layer for dashboard... (90% volume reduction)
Writing sensor aggregates... ✓ (1,008 rows)
Generating alerts from threshold violations... (45 alerts)
Writing alerts... ✓
PostgreSQL export complete
[Execution time: 8.1 seconds]
================================================================================
ALTAVIZ ETL PIPELINE COMPLETED SUCCESSFULLY
Duration: 92.3 seconds
================================================================================
```

### Step 3: Verify Results

**Check Delta Lake tables:**
```bash
ls -la data/processed/delta/
```

**Expected structure:**
```
data/processed/delta/
├── sensors_bronze/
│   ├── _delta_log/
│   └── part-00000-*.parquet
├── sensors_silver/
│   ├── _delta_log/
│   └── part-00000-*.parquet
└── sensors_gold/
    ├── _delta_log/
    ├── date=2024-02-01/
    ├── date=2024-02-02/
    └── date=2024-02-03/
```

**Check PostgreSQL tables:**
```bash
psql -h localhost -U postgres -d compressor_health -c "SELECT COUNT(*) FROM sensor_readings_agg;"
psql -h localhost -U postgres -d compressor_health -c "SELECT COUNT(*) FROM alert_history;"
```

**Expected:**
```
sensor_readings_agg: ~1,000 rows (hourly aggregates)
alert_history: 40-50 rows (threshold violations)
```

### Advanced Usage

**Skip layers (for debugging):**
```bash
# Skip Bronze (read existing)
python src/etl/pyspark_pipeline.py --skip-bronze

# Skip Bronze and Silver (reprocess only Gold)
python src/etl/pyspark_pipeline.py --skip-bronze --skip-silver

# Skip PostgreSQL export (process Delta Lake only)
python src/etl/pyspark_pipeline.py --skip-postgres
```

---

## Performance Optimizations

### 5 Key PySpark Optimizations in Altaviz

#### 1. Explicit Schemas (10-100x faster)

**Why:** Spark infers schemas by scanning the entire file. Explicit schemas skip this.

**Implementation:**
```python
# SLOW (inferSchema=True):
df = spark.read.option("inferSchema", "true").parquet("data.parquet")

# FAST (explicit schema):
from src.etl.schemas import SENSOR_SCHEMA
df = spark.read.schema(SENSOR_SCHEMA).parquet("data.parquet")
```

**Performance:** 10-100x faster for large files (millions of rows).

**Location:** `src/etl/schemas.py`

---

#### 2. Single `.select()` vs Chained `.withColumn()`

**Why:** Each `.withColumn()` creates a new DataFrame. Spark may re-evaluate the plan multiple times.

**Implementation:**
```python
# BAD: Multiple passes through data
df = df.withColumn("col1", ...) \
      .withColumn("col2", ...) \
      .withColumn("col3", ...)

# GOOD: Single pass, Catalyst optimizer sees all transforms
df = df.select(
    col("*"),
    expr(...).alias("col1"),
    expr(...).alias("col2"),
    expr(...).alias("col3")
)
```

**Performance:** 2-5x faster for feature engineering.

**Location:** `src/etl/transformations.py:add_rolling_window_features()`

---

#### 3. Broadcast Joins for Small Tables

**Why:** Avoids shuffling large tables across the network.

**Implementation:**
```python
from pyspark.sql.functions import broadcast

# Sensor readings: 50,000 rows (large)
# Metadata: 10 rows (tiny)

# BAD: Shuffle both tables
sensor_df.join(metadata_df, "compressor_id")

# GOOD: Broadcast small table to all executors
sensor_df.join(broadcast(metadata_df), "compressor_id")
```

**Performance:** 10-100x faster joins with small dimension tables.

**Use case:** Joining sensor data (large) with compressor metadata (10 rows).

---

#### 4. Adaptive Query Execution (AQE)

**Why:** Spark re-optimizes the plan at runtime based on actual data statistics.

**Implementation:**
```yaml
# config/etl_config.yaml
spark:
  spark.sql.adaptive.enabled: "true"
  spark.sql.adaptive.coalescePartitions.enabled: "true"
```

**What it does:**
- Dynamically coalesces small partitions after shuffles
- Reduces overhead of many tiny tasks
- Optimizes join strategies at runtime

**Performance:** 20-30% faster on complex queries.

---

#### 5. Arrow Optimization

**Why:** Columnar data transfer between PySpark and Pandas is significantly faster.

**Implementation:**
```yaml
# config/etl_config.yaml
spark:
  spark.sql.execution.arrow.pyspark.enabled: "true"
```

**Use case:** When converting PySpark DataFrame → Pandas for PostgreSQL writes.

**Performance:** 10x faster data transfer.

---

### Scaling from 10 to 4,500 Compressors

**Current scale (development):**
- 10 compressors
- 10,080 readings/week
- Processing time: ~90 seconds

**Archrock scale (production):**
- 4,500 compressors
- 4.5M readings/week
- Processing time target: <30 minutes

**How to scale:**

1. **Spark Cluster**: Move from `local[*]` to Azure Synapse Spark Pool
   ```yaml
   # Local (current)
   spark.master: "local[*]"

   # Production (Synapse)
   # Configured via Synapse workspace, not code
   ```

2. **Partition by compressor_id**: Add compressor-based partitioning
   ```python
   gold_df.write \
       .format("delta") \
       .partitionBy("date", "compressor_id") \
       .save(gold_path)
   ```

3. **Increase batch size**: Process more compressors per batch
   ```yaml
   # config/etl_config.yaml
   execution:
     compressor_batch_size: 100  # From 5 to 100
   ```

4. **Database**: Move to Azure SQL with columnstore indexes
   - Or use Fabric SQL Endpoint directly

---

## Summary

### Key Takeaways

1. **PySpark for scale**: Handles 10 compressors today, 4,500 tomorrow (no code changes)
2. **Delta Lake for reliability**: ACID transactions prevent data corruption
3. **Medallion architecture**: Bronze (raw) → Silver (clean) → Gold (features)
4. **Optimization patterns**: Explicit schemas, single select, broadcast joins, AQE, Arrow
5. **Portability**: Same code runs locally and on Azure Fabric Lakehouses

### Next Steps

1. ✅ Data generation: `python src/data_simulator/compressor_simulator.py`
2. ✅ ETL pipeline: `python src/etl/pyspark_pipeline.py`
3. ✅ Dashboard: `cd frontend && npm run dev` (Next.js 16 + React 19)
4. ⬜ ML training: `python src/ml/train_lstm.py` (NOT YET BUILT)
5. ⬜ Tests: `pytest tests/` (NOT YET BUILT)

### Resources

- PySpark docs: https://spark.apache.org/docs/latest/api/python/
- Delta Lake docs: https://docs.delta.io/latest/index.html
- Microsoft Fabric: https://learn.microsoft.com/en-us/fabric/

---

*Guide created for Altaviz MLOps platform - David Fernandez*
