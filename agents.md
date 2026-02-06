# Agent Infrastructure Guide

This document provides detailed instructions for AI agents (Claude Code agents, custom agents, etc.) working on the Altaviz project. Use this guide to understand the infrastructure, setup requirements, and operational patterns.

## Quick Start for Agents

### Prerequisites Check
```bash
# Verify Python version (requires 3.10+)
python --version  # Should be 3.10 or higher

# Verify Java (required for PySpark)
java -version  # Should be 11 or higher

# Verify Docker
docker --version  # Required for PostgreSQL

# Verify PostgreSQL client (optional, for testing)
psql --version
```

### Initial Setup Sequence

**Step 1: Environment Configuration**
```bash
# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Database credentials needed."
    # Use default values from .env in project root
fi

# Verify environment variables loaded
echo $DB_HOST  # Should be 'localhost'
echo $DB_NAME  # Should be 'compressor_health'
```

**Step 2: Start Infrastructure**
```bash
# Start PostgreSQL with Docker Compose
docker-compose up -d

# Wait for database to be ready (healthcheck)
docker-compose ps  # Check status is 'healthy'

# Alternative: Check directly
docker exec compressor_postgres pg_isready -U postgres
```

**Step 3: Verify Database Schema**
```bash
# Check if tables exist
psql -h localhost -U postgres -d compressor_health -c "\dt"

# Expected output: 7 tables
# - station_locations
# - compressor_metadata
# - sensor_readings_agg
# - maintenance_events
# - alert_history
# - data_quality_metrics
# - ml_predictions

# Check views
psql -h localhost -U postgres -d compressor_health -c "\dv"

# Expected output: 3 views
# - v_latest_readings
# - v_active_alerts
# - v_fleet_health_summary
```

**Step 4: Generate Data (if needed)**
```bash
# Check if data already exists
ls -lh data/raw/

# If empty, run simulator
python src/data_simulator/compressor_simulator.py

# Verify output
ls -lh data/raw/
# Expected files:
# - sensor_readings.csv (~15MB)
# - sensor_readings.parquet (~5MB)
# - compressor_metadata.csv (~1KB)
# - maintenance_logs.csv (~1KB)
```

**Step 5: Run ETL Pipeline**
```bash
# Execute PySpark ETL
python src/etl/pyspark_pipeline.py

# Verify Delta Lake tables created
ls -la data/processed/delta/
# Expected directories:
# - sensors_bronze/
# - sensors_silver/
# - sensors_gold/

# Verify PostgreSQL data loaded
psql -h localhost -U postgres -d compressor_health -c "
SELECT compressor_id, COUNT(*) as record_count
FROM sensor_readings_agg
GROUP BY compressor_id
ORDER BY compressor_id;"

# Expected: ~1,000+ rows per compressor (7 days × 24 hrs × 3 window types)
```

**Step 6: Launch Dashboard**
```bash
# Start Streamlit app
streamlit run src/dashboard/app.py

# Dashboard should open at http://localhost:8501
# Verify all 4 pages load:
# - Fleet Overview (map with 10 markers)
# - Real-Time Monitoring (gauges and charts)
# - Predictive Alerts (alert table)
# - Data Quality (metrics cards)
```

## Infrastructure Components

### Docker Compose Services

**PostgreSQL Database**
- Container name: `compressor_postgres`
- Image: `postgres:14`
- Port: `5432` (host) → `5432` (container)
- Volume: `postgres_data` (persistent storage)
- Auto-initialization: Runs all `.sql` files in `infrastructure/sql/` on first start
- Healthcheck: `pg_isready` every 5 seconds

**Management Commands**
```bash
# View logs
docker-compose logs -f postgres

# Stop without removing data
docker-compose stop

# Start existing containers
docker-compose start

# Rebuild and restart
docker-compose down
docker-compose up -d

# DANGER: Remove all data (including volumes)
docker-compose down -v
```

### PySpark Configuration

