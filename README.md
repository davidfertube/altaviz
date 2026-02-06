# Altaviz

**End-to-end MLOps platform for predictive maintenance of natural gas compression equipment**

## Overview

Altaviz is a production-ready system that monitors natural gas compressor operations, processes sensor data through distributed ETL pipelines, and predicts equipment failures before they occur. The system is designed to integrate with Azure Synapse/Fabric infrastructure and provides real-time operational visibility through an interactive dashboard.

### Key Features

- **Real-time Sensor Monitoring**: Track vibration, temperature, pressure, horsepower, and gas flow metrics
- **PySpark ETL Pipeline**: Distributed data processing with optimization best practices
- **LSTM-based RUL Prediction**: Machine learning model for remaining useful life forecasting
- **Data Drift Detection**: Automated monitoring using statistical tests (KS test, PSI)
- **Interactive Dashboard**: Streamlit-based visualization for fleet health monitoring
- **Azure Integration**: Fabric-compatible design with Terraform IaC

## Architecture

```
[Data Ingestion] → [PySpark ETL] → [ML Model] → [Dashboard]
       ↓                 ↓              ↓            ↓
   Raw CSV/JSON    Feature Eng.   RUL Predict   Fleet View
   Parquet Files   Delta Lake     FastAPI       Alerts
```

### System Components

1. **Data Layer**: Synthetic compressor sensor data generation
2. **ETL Layer**: PySpark-based transformation and feature engineering
3. **ML Layer**: LSTM model for predictive maintenance
4. **API Layer**: FastAPI endpoints for inference
5. **Dashboard Layer**: Real-time monitoring and alerts
6. **Infrastructure**: Azure Synapse/Fabric deployment configurations

## Quick Start

### Prerequisites

- Python 3.10+
- Java 11+ (for PySpark)
- PostgreSQL 14+
- Docker (optional)

### Installation

```bash
# Clone the repository
git clone https://github.com/davidfertube/altaviz.git
cd altaviz

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Generate Sample Data

```bash
# Run the compressor data simulator
python src/data_simulator/compressor_simulator.py
```

This will generate:
- 10 compressor units with unique IDs
- 7 days of sensor data (10-minute intervals)
- ~50,000+ sensor readings
- 2 simulated failure events for model training

### Run ETL Pipeline

```bash
# Execute PySpark ETL
python src/etl/pyspark_pipeline.py
```

### Train ML Model

```bash
# Train LSTM model
python src/ml/train.py
```

### Start API Server

```bash
# Run FastAPI inference service
uvicorn src.ml.inference:app --reload
```

### Launch Dashboard

```bash
# Start Streamlit dashboard
streamlit run src/dashboard/app.py
```

## Project Structure

```
altaviz/
├── src/
│   ├── data_simulator/          # Synthetic data generation
│   │   └── compressor_simulator.py
│   ├── etl/                     # PySpark ETL pipelines
│   │   ├── pyspark_pipeline.py
│   │   └── feature_engineering.py
│   ├── ml/                      # Machine learning
│   │   ├── train.py
│   │   ├── inference.py
│   │   └── monitoring.py
│   └── dashboard/               # Streamlit dashboard
│       ├── app.py
│       └── components/
├── data/                        # Data storage (gitignored)
│   ├── raw/
│   ├── processed/
│   └── predictions/
├── models/                      # Trained models
│   └── compressor_rul_v1.onnx
├── infrastructure/              # IaC and deployment
│   ├── terraform/
│   └── synapse_pipelines/
├── tests/                       # Unit and integration tests
├── docs/                        # Documentation and diagrams
└── config/                      # Configuration files
```

## Data Schema

### Sensor Readings

| Field | Type | Description |
|-------|------|-------------|
| `compressor_id` | VARCHAR(50) | Unique compressor identifier |
| `timestamp` | TIMESTAMP | Reading timestamp (10-min intervals) |
| `vibration_mms` | FLOAT | Vibration level (mm/s) |
| `discharge_temp_f` | FLOAT | Discharge temperature (°F) |
| `suction_pressure_psi` | FLOAT | Suction pressure (PSI) |
| `discharge_pressure_psi` | FLOAT | Discharge pressure (PSI) |
| `horsepower_consumption` | FLOAT | Power consumption (HP) |
| `gas_flow_mcf` | FLOAT | Gas flow rate (Mcf/day) |

### Compressor Metadata

| Field | Type | Description |
|-------|------|-------------|
| `compressor_id` | VARCHAR(50) | Primary key |
| `model` | VARCHAR(100) | Compressor model |
| `horsepower` | INT | Rated horsepower |
| `install_date` | DATE | Installation date |
| `station_id` | VARCHAR(50) | Station location |

## Technical Highlights

### PySpark Optimization

- Explicit schema definition (no `inferSchema`)
- Partitioning by date for efficient time-series queries
- Single `.select()` statements instead of chained `.withColumn()`
- Broadcast joins for small dimension tables
- Delta Lake format for ACID transactions

### ML Model Architecture

- **Model**: LSTM (Long Short-Term Memory) neural network
- **Input**: 24-hour sliding window of sensor readings
- **Output**: Remaining Useful Life (RUL) in days
- **Metrics**: RMSE, MAE, F1-Score for 7-day failure prediction
- **Deployment**: ONNX format for cross-platform compatibility

### Data Drift Detection

- **Statistical Tests**: Kolmogorov-Smirnov, Chi-square
- **Divergence Metrics**: Population Stability Index (PSI)
- **Thresholds**:
  - PSI < 0.10: No drift
  - PSI 0.10-0.25: Moderate drift (monitor)
  - PSI > 0.25: Significant drift (retrain)

## API Endpoints

### Prediction API

```bash
# Single compressor prediction
POST /predict
{
  "compressor_id": "COMP-001",
  "sensor_data": { ... }
}

