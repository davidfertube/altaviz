# Microsoft Fabric Deployment Guide

How to deploy the Altaviz PySpark ETL pipeline to Microsoft Fabric for full cloud-native operation.

---

## Why Fabric?

Microsoft Fabric is the cloud platform Archrock is migrating to. Deploying Altaviz on Fabric demonstrates you can operate in their exact environment.

| Component | Local (Current) | Fabric (Cloud) |
|-----------|----------------|----------------|
| **Spark Runtime** | PySpark local[*] | Fabric Spark Pool |
| **Delta Lake Storage** | Local filesystem | OneLake Lakehouse |
| **SQL Database** | PostgreSQL / Azure SQL | Fabric SQL Endpoint |
| **Orchestration** | python script | Fabric Data Pipeline |
| **Dashboards** | Next.js | Power BI (Direct Lake) |
| **ML Models** | Local TensorFlow | Fabric ML Model |

**Key insight:** Your PySpark code runs in Fabric without modification because Fabric uses the same Spark 3.5 runtime and Delta Lake format.

---

## What You Get for Free

| Fabric Component | Free Trial | Duration |
|-----------------|------------|----------|
| **Fabric Capacity** | F2 trial capacity (2 CU) | 60 days |
| **OneLake Storage** | 1 TB included with trial | 60 days |
| **Spark Notebooks** | Included with capacity | 60 days |
| **SQL Endpoint** | Included with capacity | 60 days |
| **Power BI** | Pro license included | 60 days |

**How to get the trial:** https://learn.microsoft.com/en-us/fabric/get-started/fabric-trial

---

## Architecture on Fabric

```
┌─────────────────────────────────────────────────────────────┐
│ MICROSOFT FABRIC WORKSPACE: altaviz-workspace               │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ LAKEHOUSE: altaviz_lakehouse                          │  │
│  │                                                       │  │
│  │  OneLake Storage (Delta Lake native)                  │  │
│  │  ├── Tables/                                          │  │
│  │  │   ├── sensors_bronze (Delta)                       │  │
│  │  │   ├── sensors_silver (Delta)                       │  │
│  │  │   └── sensors_gold (Delta, partitioned by date)    │  │
│  │  └── Files/                                           │  │
│  │      └── raw/                                         │  │
│  │          ├── sensor_readings.parquet                   │  │
│  │          ├── compressor_metadata.csv                   │  │
│  │          └── maintenance_logs.csv                      │  │
│  │                                                       │  │
│  │  SQL Endpoint (auto-generated from Delta tables)      │  │
│  │  └── Queries via T-SQL against Delta tables           │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ SPARK NOTEBOOKS (PySpark)                             │  │
│  │  ├── 01_bronze_layer.ipynb                            │  │
│  │  ├── 02_silver_layer.ipynb                            │  │
│  │  └── 03_gold_layer.ipynb                              │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ DATA PIPELINE (Orchestration)                         │  │
│  │  Bronze → Silver → Gold → SQL Endpoint                │  │
│  │  Schedule: Hourly                                     │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ POWER BI REPORT (Dashboard)                           │  │
│  │  ├── Fleet Overview (map + metrics)                   │  │
│  │  ├── Real-Time Monitoring (gauges)                    │  │
│  │  ├── Predictive Alerts (table)                        │  │
│  │  └── Data Quality (cards)                             │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Step 1: Start Fabric Trial

1. Go to https://app.fabric.microsoft.com
2. Sign in with Microsoft account
3. Click "Start trial" when prompted
4. Select "Microsoft Fabric (Free)" or start 60-day trial

---

## Step 2: Create Fabric Workspace

1. In Fabric portal, click **Workspaces** > **New workspace**
2. Name: `altaviz-workspace`
3. Select your trial capacity
4. Click **Apply**

---

## Step 3: Create Lakehouse

1. In your workspace, click **New** > **Lakehouse**
2. Name: `altaviz_lakehouse`
3. Click **Create**

This creates:
- **Tables/** folder (for Delta Lake managed tables)
- **Files/** folder (for raw data files)
- **SQL Endpoint** (auto-generated for T-SQL queries)

---

## Step 4: Upload Raw Data

### Option A: Upload via Fabric UI

1. Open `altaviz_lakehouse`
2. Click **Files** > **Upload** > **Upload files**
3. Create `raw/` folder
4. Upload:
   - `data/raw/sensor_readings.parquet`
   - `data/raw/compressor_metadata.csv`
   - `data/raw/maintenance_logs.csv`

### Option B: Upload via Azure CLI

```bash
# Get the OneLake path for your lakehouse
# Format: abfss://<workspace-id>@onelake.dfs.fabric.microsoft.com/<lakehouse-id>/Files/