**Spark Session Setup** (from `src/etl/utils.py`)
```python
from pyspark.sql import SparkSession

def create_spark_session():
    return SparkSession.builder \
        .appName("CompressorHealthETL") \
        .master("local[*]") \
        .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension") \
        .config("spark.sql.catalog.spark_catalog", "org.apache.spark.sql.delta.catalog.DeltaCatalog") \
        .config("spark.driver.memory", "4g") \
        .config("spark.executor.memory", "4g") \
        .getOrCreate()
```

**Delta Lake Configuration**
- Format: `delta`
- Checkpoint location: `data/processed/checkpoints/`
- ACID transactions enabled
- Time travel supported: `spark.read.format("delta").option("versionAsOf", 0).load(path)`

### File System Structure

```
/Users/david/altaviz/
├── .env                              # Environment variables (NOT in git)
├── docker-compose.yml               # PostgreSQL container definition
├── CLAUDE.md                        # Project context for Claude
├── agents.md                        # This file - agent instructions
├── README.md                        # User-facing documentation
├── requirements.txt                 # Python dependencies
│
├── config/                          # YAML configuration files
│   ├── database.yaml               # DB connection settings
│   ├── etl_config.yaml             # ETL parameters
│   └── thresholds.yaml             # Sensor thresholds
│
├── infrastructure/sql/
│   ├── schema.sql                  # Database DDL (7 tables + 3 views)
│   └── seed_data.sql               # Station location seed data
│
├── data/                            # Data directory (gitignored)
│   ├── raw/                        # Bronze layer - simulator output
│   │   ├── sensor_readings.parquet
│   │   ├── compressor_metadata.csv
│   │   └── maintenance_logs.csv
│   └── processed/delta/            # Silver/Gold layers
│       ├── sensors_bronze/
│       ├── sensors_silver/
│       └── sensors_gold/
│
├── src/
│   ├── data_simulator/             # Synthetic data generation (COMPLETE)
│   │   └── compressor_simulator.py
│   ├── etl/                        # PySpark ETL pipeline
│   │   ├── schemas.py              # Explicit PySpark schemas
│   │   ├── utils.py                # Config loading, Spark session
│   │   ├── data_quality.py         # Validation functions
│   │   ├── transformations.py      # Feature engineering
│   │   ├── database_writer.py      # PostgreSQL writes
│   │   └── pyspark_pipeline.py     # Main orchestrator
│   └── dashboard/                  # Streamlit multi-page app
│       ├── app.py                  # Main entry point
│       ├── components/             # Reusable components
│       │   ├── fleet_map.py
│       │   ├── sensor_gauges.py
│       │   ├── trend_charts.py
│       │   ├── alert_table.py
│       │   └── data_quality_cards.py
│       ├── pages/                  # 4 dashboard pages
│       │   ├── 1_Fleet_Overview.py
│       │   ├── 2_Real_Time_Monitoring.py
│       │   ├── 3_Predictive_Alerts.py
│       │   └── 4_Data_Quality.py
│       └── utils/
│           ├── database.py         # DB connection pool
│           ├── queries.py          # SQL queries
│           └── styling.py          # Custom CSS
│
└── tests/                          # Unit and integration tests
```

## Configuration Management

### Loading Configuration Files (Pattern)

```python
import yaml
from pathlib import Path
from dotenv import load_dotenv
import os

# Load environment variables from .env
load_dotenv()

def load_config(config_file):
    """Load YAML config with environment variable substitution"""
    config_path = Path(__file__).parent.parent.parent / "config" / config_file

    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)

    # Substitute environment variables in format ${VAR_NAME:-default}
    return substitute_env_vars(config)

# Usage in ETL
db_config = load_config("database.yaml")
etl_config = load_config("etl_config.yaml")
thresholds = load_config("thresholds.yaml")
```

### Database Connection Pattern

```python
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool

def get_database_url():
    """Build PostgreSQL connection URL from environment"""
    host = os.getenv("DB_HOST", "localhost")
    port = os.getenv("DB_PORT", "5432")
    database = os.getenv("DB_NAME", "compressor_health")
    user = os.getenv("DB_USER", "postgres")
    password = os.getenv("DB_PASSWORD", "postgres")

    return f"postgresql://{user}:{password}@{host}:{port}/{database}"

def get_db_engine():
    """Create SQLAlchemy engine with connection pooling"""
    return create_engine(
        get_database_url(),
        poolclass=QueuePool,
        pool_size=5,
        max_overflow=10,
        pool_pre_ping=True
    )
```

