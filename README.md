# Altaviz

**MLOps platform for predictive maintenance of natural gas compression equipment**

## Overview

Altaviz monitors natural gas compressor operations across 4 Texas stations (10 compressors), processes sensor data through a distributed PySpark ETL pipeline with Delta Lake, and provides real-time operational visibility through a Next.js dashboard. Designed to integrate with Microsoft Fabric / Azure Synapse infrastructure.

### Key Features

- **PySpark ETL Pipeline**: Distributed Bronze/Silver/Gold medallion architecture with Delta Lake ACID transactions
- **Real-time Sensor Monitoring**: Track vibration, temperature, pressure, horsepower, and gas flow metrics
- **Threshold-based Alerting**: Automatic warning/critical alerts from sensor threshold violations
- **Data Quality Monitoring**: Pipeline health tracking (freshness, completeness, consistency, accuracy)
- **Dual Database Support**: PostgreSQL (local dev) and Azure SQL Database (cloud) via `DB_TYPE` env var
- **Next.js Dashboard**: Fleet overview, compressor detail, alert management, data quality pages
- **Azure Integration**: Fabric-compatible design — Delta Lake tables deploy directly to OneLake Lakehouses

## Architecture

```
Data Simulator → PySpark ETL (Bronze/Silver/Gold) → PostgreSQL / Azure SQL → Next.js Dashboard
     ↓                    ↓                                ↓                       ↓
 Raw Parquet        Delta Lake                     Hourly Aggregates         Fleet Monitoring
 50K+ readings      ACID transactions              Alerts & Metrics          Real-time Views
```

### System Components

1. **Data Simulator**: Synthetic compressor sensor data generation (pandas, one-time)
2. **ETL Pipeline**: PySpark-based Bronze → Silver → Gold transformation with Delta Lake
3. **Database**: PostgreSQL (local) or Azure SQL (cloud) for dashboard-optimized aggregates
4. **Dashboard**: Next.js 16 + React 19 frontend with real-time monitoring

## Quick Start

### Prerequisites

- Python 3.10+
- Java 11+ (for PySpark)
- Node.js 18+
- Docker

### Installation

```bash
# Clone the repository
git clone https://github.com/davidfertube/altaviz.git
cd altaviz

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

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
python src/data_simulator/compressor_simulator.py
```

This generates:
- 10 compressor units across 4 Texas stations
- 7 days of sensor data (10-minute intervals)
- ~50,000+ sensor readings
- 2 simulated failure events (COMP-003, COMP-007)

### Run ETL Pipeline

```bash
# Start PostgreSQL
docker-compose up -d

# Run complete PySpark ETL (Bronze → Silver → Gold → Database)
python src/etl/pyspark_pipeline.py
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
│   │   └── compressor_simulator.py  # 10 compressors, 7 days, 10-min intervals
│   └── etl/                         # PySpark ETL pipeline
│       ├── pyspark_pipeline.py      # Main orchestrator (Bronze → Silver → Gold → DB)
│       ├── schemas.py               # Explicit StructType schemas (SENSOR, METADATA, GOLD)
│       ├── data_quality.py          # Silver layer: null removal, outlier detection (4σ)
│       ├── transformations.py       # Gold layer: rolling windows, rate of change, thresholds
│       ├── database_writer.py       # JDBC writer (PostgreSQL + Azure SQL)
│       └── utils.py                 # Config loading, Spark session, logging
├── frontend/                        # Next.js 16 + React 19 dashboard
│   ├── src/app/                     # App Router pages
│   │   ├── page.tsx                 # Fleet Overview (map, compressor grid, alerts)
│   │   ├── monitoring/              # Monitoring grid + compressor detail
│   │   ├── alerts/                  # Alert management (filter, acknowledge, resolve)
│   │   ├── data-quality/            # Pipeline health metrics
│   │   └── api/                     # API routes (PostgreSQL queries)
│   ├── src/components/              # Reusable UI components
│   │   ├── cards/                   # Metric cards, compressor cards
│   │   ├── charts/                  # Time-series, trend charts
│   │   ├── maps/                    # Texas station map
│   │   ├── tables/                  # Alert tables, data tables
│   │   ├── indicators/              # Status indicators, gauges
│   │   ├── filters/                 # Date range, compressor, severity filters
│   │   └── ui/                      # Base UI primitives
│   └── src/lib/                     # Shared utilities
│       ├── db.ts                    # node-postgres Pool singleton
│       ├── queries.ts               # Parameterized SQL query functions
│       ├── types.ts                 # TypeScript interfaces for DB tables/views
│       └── constants.ts             # Sensor thresholds, colors, nav items
├── config/                          # Configuration files
│   ├── database.yaml                # PostgreSQL + Azure SQL connection settings
│   ├── etl_config.yaml              # Window sizes, Spark config, quality thresholds
│   └── thresholds.yaml              # Sensor normal/warning/critical ranges
├── infrastructure/
│   └── sql/
│       ├── schema.sql               # PostgreSQL DDL (7 tables, 3 views, 15 indexes)
│       ├── schema_azure_sql.sql     # Azure SQL DDL (T-SQL compatible)
│       ├── seed_data.sql            # PostgreSQL seed data (4 stations)
│       └── seed_data_azure_sql.sql  # Azure SQL seed data (MERGE syntax)
├── data/                            # Data storage (gitignored)
│   ├── raw/                         # Simulator output (Parquet, CSV)
│   └── processed/delta/             # Delta Lake tables (bronze, silver, gold)
├── docker-compose.yml               # PostgreSQL 14 + auto-init from SQL scripts
├── requirements.txt                 # Python dependencies
├── PYSPARK_GUIDE.md                 # PySpark concepts, Delta Lake, ACID, optimizations
├── AZURE_SETUP_GUIDE.md             # Azure SQL Database free tier setup
└── AZURE_FABRIC_GUIDE.md            # Microsoft Fabric deployment guide
```