# Upload using azcopy
azcopy copy "data/raw/sensor_readings.parquet" \
    "https://onelake.dfs.fabric.microsoft.com/<workspace>/altaviz_lakehouse.Lakehouse/Files/raw/"

azcopy copy "data/raw/compressor_metadata.csv" \
    "https://onelake.dfs.fabric.microsoft.com/<workspace>/altaviz_lakehouse.Lakehouse/Files/raw/"
```

---

## Step 5: Create Spark Notebooks

### Notebook 1: Bronze Layer

Create a new notebook in your workspace: **New** > **Notebook** > Name: `01_bronze_layer`

```python
# Cell 1: Bronze Layer - Load Raw Data
# =====================================
# This notebook loads raw Parquet data and writes to Bronze Delta table

from pyspark.sql.types import (
    StructType, StructField, StringType, TimestampType, DoubleType
)
from pyspark.sql.functions import current_timestamp

# Define explicit schema (NEVER use inferSchema)
SENSOR_SCHEMA = StructType([
    StructField("compressor_id", StringType(), nullable=False),
    StructField("timestamp", TimestampType(), nullable=False),
    StructField("vibration_mms", DoubleType(), nullable=True),
    StructField("discharge_temp_f", DoubleType(), nullable=True),
    StructField("suction_pressure_psi", DoubleType(), nullable=True),
    StructField("discharge_pressure_psi", DoubleType(), nullable=True),
    StructField("horsepower_consumption", DoubleType(), nullable=True),
    StructField("gas_flow_mcf", DoubleType(), nullable=True),
    StructField("operating_hours", DoubleType(), nullable=True),
])

# Load raw data from Files/ with explicit schema
sensor_df = spark.read \
    .schema(SENSOR_SCHEMA) \
    .parquet("Files/raw/sensor_readings.parquet")

print(f"Loaded {sensor_df.count()} sensor readings")

# Add load timestamp
sensor_df = sensor_df.withColumn("bronze_loaded_at", current_timestamp())

# Write to Bronze Delta table (append mode - never overwrite)
sensor_df.write \
    .format("delta") \
    .mode("append") \
    .saveAsTable("sensors_bronze")

print("Bronze layer complete")
```

### Notebook 2: Silver Layer

Create: **New** > **Notebook** > Name: `02_silver_layer`

```python
# Cell 1: Silver Layer - Data Quality & Cleaning
# ================================================

from pyspark.sql.functions import (
    col, count, when, isnan, isnull, stddev, mean,
    current_timestamp, expr, lit
)

# Read Bronze layer
bronze_df = spark.read.format("delta").table("sensors_bronze")
initial_count = bronze_df.count()
print(f"Bronze layer: {initial_count} rows")

# Step 1: Remove rows with null critical columns
df = bronze_df.dropna(subset=['compressor_id', 'timestamp'])

# Step 2: Remove rows where ALL sensors are null (dead sensor)
df = df.filter(
    ~(
        col('vibration_mms').isNull() &
        col('discharge_temp_f').isNull() &
        col('suction_pressure_psi').isNull() &
        col('discharge_pressure_psi').isNull()
    )
)

# Step 3: Outlier detection (4 standard deviations)
sensor_columns = ['vibration_mms', 'discharge_temp_f', 'suction_pressure_psi',
                   'discharge_pressure_psi', 'horsepower_consumption', 'gas_flow_mcf']

for col_name in sensor_columns:
    stats = df.select(
        mean(col(col_name)).alias('mean_val'),
        stddev(col(col_name)).alias('std_val')
    ).collect()[0]

    if stats['mean_val'] and stats['std_val'] and stats['std_val'] > 0:
        lower = stats['mean_val'] - (4.0 * stats['std_val'])
        upper = stats['mean_val'] + (4.0 * stats['std_val'])
        df = df.withColumn(
            col_name,
            when((col(col_name) >= lower) & (col(col_name) <= upper), col(col_name))
            .otherwise(lit(None))
        )

# Step 4: Remove duplicates
df = df.dropDuplicates(['compressor_id', 'timestamp'])

# Step 5: Add processing timestamp
df = df.withColumn('silver_processed_at', current_timestamp())

