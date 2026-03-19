"""
PySpark Explicit Schema Definitions

This module defines explicit schemas for all data structures used in the ETL pipeline.
Using explicit schemas instead of schema inference provides MASSIVE performance improvements:
- 10-100x faster data loading (no need to scan files to infer types)
- Prevents unexpected type conversions
- Catches data quality issues early
- Enables schema evolution tracking

Why explicit schemas matter:
- inferSchema=True requires Spark to read entire file to guess types
- Explicit schemas allow Spark to skip this expensive operation
- Critical for large datasets (50k+ rows)

Author: David Fernandez
"""

# ===========================================================================
# PATTERN: Explicit StructType Schemas (Never Use inferSchema)
# WHY: When Spark infers schema, it reads the entire file (or a sample)
#      to guess column types. This is 10-100x slower than providing an
#      explicit schema, and it can produce wrong types (e.g., inferring
#      a compressor_id "COMP-0001" as StringType is correct, but a
#      column of "0"/"1" values might be inferred as IntegerType when
#      it should be StringType). Explicit schemas guarantee:
#      1. Consistent types across all pipeline runs (no surprise casts)
#      2. Immediate failure if source data is missing required columns
#      3. Fast loading (Spark skips the inference scan entirely)
# SCALING: At 1.35M rows/day, inferSchema would add 30-60 seconds per
#          read just for type detection. With explicit schemas, reads
#          start immediately — the schema is known at compile time.
# ALTERNATIVE: Could use schema-on-read (Parquet self-describing format),
#              but that still requires Spark to read file footers. Explicit
#              schemas are even faster and catch mismatches at load time.
# ===========================================================================

# ===========================================================================
# PATTERN: Schema Evolution Strategy (Add Fields, Never Remove)
# WHY: IoT devices get firmware updates over time that add new sensor
#      types. When a new sensor is added, we add a new field to the
#      schema with nullable=True. Old data (before the firmware update)
#      will have null values for the new field. We NEVER remove fields
#      because downstream consumers (dashboards, ML models, agents)
#      may still reference them. This append-only approach to schema
#      changes prevents breaking changes across the pipeline.
# SCALING: Delta Lake's mergeSchema option handles this automatically —
#          new columns are added to the table metadata without rewriting
#          existing data files.
# ALTERNATIVE: Versioned schemas (v1, v2, etc.) with migration scripts.
#              More complex but provides stronger guarantees. Overkill
#              for sensor telemetry where all changes are additive.
# ===========================================================================

from pyspark.sql.types import (
    StructType,
    StructField,
    StringType,
    TimestampType,
    DoubleType,
    IntegerType,
    DateType,
)


# ============================================================================
# SENSOR READINGS SCHEMA
# ============================================================================
# Schema for raw sensor data from compressor units
# Matches output from src/data_simulator/fleet_simulator.py

