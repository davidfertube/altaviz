# Altaviz - Claude Context

## Project Overview

This is a **production-ready MLOps platform** for predictive maintenance of natural gas compression equipment. The system monitors 10 compressor units across 4 stations in Texas, processes sensor data through PySpark ETL pipelines, stores aggregated metrics in PostgreSQL, and provides real-time monitoring through a Streamlit dashboard.

## Architecture

```
Data Simulator → PySpark ETL (Bronze/Silver/Gold) → PostgreSQL → Streamlit Dashboard
     ↓                    ↓                              ↓              ↓
  Parquet files    Delta Lake tables          7 normalized tables   4-page UI
  50k+ readings    Feature engineering        Time-series data      Real-time monitoring
```

## Key Technical Details

### Technology Stack
- **Data Processing**: PySpark 3.5.0 with Delta Lake 3.0.0
- **Database**: PostgreSQL 14+ with SQLAlchemy 2.0.25
- **Dashboard**: Streamlit 1.31.0 with Plotly 5.18.0 and Folium 0.15.1
- **ML (Future)**: TensorFlow 2.15.0 for LSTM-based RUL prediction
- **Infrastructure**: Docker Compose for local development, Terraform for Azure deployment

### Data Flow
1. **Data Generation**: [src/data_simulator/compressor_simulator.py](src/data_simulator/compressor_simulator.py) generates 7 days of 10-minute interval sensor readings for 10 compressors (50,000+ records)
2. **ETL Pipeline**: PySpark processes raw Parquet → Bronze (raw) → Silver (cleaned) → Gold (feature-engineered) Delta Lake tables
3. **Database Storage**: Aggregated hourly metrics written to PostgreSQL (1hr, 4hr, 24hr windows)
4. **Visualization**: Streamlit dashboard reads from PostgreSQL for real-time fleet health monitoring

### Database Schema (7 Tables + 3 Views)
- **station_locations**: 4 Texas stations with lat/long coordinates
- **compressor_metadata**: 10 compressor units (Ajax, Ariel, Caterpillar, Waukesha models)
- **sensor_readings_agg**: Hourly aggregated sensor data (not raw - too large)
  - Multi-window: 1hr, 4hr, 24hr aggregates in single table
  - Partitioned by compressor_id and timestamp for fast queries
- **maintenance_events**: Scheduled maintenance and failure logs
- **alert_history**: Threshold violation alerts (warning/critical)
- **data_quality_metrics**: Pipeline monitoring and data freshness
- **ml_predictions**: Remaining Useful Life (RUL) predictions (future)

**Views**:
- `v_latest_readings`: Most recent 1hr aggregates per compressor
- `v_active_alerts`: Unresolved alerts with compressor/station context
- `v_fleet_health_summary`: Complete fleet status with health indicators