final_count = df.count()
print(f"Silver layer: {final_count} rows (rejected {initial_count - final_count})")

# Write to Silver Delta table
df.write \
    .format("delta") \
    .mode("overwrite") \
    .saveAsTable("sensors_silver")

print("Silver layer complete")
```

### Notebook 3: Gold Layer

Create: **New** > **Notebook** > Name: `03_gold_layer`

```python
# Cell 1: Gold Layer - Feature Engineering
# ==========================================

from pyspark.sql import Window
from pyspark.sql.functions import (
    col, avg, stddev, max as spark_max, lag, when,
    hour, dayofweek, to_date, current_timestamp, lit
)

# Read Silver layer
silver_df = spark.read.format("delta").table("sensors_silver")
print(f"Silver layer: {silver_df.count()} rows")

# Define window specifications ONCE (reuse for all aggregations)
window_1hr = Window.partitionBy("compressor_id") \
    .orderBy(col("timestamp").cast("long")) \
    .rangeBetween(-3600, 0)

window_4hr = Window.partitionBy("compressor_id") \
    .orderBy(col("timestamp").cast("long")) \
    .rangeBetween(-14400, 0)

window_24hr = Window.partitionBy("compressor_id") \
    .orderBy(col("timestamp").cast("long")) \
    .rangeBetween(-86400, 0)

# Single .select() for ALL features (critical for Catalyst optimizer)
gold_df = silver_df.select(
    col("*"),
    # 1-hour rolling window features
    avg("vibration_mms").over(window_1hr).alias("vibration_1hr_mean"),
    stddev("vibration_mms").over(window_1hr).alias("vibration_1hr_std"),
    spark_max("vibration_mms").over(window_1hr).alias("vibration_1hr_max"),
    avg("discharge_temp_f").over(window_1hr).alias("temp_1hr_mean"),
    stddev("discharge_temp_f").over(window_1hr).alias("temp_1hr_std"),
    avg("discharge_pressure_psi").over(window_1hr).alias("pressure_1hr_mean"),
    # 4-hour rolling window features
    avg("vibration_mms").over(window_4hr).alias("vibration_4hr_mean"),
    avg("discharge_temp_f").over(window_4hr).alias("temp_4hr_mean"),
    avg("discharge_pressure_psi").over(window_4hr).alias("pressure_4hr_mean"),
    # 24-hour rolling window features
    avg("vibration_mms").over(window_24hr).alias("vibration_24hr_mean"),
    avg("discharge_temp_f").over(window_24hr).alias("temp_24hr_mean"),
    avg("discharge_pressure_psi").over(window_24hr).alias("pressure_24hr_mean"),
)

# Rate of change
lookback_window = Window.partitionBy("compressor_id").orderBy("timestamp")
gold_df = gold_df.withColumn(
    "temp_1hr_delta",
    when(
        lag("discharge_temp_f", 6).over(lookback_window).isNotNull(),
        (col("discharge_temp_f") - lag("discharge_temp_f", 6).over(lookback_window)) / lit(1.0)
    ).otherwise(lit(None))
)

# Derived metrics
gold_df = gold_df.withColumn(
    "pressure_differential",
    col("discharge_pressure_psi") - col("suction_pressure_psi")
)

# Threshold flags (values from config/thresholds.yaml)
gold_df = gold_df.withColumn(
    "vibration_status",
    when(col("vibration_mms") >= 8.0, lit("critical"))
    .when(col("vibration_mms") >= 6.0, lit("warning"))
    .otherwise(lit("normal"))
).withColumn(
    "temp_status",
    when(col("discharge_temp_f") >= 260, lit("critical"))
    .when(col("discharge_temp_f") >= 240, lit("warning"))
    .otherwise(lit("normal"))
).withColumn(
    "pressure_status",
    when(col("discharge_pressure_psi") >= 1400, lit("critical"))
    .when(col("discharge_pressure_psi") >= 1300, lit("warning"))
    .otherwise(lit("normal"))
)

# Time features
gold_df = gold_df.select(
    col("*"),
    hour("timestamp").alias("hour_of_day"),
    dayofweek("timestamp").alias("day_of_week"),
    when(dayofweek("timestamp").isin([1, 7]), lit(1)).otherwise(lit(0)).alias("is_weekend"),
    to_date("timestamp").alias("date")
)

gold_df = gold_df.withColumn('gold_processed_at', current_timestamp())

print(f"Gold layer: {gold_df.count()} rows, {len(gold_df.columns)} columns")