SENSOR_SCHEMA = StructType([
    # === IDENTIFIERS ===
    # Compressor ID: Format "COMP-0001" through "COMP-4700"
    # nullable=False: Every reading MUST have a compressor_id. Without it,
    # we cannot attribute the data to any unit and it is useless. Records
    # with null compressor_id are rejected at the ingestion boundary
    # (schema_registry.py) before reaching Bronze.
    StructField("compressor_id", StringType(), nullable=False),

    # Timestamp: 5-minute intervals (288 readings per compressor per day)
    # nullable=False: Timestamp is part of the composite deduplication key
    # (compressor_id + timestamp) in the Silver layer. Without it, we
    # cannot deduplicate or order readings chronologically.
    StructField("timestamp", TimestampType(), nullable=False),

    # === VIBRATION SENSOR ===
    # Vibration level in millimeters per second (mm/s)
    # Key indicator of mechanical health — bearing wear causes exponential
    # vibration increase (see failure_scenarios.py BEARING_WEAR mode).
    # Normal: 1.5-4.5, Warning: >6.0, Critical: >8.0
    # nullable=True: Sensor may be offline due to intermittent connectivity,
    # maintenance, or sensor failure. A reading with null vibration but
    # valid temperature is still valuable for temp drift detection.
    StructField("vibration_mms", DoubleType(), nullable=True),

    # === TEMPERATURE SENSOR ===
    # Discharge temperature in Fahrenheit
    # Indicates compression efficiency and cooling system health.
    # Cooling degradation causes linear temperature rise over days
    # (see failure_scenarios.py COOLING_DEGRADATION mode).
    # Normal: 180-220F, Warning: >240F, Critical: >260F
    # nullable=True: Same intermittent connectivity rationale as vibration.
    StructField("discharge_temp_f", DoubleType(), nullable=True),

    # === PRESSURE SENSORS ===
    # Suction (inlet) pressure in PSI — gas entering the compressor
    # Normal: 40-80 PSI, Warning: <30 PSI, Critical: <20 PSI
    # Low suction pressure indicates upstream supply issues or leaks.
    # nullable=True: Sensor connectivity may be intermittent.
    StructField("suction_pressure_psi", DoubleType(), nullable=True),

    # Discharge (outlet) pressure in PSI — gas leaving the compressor
    # Normal: 900-1200 PSI, Warning: >1300 PSI, Critical: >1400 PSI
    # Physical law: discharge MUST exceed suction (quality.py validates this).
    # Valve failure causes pressure oscillations (VALVE_FAILURE mode).
    # nullable=True: Sensor connectivity may be intermittent.
    StructField("discharge_pressure_psi", DoubleType(), nullable=True),

    # === PERFORMANCE METRICS ===
    # Power consumption in horsepower
    # Normal: 1200-1600 HP (varies by compressor model, see profiles.py)
    # nullable=True: HP sensor is often calculated, not directly measured.
    StructField("horsepower_consumption", DoubleType(), nullable=True),

    # Gas flow rate in thousand cubic feet per day (Mcf/day)
    # Normal: 8000-12000 Mcf/day (varies by compressor size)
    # Ring wear causes gradual efficiency loss (RING_WEAR mode).
    # nullable=True: Flow meters require periodic recalibration.
    StructField("gas_flow_mcf", DoubleType(), nullable=True),

    # === OPERATIONAL METRICS ===
    # Cumulative operating hours since last maintenance reset
    # Used by RUL predictor to estimate remaining useful life.
    # nullable=True: Some legacy SCADA systems do not track hours.
    StructField("operating_hours", DoubleType(), nullable=True),
])


# ============================================================================
# COMPRESSOR METADATA SCHEMA
# ============================================================================
# Schema for compressor fleet metadata
# Static information about each compressor unit

METADATA_SCHEMA = StructType([
    # Unique compressor identifier
    StructField("compressor_id", StringType(), nullable=False),

    # Equipment model (e.g., "Ajax DPC-360", "Ariel JGK/4")
    StructField("model", StringType(), nullable=False),

    # Rated horsepower capacity
    StructField("horsepower", IntegerType(), nullable=False),

    # Installation date
    StructField("install_date", DateType(), nullable=False),

    # Station where compressor is located (e.g., "STATION-A")
    StructField("station_id", StringType(), nullable=False),
])


# ============================================================================
# MAINTENANCE LOGS SCHEMA
# ============================================================================
# Schema for maintenance event records

MAINTENANCE_SCHEMA = StructType([
    # UUID for maintenance record
    StructField("maintenance_id", StringType(), nullable=False),

    # Compressor identifier
    StructField("compressor_id", StringType(), nullable=False),

    # Event type: 'scheduled', 'unscheduled', 'inspection', 'failure'
    StructField("maintenance_type", StringType(), nullable=False),

    # Human-readable description of event
    StructField("description", StringType(), nullable=True),

    # Timestamp when performed
    StructField("performed_at", TimestampType(), nullable=True),

    # Cost in USD
    StructField("cost_usd", DoubleType(), nullable=True),

    # Technician who performed
    StructField("performed_by", StringType(), nullable=True),

    # Additional notes
    StructField("notes", StringType(), nullable=True),
])


# ============================================================================
# GOLD LAYER SCHEMA (with Features)
# ============================================================================
# Extended schema including engineered features from rolling window
# aggregations and derived metrics. This is the ML-ready feature set
# that gets consumed by all 4 ML models (anomaly detection, temp drift,
# emissions, RUL). The schema documents the full feature engineering
# output so downstream consumers know exactly what columns to expect.
# SCALING: At 4,700 compressors, the Gold schema produces ~112,800 hourly
# aggregate rows per day with all these features computed.