## Data Processing Patterns

### ETL Pipeline Flow

```
1. BRONZE (Ingestion)
   Input: data/raw/sensor_readings.parquet
   Process: Load with explicit schema, add load_timestamp
   Output: data/processed/delta/sensors_bronze/
   Format: Delta Lake (append mode)

2. SILVER (Cleaning)
   Input: Bronze Delta table
   Process:
     - Remove nulls (< 5% acceptable)
     - Detect outliers (> 4 std deviations)
     - Validate timestamp ranges
     - Log rejected records
   Output: data/processed/delta/sensors_silver/
   Format: Delta Lake (overwrite mode)

3. GOLD (Feature Engineering)
   Input: Silver Delta table
   Process:
     - Rolling window aggregations (1hr, 4hr, 24hr)
     - Rate of change calculations
     - Threshold violation flags
     - Time-based features
   Output: data/processed/delta/sensors_gold/
   Format: Delta Lake (partitioned by date)

4. POSTGRESQL EXPORT
   Input: Gold Delta table
   Process:
     - Aggregate to hourly windows
     - Convert to Pandas DataFrame
     - Write to PostgreSQL sensor_readings_agg
     - Generate alerts from thresholds
     - Update data quality metrics
   Output: PostgreSQL tables populated
```

### PySpark Transformation Template

```python
from pyspark.sql import SparkSession
from pyspark.sql.window import Window
from pyspark.sql.functions import *
from src.etl.schemas import SENSOR_SCHEMA

def apply_feature_engineering(silver_df):
    """Apply feature engineering transformations"""

    # Define window specifications (ONCE, reuse multiple times)
    window_spec = Window.partitionBy("compressor_id").orderBy("timestamp")
    window_1hr = Window.partitionBy("compressor_id").orderBy("timestamp").rangeBetween(-3600, 0)
    window_4hr = Window.partitionBy("compressor_id").orderBy("timestamp").rangeBetween(-14400, 0)
    window_24hr = Window.partitionBy("compressor_id").orderBy("timestamp").rangeBetween(-86400, 0)

    # SINGLE SELECT for all transformations (avoid chained withColumn)
    gold_df = silver_df.select(
        col("*"),

        # 1-hour window aggregations
        avg("vibration_mms").over(window_1hr).alias("vibration_1hr_mean"),
        stddev("vibration_mms").over(window_1hr).alias("vibration_1hr_std"),
        max("vibration_mms").over(window_1hr).alias("vibration_1hr_max"),

        # 4-hour window aggregations
        avg("discharge_temp_f").over(window_4hr).alias("temp_4hr_mean"),

        # 24-hour window aggregations
        avg("discharge_pressure_psi").over(window_24hr).alias("pressure_24hr_mean"),

        # Rate of change (lag 6 readings = 1 hour at 10-min intervals)
        (col("discharge_temp_f") - lag("discharge_temp_f", 6).over(window_spec))
            .alias("temp_1hr_delta"),

        # Derived metrics
        (col("discharge_pressure_psi") - col("suction_pressure_psi"))
            .alias("pressure_differential"),

        # Threshold flags
        when(col("vibration_mms") >= 8.0, lit("critical"))
         .when(col("vibration_mms") >= 6.0, lit("warning"))
         .otherwise(lit("normal"))
         .alias("vibration_status"),

        # Time features
        hour("timestamp").alias("hour_of_day"),
        dayofweek("timestamp").alias("day_of_week"),
        when(dayofweek("timestamp").isin([1, 7]), lit(True))
         .otherwise(lit(False))
         .alias("is_weekend"),

        # Add date column for partitioning
        to_date("timestamp").alias("date")
    )

    return gold_df
```

## Dashboard Development Patterns

### Streamlit Caching Strategy