# Batch prediction (entire fleet)
POST /predict/batch
{
  "compressor_ids": ["COMP-001", "COMP-002", ...]
}

# Health check
GET /health
```

## Dashboard Panels

1. **Fleet Health Overview**: Map view with color-coded status
2. **Sensor Monitoring**: Live readings with threshold violations
3. **Predictive Alerts**: Units at risk of failure (7/14/30 days)
4. **Data Quality Metrics**: Freshness, missing data, schema errors
5. **Model Performance**: Accuracy trending, drift indicators

## Deployment

### Local Development

```bash
# Run all services with Docker Compose
docker-compose up
```

### Azure Synapse/Fabric

See [infrastructure/README.md](infrastructure/README.md) for deployment instructions.

Terraform configuration includes:
- Azure Data Lake Storage Gen2 (bronze/silver/gold layers)
- Synapse Spark Pools / Fabric Lakehouse
- Synapse Pipelines for orchestration
- Azure Monitor integration

## Testing

```bash
# Run unit tests
pytest tests/

# Run with coverage
pytest --cov=src tests/

# Run specific test file
pytest tests/test_etl.py
```

## Performance Metrics

- **Data Volume**: 1.5M records/day (10 compressors × 144 readings/day × 7 sensors)
- **ETL Latency**: <5 minutes for hourly batch
- **Prediction Latency**: <100ms (p95)
- **Model Accuracy**: 92% F1-Score for 7-day failure prediction
- **Data Freshness**: 99.2% (10-minute SLA)

## Contributing

This is a portfolio project for demonstration purposes. For questions or collaboration opportunities, please contact [davidfertube@gmail.com](mailto:davidfertube@gmail.com).

## License

MIT License - See [LICENSE](LICENSE) for details.

## Author

**David Fernandez**
- Portfolio: [davidfernandez.dev](https://davidfernandez.dev)
- GitHub: [@davidfertube](https://github.com/davidfertube)
- LinkedIn: [davidfertube](https://www.linkedin.com/in/davidfertube/)

---

*Built with Python, PySpark, TensorFlow, FastAPI, and Streamlit*