GOLD_SCHEMA = StructType([
    # === BASE FIELDS (from sensor schema) ===
    StructField("compressor_id", StringType(), nullable=False),
    StructField("timestamp", TimestampType(), nullable=False),
    StructField("vibration_mms", DoubleType(), nullable=True),
    StructField("discharge_temp_f", DoubleType(), nullable=True),
    StructField("suction_pressure_psi", DoubleType(), nullable=True),
    StructField("discharge_pressure_psi", DoubleType(), nullable=True),
    StructField("horsepower_consumption", DoubleType(), nullable=True),
    StructField("gas_flow_mcf", DoubleType(), nullable=True),
    StructField("operating_hours", DoubleType(), nullable=True),

    # === 1-HOUR WINDOW FEATURES ===
    # Rolling averages over last 1 hour (6 readings)
    StructField("vibration_1hr_mean", DoubleType(), nullable=True),
    StructField("vibration_1hr_std", DoubleType(), nullable=True),
    StructField("vibration_1hr_max", DoubleType(), nullable=True),

    StructField("temp_1hr_mean", DoubleType(), nullable=True),
    StructField("temp_1hr_std", DoubleType(), nullable=True),

    StructField("pressure_1hr_mean", DoubleType(), nullable=True),

    # === 4-HOUR WINDOW FEATURES ===
    # Rolling averages over last 4 hours (24 readings)
    StructField("vibration_4hr_mean", DoubleType(), nullable=True),
    StructField("temp_4hr_mean", DoubleType(), nullable=True),
    StructField("pressure_4hr_mean", DoubleType(), nullable=True),

    # === 24-HOUR WINDOW FEATURES ===
    # Rolling averages over last 24 hours (144 readings)
    StructField("vibration_24hr_mean", DoubleType(), nullable=True),
    StructField("temp_24hr_mean", DoubleType(), nullable=True),
    StructField("pressure_24hr_mean", DoubleType(), nullable=True),

    # === DERIVED FEATURES ===
    # Rate of change features (gradients)
    # Temperature change over last hour (°F/hour)
    StructField("temp_1hr_delta", DoubleType(), nullable=True),

    # Pressure differential: discharge - suction (PSI)
    StructField("pressure_differential", DoubleType(), nullable=True),

    # === THRESHOLD FLAGS ===
    # Status flags: 'normal', 'warning', 'critical'
    StructField("vibration_status", StringType(), nullable=True),
    StructField("temp_status", StringType(), nullable=True),
    StructField("pressure_status", StringType(), nullable=True),

    # === TIME FEATURES ===
    # Hour of day (0-23) - useful for detecting time-of-day patterns
    StructField("hour_of_day", IntegerType(), nullable=True),

    # Day of week (1=Monday, 7=Sunday)
    StructField("day_of_week", IntegerType(), nullable=True),

    # Weekend flag (True/False)
    StructField("is_weekend", IntegerType(), nullable=True),  # Using IntegerType for boolean (0/1)

    # Date column (for partitioning)
    StructField("date", DateType(), nullable=False),
])


# ============================================================================
# EMISSIONS ESTIMATES SCHEMA
# ============================================================================
# Schema for EPA Subpart W / OOOOb emissions estimates.
# Required for regulatory compliance — Archrock must report methane
# and CO2-equivalent emissions per compressor. The estimation_method
# field tracks which EPA emission factor was used (allows auditing).
# SCALING: One emissions estimate per compressor per pipeline run =
# 4,700 rows per run, trivial volume but high regulatory importance.

EMISSIONS_SCHEMA = StructType([
    StructField("compressor_id", StringType(), False),
    StructField("estimate_timestamp", TimestampType(), False),
    StructField("methane_tonnes", DoubleType(), True),
    StructField("co2e_tonnes", DoubleType(), True),
    StructField("emission_rate_scfh", DoubleType(), True),
    StructField("estimation_method", StringType(), True),
    StructField("organization_id", StringType(), True),
])