# Write to Gold Delta table (partitioned by date)
gold_df.write \
    .format("delta") \
    .mode("append") \
    .partitionBy("date") \
    .saveAsTable("sensors_gold")

print("Gold layer complete")
```

---

## Step 6: Create Data Pipeline

1. In workspace, click **New** > **Data pipeline**
2. Name: `altaviz_etl_pipeline`
3. Add activities:
   - **Notebook Activity**: `01_bronze_layer` (runs first)
   - **Notebook Activity**: `02_silver_layer` (runs after bronze)
   - **Notebook Activity**: `03_gold_layer` (runs after silver)
4. Connect activities in sequence: Bronze → Silver → Gold
5. Set schedule: **Hourly** (or as needed)

---

## Step 7: Query via SQL Endpoint

Once Gold layer is written, Fabric auto-generates a SQL Endpoint.

1. Open `altaviz_lakehouse`
2. Click **SQL Endpoint** in the top right
3. Run queries:

```sql
-- Latest readings per compressor
SELECT TOP 10
    compressor_id,
    timestamp,
    vibration_mms,
    discharge_temp_f,
    vibration_status,
    temp_status
FROM sensors_gold
ORDER BY timestamp DESC;

-- Fleet health summary
SELECT
    compressor_id,
    COUNT(*) as reading_count,
    AVG(vibration_mms) as avg_vibration,
    MAX(vibration_mms) as max_vibration,
    SUM(CASE WHEN vibration_status = 'critical' THEN 1 ELSE 0 END) as critical_count
FROM sensors_gold
GROUP BY compressor_id
ORDER BY max_vibration DESC;

-- Degrading compressors (COMP-003 and COMP-007)
SELECT
    compressor_id,
    CAST(timestamp AS DATE) as day,
    AVG(vibration_mms) as avg_vibration,
    AVG(discharge_temp_f) as avg_temp
FROM sensors_gold
WHERE compressor_id IN ('COMP-003', 'COMP-007')
GROUP BY compressor_id, CAST(timestamp AS DATE)
ORDER BY compressor_id, day;
```

---

## Step 8: Connect Power BI (Optional)

1. In workspace, click **New** > **Report** > **Pick a published dataset**
2. Select `altaviz_lakehouse` SQL Endpoint
3. Build report:
   - **Fleet Map**: Map visual with station lat/long
   - **Compressor Health Cards**: Card visuals for each compressor
   - **Trend Charts**: Line charts for vibration/temp over time
   - **Alert Table**: Table visual filtered on critical/warning status

---

## Key Differences: Local vs Fabric

| Concept | Local Code | Fabric Equivalent |
|---------|-----------|-------------------|
| `spark.read.parquet("data/raw/...")` | `spark.read.parquet("Files/raw/...")` |
| `.save("data/processed/delta/sensors_gold/")` | `.saveAsTable("sensors_gold")` |
| `load_config('etl_config.yaml')` | Notebook parameters or Lakehouse config |
| `python src/etl/pyspark_pipeline.py` | Data Pipeline with Notebook activities |
| PostgreSQL / Azure SQL | Fabric SQL Endpoint (auto-generated) |
| `docker-compose up` | Not needed (Fabric manages infrastructure) |

**Only file paths and table references change. All PySpark logic stays identical.**

---

## What to Say to Kunal About This

> "I deployed Altaviz to Microsoft Fabric to learn the platform hands-on. The migration was straightforward because I designed the pipeline to be Fabric-compatible from day one. My PySpark code, Delta Lake format, and medallion architecture mapped directly to Fabric Lakehouses. The only changes were file paths -- from local filesystem to OneLake -- and table references -- from file-based saves to managed Delta tables using saveAsTable(). The SQL Endpoint auto-generated from my Gold Delta table gave me T-SQL access without any additional configuration. This proved my architectural thesis: design for Fabric locally, deploy to Fabric with configuration changes, not code rewrites."

---

## Azure Free Tier Summary for Interview

> "I'm running the entire Altaviz stack on Azure free tier:
> - Azure SQL Database free tier for structured data (100K vCore seconds/month)
> - Microsoft Fabric 60-day trial for PySpark processing and OneLake storage
> - The same PySpark code runs locally and on Fabric without modification
> - I switch between PostgreSQL and Azure SQL with a single environment variable
>
> This gives me hands-on Azure experience with zero cost, and demonstrates that my architecture is truly cloud-portable."

---

*Guide created for Altaviz MLOps platform - David Fernandez*