```python
import streamlit as st
import pandas as pd
from src.dashboard.utils.database import get_db_engine

# Cache database connection (singleton, never expires)
@st.cache_resource
def get_db_connection():
    return get_db_engine()

# Cache query results (60 second TTL for near-real-time)
@st.cache_data(ttl=60)
def load_fleet_status():
    engine = get_db_connection()
    with engine.connect() as conn:
        return pd.read_sql("SELECT * FROM v_fleet_health_summary", conn)

# Cache expensive computations (5 minute TTL)
@st.cache_data(ttl=300)
def load_time_series(compressor_id, hours=24):
    engine = get_db_connection()
    query = """
        SELECT agg_timestamp, vibration_mean, discharge_temp_mean
        FROM sensor_readings_agg
        WHERE compressor_id = %s
          AND window_type = '1hr'
          AND agg_timestamp >= NOW() - INTERVAL '%s hours'
        ORDER BY agg_timestamp
    """
    with engine.connect() as conn:
        return pd.read_sql(query, conn, params=(compressor_id, hours))
```

### Dashboard Page Structure Template

```python
import streamlit as st
from src.dashboard.utils.queries import get_fleet_status
from src.dashboard.components.fleet_map import create_fleet_map

# Page configuration (MUST be first Streamlit command)
st.set_page_config(
    page_title="Fleet Overview",
    page_icon="🗺️",
    layout="wide"
)

# Load data
fleet_df = load_fleet_status()

# Metric cards row
col1, col2, col3, col4 = st.columns(4)
with col1:
    st.metric("Total Compressors", len(fleet_df))
with col2:
    healthy = len(fleet_df[fleet_df['health_status'] == 'healthy'])
    st.metric("Healthy", healthy)
with col3:
    warning = len(fleet_df[fleet_df['health_status'] == 'warning'])
    st.metric("Warning", warning)
with col4:
    critical = len(fleet_df[fleet_df['health_status'] == 'critical'])
    st.metric("Critical", critical)

# Map visualization
st.subheader("Fleet Location Map")
map_obj = create_fleet_map(fleet_df)
st_folium(map_obj, width=1200, height=600)
```

## Testing & Validation

### ETL Pipeline Testing

```bash
# Test Bronze layer ingestion
python -c "
from src.etl.pyspark_pipeline import load_bronze_layer
df = load_bronze_layer()
print(f'Bronze records: {df.count()}')
assert df.count() > 50000, 'Expected 50k+ records'
"

# Test Silver layer cleaning
python -c "
from src.etl.data_quality import validate_and_clean
from src.etl.pyspark_pipeline import load_bronze_layer
bronze_df = load_bronze_layer()
silver_df, rejected_df, metrics = validate_and_clean(bronze_df)
print(f'Silver records: {silver_df.count()}')
print(f'Rejected records: {rejected_df.count()}')
assert metrics['missing_rate'] < 0.05, 'Too many missing values'
"

# Test Gold layer features
python -c "
from src.etl.transformations import apply_feature_engineering
# ... verify columns exist
assert 'vibration_1hr_mean' in gold_df.columns
assert 'temp_1hr_delta' in gold_df.columns
"
```

### Database Validation

```bash
# Check row counts
psql -h localhost -U postgres -d compressor_health -c "
SELECT
    'sensor_readings_agg' as table_name,
    COUNT(*) as row_count,
    MIN(agg_timestamp) as oldest,
    MAX(agg_timestamp) as newest
FROM sensor_readings_agg
UNION ALL
SELECT
    'alert_history',
    COUNT(*),
    MIN(alert_timestamp),
    MAX(alert_timestamp)
FROM alert_history;"

# Verify indexes
psql -h localhost -U postgres -d compressor_health -c "
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;"

# Check view data
psql -h localhost -U postgres -d compressor_health -c "
SELECT * FROM v_fleet_health_summary ORDER BY compressor_id;"
```

### Dashboard Testing

```python
# Test in headless mode (for CI/CD)
streamlit run src/dashboard/app.py --server.headless=true --server.port=8502

# Test specific page
streamlit run src/dashboard/pages/1_Fleet_Overview.py
```

## Common Agent Tasks

### Task: Add New Sensor Type