### Sensor Metrics & Thresholds
From [src/data_simulator/compressor_simulator.py:49-71](src/data_simulator/compressor_simulator.py#L49-L71):

| Sensor | Normal Range | Warning | Critical | Unit |
|--------|--------------|---------|----------|------|
| Vibration | 1.5-4.5 | 6.0 | 8.0 | mm/s |
| Discharge Temp | 180-220 | 240 | 260 | °F |
| Suction Pressure | 40-80 | <30 | <20 | PSI |
| Discharge Pressure | 900-1200 | >1300 | >1400 | PSI |
| Horsepower | 1200-1600 | - | - | HP |
| Gas Flow | 8000-12000 | - | - | Mcf/day |

### PySpark Optimization Patterns

**Critical for performance:**
1. **Explicit Schemas**: Always use explicit StructType schemas (10-100x faster than inferSchema)
   ```python
   from pyspark.sql.types import StructType, StructField, StringType, TimestampType, DoubleType
   SENSOR_SCHEMA = StructType([...])
   ```

2. **Single Select Pattern**: Avoid chained `.withColumn()` calls
   ```python
   # BAD - multiple passes
   df.withColumn("a", ...).withColumn("b", ...).withColumn("c", ...)

   # GOOD - single pass
   df.select(col("*"), expr("...").alias("a"), expr("...").alias("b"), ...)
   ```

3. **Broadcast Joins**: Small tables (metadata) should be broadcast
   ```python
   from pyspark.sql.functions import broadcast
   large_df.join(broadcast(small_df), "compressor_id")
   ```

4. **Partitioning**: Gold layer partitioned by date for time-range queries
   ```python
   gold_df.write.format("delta").partitionBy("date").save(...)
   ```

5. **Window Functions**: Define window specs once, reuse for all aggregations
   ```python
   window_1hr = Window.partitionBy("compressor_id").orderBy("timestamp").rangeBetween(-3600, 0)
   ```

## Working with This Project

### Environment Setup
```bash
# 1. Start PostgreSQL
docker-compose up -d

# 2. Verify database schema
psql -h localhost -U postgres -d compressor_health -c "\dt"

# 3. Generate sample data
python src/data_simulator/compressor_simulator.py

# 4. Run ETL pipeline
python src/etl/pyspark_pipeline.py

# 5. Launch dashboard
streamlit run src/dashboard/app.py
```

### Project Structure
```
src/
├── data_simulator/      # Synthetic data generation (COMPLETED)
├── etl/                 # PySpark ETL pipeline (6 modules)
│   ├── schemas.py       # Explicit PySpark schemas
│   ├── utils.py         # Config loading, Spark session
│   ├── data_quality.py  # Validation functions
│   ├── transformations.py  # Feature engineering
│   ├── database_writer.py  # PostgreSQL writes
│   └── pyspark_pipeline.py # Main orchestrator
└── dashboard/           # Streamlit multi-page app
    ├── app.py          # Main entry point
    ├── components/     # Reusable UI components (map, gauges, charts)
    ├── pages/          # 4 pages (Fleet, Monitoring, Alerts, Quality)
    └── utils/          # DB connections, queries, styling

config/                  # YAML configs (database, ETL, thresholds)
infrastructure/sql/      # PostgreSQL schema and seed data
data/
├── raw/                # Bronze: Raw Parquet from simulator
└── processed/delta/    # Silver/Gold: Delta Lake tables
```

### Configuration Files
- **config/database.yaml**: PostgreSQL connection settings (reads from .env)
- **config/etl_config.yaml**: ETL parameters (window sizes, data paths, Spark configs)
- **config/thresholds.yaml**: Sensor thresholds and station locations
- **.env**: Database credentials and environment variables

### Feature Engineering in ETL
The gold layer creates:
- **Rolling window aggregations**: mean, std, max, min for 1hr, 4hr, 24hr windows
- **Rate of change**: Temperature gradient (lag + delta over 1 hour)
- **Derived metrics**: Pressure differential (discharge - suction)
- **Threshold flags**: warning/critical status based on sensor values
- **Time features**: hour_of_day, day_of_week, is_weekend

### Dashboard Design (Clean, Modern Minimalist)
**Color Palette**:
- Primary: #1F77B4 (blue)
- Success: #2CA02C (green - healthy)
- Warning: #FF7F0E (orange)
- Critical: #D62728 (red)
- Background: #F8F9FA (light gray)

**4 Pages**:
1. **Fleet Overview**: Interactive map with color-coded markers, metric cards, station summary
2. **Real-Time Monitoring**: Compressor selector, 4 gauge charts, 24-hour trend plots
3. **Predictive Alerts**: Filterable alert table, alert history chart
4. **Data Quality**: Freshness metrics, completeness indicators, missing data alerts

**Performance**: Uses `@st.cache_data(ttl=60)` for database queries, `@st.cache_resource` for connections

## When Working on This Project

### Adding New Features
- **New sensors**: Update [src/data_simulator/compressor_simulator.py:49-56](src/data_simulator/compressor_simulator.py#L49-L56) ranges, then add columns to ETL schemas
- **New thresholds**: Update [config/thresholds.yaml](config/thresholds.yaml) and ETL transformation logic
- **New dashboard pages**: Add to `src/dashboard/pages/` (Streamlit auto-discovers numbered pages)
- **New database tables**: Add to [infrastructure/sql/schema.sql](infrastructure/sql/schema.sql), then rebuild with `docker-compose down -v && docker-compose up -d`

### Modifying ETL Logic
- Always maintain Bronze → Silver → Gold pattern for data lineage
- Use explicit schemas (never inferSchema)
- Test transformations on small dataset before full pipeline
- Check Delta Lake table versions: `spark.read.format("delta").option("versionAsOf", 0).load(...)`

### Database Queries
- Use views (v_latest_readings, v_active_alerts, v_fleet_health_summary) for common patterns
- Time-series queries: Always filter on `agg_timestamp` and `compressor_id` for index usage
- Aggregates: Query by `window_type` ('1hr', '4hr', '24hr')

### Testing
- **ETL**: Generate small test dataset, run pipeline, verify PostgreSQL row counts
- **Dashboard**: Use `streamlit run --server.headless=true` for CI/CD testing
- **Data Quality**: Check `data_quality_metrics` table for pipeline health

## Design Decisions

1. **Aggregated Storage**: PostgreSQL stores hourly aggregates (not raw 10-min readings) - reduces volume by 83%
2. **Bronze/Silver/Gold**: Full medallion architecture with Delta Lake for auditing and reprocessing
3. **Multi-Window Table**: Single table with 1hr/4hr/24hr windows (discriminator pattern) vs 3 separate tables
4. **Batch Processing**: Hourly ETL runs (near-real-time) vs streaming (can add Spark Structured Streaming later)
5. **Hardcoded Thresholds**: Industry-standard equipment specs vs ML-based anomaly detection (Phase 2)
6. **PostgreSQL vs TimescaleDB**: Stick with PostgreSQL + aggregation (already in stack, sufficient for 10 compressors)

## Simulated Failure Scenarios

The data simulator creates 2 failing compressors (see [src/data_simulator/compressor_simulator.py:74-75](src/data_simulator/compressor_simulator.py#L74-L75)):
- **COMP-003**: Degradation starts Day 3, failure on Day 6
- **COMP-007**: Degradation starts Day 5, failure on Day 8 (estimate)

**Degradation patterns**:
- Vibration: Exponential increase
- Temperature: Linear increase
- Pressure: Sinusoidal fluctuations

Dashboard should show these units with warning/critical alerts.

## Future Enhancements (Not Yet Implemented)

1. **ML Model Integration**: LSTM for Remaining Useful Life (RUL) prediction
2. **Real-time Streaming**: Kafka/Kinesis → Spark Structured Streaming
3. **Alert Notifications**: Email/Slack webhooks for critical alerts
4. **User Authentication**: Streamlit authentication for multi-user access
5. **Azure Deployment**: Terraform for Synapse/Fabric infrastructure
6. **Data Drift Detection**: Statistical tests (KS test, PSI) for model monitoring

## Important Notes

- **Database credentials**: In `.env` file (gitignored) - never commit to repo
- **Data files**: `data/raw/*.csv` and `data/processed/*.parquet` are gitignored
- **Delta Lake**: Requires Spark 3.5+ with Delta extensions configured
- **Streamlit**: Multi-page apps require files in `pages/` to be named like `1_PageName.py`
- **PostgreSQL**: Uses Docker volume for persistence - `docker-compose down` keeps data, `docker-compose down -v` deletes it

## Troubleshooting

**PySpark "Delta table not found"**: Initialize Delta table with `.write.format("delta").mode("overwrite").save(...)` first
**Streamlit "st.cache_data" error**: Upgrade to Streamlit 1.18+ (older versions use `@st.cache`)
**PostgreSQL connection refused**: Check `docker ps` to verify container is running
**Dashboard shows no data**: Verify ETL pipeline ran successfully and PostgreSQL tables are populated
**Delta Lake version conflicts**: Ensure PySpark 3.5.0 matches Delta Spark 3.0.0

## Contact

**Author**: David Fernandez
**Email**: davidfertube@gmail.com
**GitHub**: [@davidfertube](https://github.com/davidfertube)

---

*This file provides context to Claude Code and other AI assistants working on this project. Keep it updated as the project evolves.*