## Data Schema

### Sensor Readings (Raw)

| Field | Type | Description |
|-------|------|-------------|
| `compressor_id` | VARCHAR(50) | Unique compressor identifier (COMP-001 to COMP-010) |
| `timestamp` | TIMESTAMP | Reading timestamp (10-min intervals) |
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

### Database-Agnostic Design

- `DB_TYPE=postgresql` for local development (Docker)
- `DB_TYPE=azure_sql` for Azure cloud deployment (free tier)
- JDBC connection factory auto-detects backend and constructs appropriate URLs
- Same PySpark ETL code works with both databases — no code changes needed

### Dashboard Features

- Fleet overview with Texas station map and color-coded compressor health
- Compressor detail pages with radial gauges and time-series charts
- Alert management with filtering, acknowledge, and resolve actions
- Data quality monitoring with pipeline health metrics
- Dark/light theme toggle, responsive layout, loading skeletons

## Deployment

### Local Development

```bash
docker-compose up -d                                # Start PostgreSQL
python src/data_simulator/compressor_simulator.py   # Generate sensor data
python src/etl/pyspark_pipeline.py                  # Run ETL pipeline
cd frontend && npm run dev                          # Launch dashboard
```

### Azure SQL Database

See [AZURE_SETUP_GUIDE.md](AZURE_SETUP_GUIDE.md) for step-by-step free tier setup.

### Microsoft Fabric

See [AZURE_FABRIC_GUIDE.md](AZURE_FABRIC_GUIDE.md) for cloud deployment to Fabric Lakehouses.

## Testing

```bash
# Run unit tests (NOT YET BUILT)
pytest tests/

# Run with coverage
pytest --cov=src tests/
```

## Simulated Failures

The data simulator includes 2 compressors with programmed degradation patterns for testing alert detection:

- **COMP-003**: Degradation starts Day 3, failure on Day 6
- **COMP-007**: Degradation starts Day 5, failure on Day ~8
- Patterns: vibration (exponential increase), temperature (linear increase), pressure (sinusoidal fluctuations)

## Implementation Status

| Component | Status | Details |
|-----------|--------|---------|
| Data Simulator | Done | 10 compressors, 7 days, 2 failure scenarios |
| PySpark ETL | Done | Bronze/Silver/Gold with Delta Lake |
| Database Schema | Done | PostgreSQL + Azure SQL (7 tables, 3 views) |
| Next.js Dashboard | Done | Fleet overview, monitoring, alerts, data quality |
| ML Model | Not Started | LSTM for remaining useful life prediction |
| Test Suite | Not Started | pytest for ETL pipeline |

## Author

**David Fernandez**
- GitHub: [@davidfertube](https://github.com/davidfertube)
- LinkedIn: [davidfertube](https://www.linkedin.com/in/davidfertube/)

---

*Built with PySpark, Delta Lake, PostgreSQL, Azure SQL, Next.js, React, and Tailwind CSS*