1. Update data simulator ranges: [src/data_simulator/compressor_simulator.py:49-56](src/data_simulator/compressor_simulator.py#L49-L56)
2. Add to PySpark schema: [src/etl/schemas.py](src/etl/schemas.py)
3. Add threshold to [config/thresholds.yaml](config/thresholds.yaml)
4. Update transformations: [src/etl/transformations.py](src/etl/transformations.py)
5. Add column to database: ALTER TABLE sensor_readings_agg ADD COLUMN new_sensor_mean DECIMAL(10,2);
6. Update dashboard components to display new sensor

### Task: Add New Dashboard Page

1. Create `src/dashboard/pages/5_NewPage.py` (numbered for ordering)
2. Follow page structure template (see above)
3. Import utilities from `src/dashboard/utils/`
4. Use consistent styling from `src/dashboard/utils/styling.py`
5. Add `@st.cache_data` decorators for database queries
6. Test: `streamlit run src/dashboard/app.py`

### Task: Modify ETL Logic

1. Never modify Bronze layer (immutable raw data)
2. For Silver changes: Update `src/etl/data_quality.py`
3. For Gold changes: Update `src/etl/transformations.py`
4. Always use single `.select()` pattern (not chained `.withColumn()`)
5. Test on small subset first: `.limit(1000)`
6. Verify Delta Lake output: `ls data/processed/delta/sensors_gold/`

### Task: Troubleshoot Pipeline Failures

```bash
# Check PySpark logs
# Look for: Java heap space errors, schema mismatches, Delta Lake issues

# Check PostgreSQL logs
docker-compose logs postgres

# Check data quality metrics
psql -h localhost -U postgres -d compressor_health -c "
SELECT * FROM data_quality_metrics
ORDER BY metric_timestamp DESC
LIMIT 20;"

# Verify Spark configuration
python -c "
from src.etl.utils import create_spark_session
spark = create_spark_session()
print(spark.conf.get('spark.sql.extensions'))
"
```

## Performance Benchmarks

**Expected Performance** (on MacBook Pro M1, 16GB RAM):
- Data generation: ~30 seconds for 50k records
- Bronze layer ingestion: ~5 seconds
- Silver layer cleaning: ~10 seconds
- Gold layer transformations: ~30 seconds (window functions)
- PostgreSQL writes: ~15 seconds
- **Total ETL pipeline**: ~90 seconds (1.5 minutes)
- Dashboard load time: <2 seconds per page

**Optimization Targets**:
- PySpark transformations: <1 minute
- Database queries: <100ms (p95)
- Dashboard initial load: <3 seconds

## Security Considerations

- **Never commit**: `.env` file, database credentials, API keys
- **Gitignored**: `data/` directory, `.env`, `__pycache__/`, `*.pyc`
- **Database access**: Use environment variables, never hardcode credentials
- **SQLAlchemy**: Use parameterized queries to prevent SQL injection
- **Docker**: Default PostgreSQL password is weak - change for production

## Deployment Checklist

Before deploying or sharing:
- [ ] `.env` file exists with correct credentials
- [ ] Docker Compose running: `docker ps | grep compressor_postgres`
- [ ] Database schema initialized: `psql -h localhost -U postgres -d compressor_health -c "\dt"`
- [ ] Sample data generated: `ls data/raw/sensor_readings.parquet`
- [ ] ETL pipeline executed successfully
- [ ] PostgreSQL tables populated: `SELECT COUNT(*) FROM sensor_readings_agg;`
- [ ] Dashboard launches without errors
- [ ] All 4 dashboard pages load correctly

## Resources

- **Project README**: [README.md](README.md) - User-facing documentation
- **Claude Context**: [CLAUDE.md](CLAUDE.md) - Detailed project context
- **Implementation Plan**: `~/.claude/plans/bubbly-splashing-patterson.md`
- **PySpark Documentation**: https://spark.apache.org/docs/latest/api/python/
- **Delta Lake Guide**: https://docs.delta.io/latest/index.html
- **Streamlit Documentation**: https://docs.streamlit.io/
- **PostgreSQL 14 Manual**: https://www.postgresql.org/docs/14/

---

**Note for Agents**: This infrastructure guide is meant to be comprehensive. If you encounter issues not covered here, update this document for future agents.
