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

from pyspark.sql.types import (
    StructType,
    StructField,
    StringType,
    TimestampType,
    DoubleType,
    IntegerType,
    DateType,
    FloatType
)


# ============================================================================
# SENSOR READINGS SCHEMA
# ============================================================================
# Schema for raw sensor data from compressor units
# Matches output from src/data_simulator/compressor_simulator.py

SENSOR_SCHEMA = StructType([
    # === IDENTIFIERS ===
    # Compressor ID: Format "COMP-001" through "COMP-010"
    StructField("compressor_id", StringType(), nullable=False),

    # Timestamp: 10-minute intervals (144 readings per day)
    StructField("timestamp", TimestampType(), nullable=False),

    # === VIBRATION SENSOR ===
    # Vibration level in millimeters per second (mm/s)
    # Key indicator of mechanical health
    # Normal: 1.5-4.5, Warning: >6.0, Critical: >8.0
    StructField("vibration_mms", DoubleType(), nullable=True),

    # === TEMPERATURE SENSOR ===
    # Discharge temperature in Fahrenheit
    # Indicates compression efficiency and cooling health
    # Normal: 180-220°F, Warning: >240°F, Critical: >260°F
    StructField("discharge_temp_f", DoubleType(), nullable=True),

    # === PRESSURE SENSORS ===
    # Suction (inlet) pressure in PSI
    # Normal: 40-80 PSI, Warning: <30 PSI, Critical: <20 PSI
    StructField("suction_pressure_psi", DoubleType(), nullable=True),

    # Discharge (outlet) pressure in PSI
    # Normal: 900-1200 PSI, Warning: >1300 PSI, Critical: >1400 PSI
    StructField("discharge_pressure_psi", DoubleType(), nullable=True),

    # === PERFORMANCE METRICS ===
    # Power consumption in horsepower
    # Normal: 1200-1600 HP
    StructField("horsepower_consumption", DoubleType(), nullable=True),

    # Gas flow rate in thousand cubic feet per day (Mcf/day)
    # Normal: 8000-12000 Mcf/day
    StructField("gas_flow_mcf", DoubleType(), nullable=True),

    # === OPERATIONAL METRICS ===
    # Cumulative operating hours since last reset
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
# Extended schema including engineered features
# This is what the gold layer output will look like

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
# Schema for EPA-based emissions estimates written to emissions_estimates table

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