# ============================================================================
# SCHEMA VALIDATION FUNCTIONS
# ============================================================================
# These functions provide runtime validation that a DataFrame conforms to
# the expected schema. Used at pipeline boundaries (e.g., after loading
# data from an external source) to catch schema mismatches early rather
# than failing deep in the pipeline with cryptic AnalysisExceptions.
# SCALING: Schema validation is metadata-only (checks column names and
# types, not row values), so it completes in milliseconds regardless
# of DataFrame size.

def validate_sensor_schema(df):
    """
    Validate that a DataFrame matches the expected sensor schema.

    Args:
        df: PySpark DataFrame to validate

    Returns:
        tuple: (is_valid: bool, errors: list)

    Example:
        >>> is_valid, errors = validate_sensor_schema(sensor_df)
        >>> if not is_valid:
        >>>     print(f"Schema errors: {errors}")
    """
    errors = []

    # Check if all required columns exist
    required_columns = [field.name for field in SENSOR_SCHEMA.fields if not field.nullable]

    for col in required_columns:
        if col not in df.columns:
            errors.append(f"Missing required column: {col}")

    # Check if data types match
    for field in SENSOR_SCHEMA.fields:
        if field.name in df.columns:
            actual_type = df.schema[field.name].dataType
            expected_type = field.dataType

            if type(actual_type) != type(expected_type):
                errors.append(
                    f"Column '{field.name}' has incorrect type. "
                    f"Expected: {expected_type}, Got: {actual_type}"
                )

    is_valid = len(errors) == 0
    return is_valid, errors


def get_schema_by_name(schema_name):
    """
    Get schema object by name.

    Args:
        schema_name (str): One of 'sensor', 'metadata', 'maintenance', 'gold'

    Returns:
        StructType: PySpark schema object

    Raises:
        ValueError: If schema_name is not recognized

    Example:
        >>> schema = get_schema_by_name('sensor')
        >>> df = spark.read.schema(schema).parquet('data/raw/sensor_readings.parquet')
    """
    schemas = {
        'sensor': SENSOR_SCHEMA,
        'metadata': METADATA_SCHEMA,
        'maintenance': MAINTENANCE_SCHEMA,
        'gold': GOLD_SCHEMA,
        'emissions': EMISSIONS_SCHEMA,
    }

    if schema_name not in schemas:
        raise ValueError(
            f"Unknown schema: {schema_name}. "
            f"Available schemas: {', '.join(schemas.keys())}"
        )

    return schemas[schema_name]


def print_schema_info(schema_name):
    """
    Print human-readable information about a schema.

    Args:
        schema_name (str): One of 'sensor', 'metadata', 'maintenance', 'gold'

    Example:
        >>> print_schema_info('sensor')
        Schema: sensor
        ├── compressor_id (StringType, required)
        ├── timestamp (TimestampType, required)
        ├── vibration_mms (DoubleType, optional)
        ...
    """
    schema = get_schema_by_name(schema_name)

    print(f"\nSchema: {schema_name}")
    print("=" * 60)

    for field in schema.fields:
        required_str = "required" if not field.nullable else "optional"
        type_str = type(field.dataType).__name__
        print(f"├── {field.name:30s} ({type_str:15s}, {required_str})")

    print(f"\nTotal fields: {len(schema.fields)}")


# ============================================================================
# USAGE EXAMPLES
# ============================================================================

if __name__ == "__main__":
    # Example: Print all schema information
    print("\n" + "=" * 80)
    print("COMPRESSOR HEALTH ETL - SCHEMA DEFINITIONS")
    print("=" * 80)

    for schema_name in ['sensor', 'metadata', 'maintenance', 'gold', 'emissions']:
        print_schema_info(schema_name)
        print()

    # Example: How to use schemas in ETL code
    print("\nUsage Example:")
    print("-" * 60)
    print("""
    from pyspark.sql import SparkSession
    from src.etl.schemas import SENSOR_SCHEMA

    # Create Spark session
    spark = SparkSession.builder.getOrCreate()

    # Load data with explicit schema (FAST!)
    sensor_df = spark.read \\
        .schema(SENSOR_SCHEMA) \\
        .parquet('data/raw/sensor_readings.parquet')

    # Validate schema
    is_valid, errors = validate_sensor_schema(sensor_df)
    if not is_valid:
        raise ValueError(f"Schema validation failed: {errors}")
    """)
