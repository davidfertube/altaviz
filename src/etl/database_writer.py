"""
Database Writer Module

Handles writing Gold layer data to the configured database.
Supports both PostgreSQL (local dev) and Azure SQL Database (cloud).

Uses PySpark's JDBC connector for efficient bulk writes.
Database type is controlled by DB_TYPE environment variable:
  DB_TYPE=postgresql  -> Local PostgreSQL (default)
  DB_TYPE=azure_sql   -> Azure SQL Database

Tables written:
- compressor_metadata: Fleet metadata (must be first — FK dependency)
- sensor_readings_agg: Aggregated sensor data for dashboard
- alert_history: Threshold violation alerts
- maintenance_events: Maintenance logs
- data_quality_metrics: Pipeline quality monitoring

Author: David Fernandez
"""

from pyspark.sql import DataFrame, SparkSession
from pyspark.sql.functions import col, lit, current_timestamp, when
from pyspark.sql.types import StructType, StructField, StringType, TimestampType, DoubleType, BooleanType
from typing import Dict
from datetime import datetime
import logging

from src.etl.utils import load_config


logger = logging.getLogger('CompressorHealthETL')

# Load configurations
db_config = load_config('database.yaml')
thresholds_config = load_config('thresholds.yaml')


# ============================================================================
# JDBC CONNECTION FACTORY
# ============================================================================

def get_db_type() -> str:
    """
    Get the configured database type.

    Returns:
        str: 'postgresql' or 'azure_sql'
    """
    return db_config.get('db_type', 'postgresql')


def get_jdbc_url() -> str:
    """
    Construct JDBC URL based on configured database type.

    Returns:
        str: JDBC connection URL
    """
    db_type = get_db_type()

    if db_type == 'azure_sql':
        config = db_config['azure_sql']
        jdbc_url = config['jdbc_url_template'].format(
            server=config['server'],
            port=config['port'],
            database=config['database']
        )
        logger.info(f"Using Azure SQL Database: {config['server']}")
    else:
        config = db_config['postgresql']
        jdbc_url = config['jdbc_url_template'].format(
            host=config['host'],
            port=config['port'],
            database=config['database']
        )
        logger.info(f"Using PostgreSQL: {config['host']}:{config['port']}")

    return jdbc_url


def get_jdbc_properties() -> Dict[str, str]:
    """
    Get JDBC connection properties based on configured database type.

    Returns:
        dict: Connection properties (user, password, driver)
    """
    db_type = get_db_type()

    if db_type == 'azure_sql':
        config = db_config['azure_sql']
        properties = {
            "user": config['user'],
            "password": config['password'],
            "driver": config['jdbc_driver'],
            "encrypt": "true",
            "trustServerCertificate": "false",
            "hostNameInCertificate": "*.database.windows.net",
            "loginTimeout": "30"
        }
    else:
        config = db_config['postgresql']
        properties = {
            "user": config['user'],
            "password": config['password'],
            "driver": config['jdbc_driver'],
            "stringtype": "unspecified"  # Allow implicit casts (varchar → JSONB, etc.)
        }

    return properties


def get_db_display_name() -> str:
    """Get human-readable database name for logging."""
    db_type = get_db_type()
    if db_type == 'azure_sql':
        return f"Azure SQL ({db_config['azure_sql']['server']})"
    return f"PostgreSQL ({db_config['postgresql']['host']}:{db_config['postgresql']['port']})"


# ============================================================================
# COMPRESSOR METADATA
# ============================================================================

def write_compressor_metadata(metadata_df: DataFrame, mode: str = "overwrite") -> None:
    """
    Write compressor metadata to compressor_metadata table.

    This must be called BEFORE writing sensor_readings_agg or alert_history
    because those tables have foreign key references to compressor_metadata.

    Adds latitude/longitude from station locations in thresholds.yaml.

    Args:
        metadata_df: Compressor metadata DataFrame (compressor_id, model, horsepower, install_date, station_id)
        mode: Write mode ('overwrite' to replace all, 'append' to add)
    """
    db_name = get_db_display_name()
    logger.info(f"Writing compressor metadata to {db_name} (mode={mode})...")

    jdbc_url = get_jdbc_url()
    properties = get_jdbc_properties()

    # Add lat/long from station locations in thresholds config
    stations = thresholds_config.get('station_locations', {})

    from pyspark.sql.functions import udf
    from pyspark.sql.types import DecimalType

    # Build station lat/long lookup
    station_lat = {}
    station_lon = {}
    for station_id, info in stations.items():
        station_lat[station_id] = float(info.get('latitude', 0))
        station_lon[station_id] = float(info.get('longitude', 0))

    # Add lat/long columns based on station_id
    enriched_df = metadata_df.withColumn(
        "latitude",
        when(col("station_id") == "STATION-A", lit(station_lat.get("STATION-A", 28.9144)))
        .when(col("station_id") == "STATION-B", lit(station_lat.get("STATION-B", 31.9973)))
        .when(col("station_id") == "STATION-C", lit(station_lat.get("STATION-C", 32.5007)))
        .when(col("station_id") == "STATION-D", lit(station_lat.get("STATION-D", 32.7555)))
        .otherwise(lit(None))
    ).withColumn(
        "longitude",
        when(col("station_id") == "STATION-A", lit(station_lon.get("STATION-A", -98.5242)))
        .when(col("station_id") == "STATION-B", lit(station_lon.get("STATION-B", -102.0779)))
        .when(col("station_id") == "STATION-C", lit(station_lon.get("STATION-C", -93.7465)))
        .when(col("station_id") == "STATION-D", lit(station_lon.get("STATION-D", -97.3308)))
        .otherwise(lit(None))
    )

    try:
        # Use truncate with CASCADE for overwrite to preserve table schema
        # CASCADE needed because sensor_readings_agg and alert_history FK → compressor_metadata
        if mode == 'overwrite':
            enriched_df.write \
                .mode("overwrite") \
                .option("truncate", "true") \
                .option("cascadeTruncate", "true") \
                .jdbc(
                    url=jdbc_url,
                    table="compressor_metadata",
                    properties=properties
                )
        else:
            enriched_df.write \
                .jdbc(
                    url=jdbc_url,
                    table="compressor_metadata",
                    mode=mode,
                    properties=properties
                )

        row_count = enriched_df.count()
        logger.info(f"Successfully wrote {row_count} compressor metadata records")

    except Exception as e:
        logger.error(f"Failed to write compressor metadata to {db_name}: {e}")
        raise


# ============================================================================
# SENSOR READINGS AGGREGATES
# ============================================================================

def write_sensor_aggregates(
    agg_df: DataFrame,
    mode: str = "append"
) -> None:
    """
    Write aggregated sensor readings to sensor_readings_agg table.

    Args:
        agg_df: Aggregated DataFrame from transformations.aggregate_for_dashboard()
        mode: Write mode ('append' or 'overwrite')
    """
    db_name = get_db_display_name()
    logger.info(f"Writing sensor aggregates to {db_name} (mode={mode})...")

    jdbc_url = get_jdbc_url()
    properties = get_jdbc_properties()

    try:
        agg_df.write \
            .jdbc(
                url=jdbc_url,
                table="sensor_readings_agg",
                mode=mode,
                properties=properties
            )

        row_count = agg_df.count()
        logger.info(f"Successfully wrote {row_count} rows to sensor_readings_agg")

    except Exception as e:
        logger.error(f"Failed to write sensor aggregates to {db_name}: {e}")
        raise


# ============================================================================
# ALERT GENERATION AND WRITING
# ============================================================================

def generate_alerts(gold_df: DataFrame) -> DataFrame:
    """
    Generate alerts from threshold violations in Gold layer.

    Alert types match the CHECK constraint in alert_history table:
    - threshold_warning: Sensor exceeded warning threshold
    - threshold_critical: Sensor exceeded critical threshold

    Args:
        gold_df: Gold layer DataFrame with threshold status flags

    Returns:
        DataFrame: Alert records matching alert_history table schema
    """
    logger.info("Generating alerts from threshold violations...")

    # Load threshold values for sensor_value/threshold_value columns
    sensor_thresholds = thresholds_config['sensor_thresholds']
    vib_warning = float(sensor_thresholds['vibration_mms']['warning_threshold'])
    vib_critical = float(sensor_thresholds['vibration_mms']['critical_threshold'])
    temp_warning = float(sensor_thresholds['discharge_temp_f']['warning_threshold'])
    temp_critical = float(sensor_thresholds['discharge_temp_f']['critical_threshold'])
    pressure_warning = float(sensor_thresholds['discharge_pressure_psi']['warning_threshold_high'])
    pressure_critical = float(sensor_thresholds['discharge_pressure_psi']['critical_threshold_high'])

    # Filter to only rows with warnings or critical status
    alerts_df = gold_df.filter(
        (col("vibration_status") != "normal") |
        (col("temp_status") != "normal") |
        (col("pressure_status") != "normal")
    )

    # Determine alert severity (highest severity wins)
    alerts_df = alerts_df.withColumn(
        "severity",
        when(
            (col("vibration_status") == "critical") |
            (col("temp_status") == "critical") |
            (col("pressure_status") == "critical"),
            lit("critical")
        ).otherwise(lit("warning"))
    )

    # Determine alert_type matching CHECK constraint: threshold_warning or threshold_critical
    alerts_df = alerts_df.withColumn(
        "alert_type",
        when(col("severity") == "critical", lit("threshold_critical"))
        .otherwise(lit("threshold_warning"))
    )

    # Determine which sensor triggered the alert
    alerts_df = alerts_df.withColumn(
        "sensor_name",
        when(col("vibration_status") != "normal", lit("vibration_mms"))
        .when(col("temp_status") != "normal", lit("discharge_temp_f"))
        .when(col("pressure_status") != "normal", lit("discharge_pressure_psi"))
        .otherwise(lit(None))
    )

    # Get the actual sensor value that triggered the alert
    alerts_df = alerts_df.withColumn(
        "sensor_value",
        when(col("sensor_name") == "vibration_mms", col("vibration_mms"))
        .when(col("sensor_name") == "discharge_temp_f", col("discharge_temp_f"))
        .when(col("sensor_name") == "discharge_pressure_psi", col("discharge_pressure_psi"))
        .otherwise(lit(None))
    )

    # Get the threshold value that was exceeded
    alerts_df = alerts_df.withColumn(
        "threshold_value",
        when(
            (col("sensor_name") == "vibration_mms") & (col("vibration_status") == "critical"),
            lit(vib_critical)
        )
        .when(col("sensor_name") == "vibration_mms", lit(vib_warning))
        .when(
            (col("sensor_name") == "discharge_temp_f") & (col("temp_status") == "critical"),
            lit(temp_critical)
        )
        .when(col("sensor_name") == "discharge_temp_f", lit(temp_warning))
        .when(
            (col("sensor_name") == "discharge_pressure_psi") & (col("pressure_status") == "critical"),
            lit(pressure_critical)
        )
        .when(col("sensor_name") == "discharge_pressure_psi", lit(pressure_warning))
        .otherwise(lit(None))
    )

    # Create alert message
    alerts_df = alerts_df.withColumn(
        "message",
        when(
            col("sensor_name") == "vibration_mms",
            col("vibration_mms").cast("string") + " mm/s - " + col("vibration_status") + " vibration level"
        )
        .when(
            col("sensor_name") == "discharge_temp_f",
            col("discharge_temp_f").cast("string") + " F - " + col("temp_status") + " temperature"
        )
        .when(
            col("sensor_name") == "discharge_pressure_psi",
            col("discharge_pressure_psi").cast("string") + " PSI - " + col("pressure_status") + " pressure"
        )
        .otherwise(lit("Threshold violation detected"))
    )

    # Select columns matching alert_history table schema
    alerts_df = alerts_df.select(
        col("compressor_id"),
        col("timestamp").alias("alert_timestamp"),
        col("alert_type"),
        col("severity"),
        col("sensor_name"),
        col("sensor_value").cast("decimal(10,4)"),
        col("threshold_value").cast("decimal(10,4)"),
        col("message"),
        lit(False).alias("acknowledged"),
        lit(None).cast("string").alias("acknowledged_by"),
        lit(None).cast("timestamp").alias("acknowledged_at"),
        lit(False).alias("resolved"),
        lit(None).cast("timestamp").alias("resolved_at"),
        current_timestamp().alias("created_at")
    )

    alert_count = alerts_df.count()
    logger.info(f"Generated {alert_count} alerts from threshold violations")

    return alerts_df


def write_alerts(alerts_df: DataFrame, mode: str = "append") -> None:
    """
    Write alerts to alert_history table.

    Args:
        alerts_df: Alert DataFrame from generate_alerts()
        mode: Write mode ('append' or 'overwrite')
    """
    db_name = get_db_display_name()
    logger.info(f"Writing alerts to {db_name} (mode={mode})...")

    jdbc_url = get_jdbc_url()
    properties = get_jdbc_properties()

    try:
        alerts_df.write \
            .jdbc(
                url=jdbc_url,
                table="alert_history",
                mode=mode,
                properties=properties
            )

        row_count = alerts_df.count()
        logger.info(f"Successfully wrote {row_count} alerts to alert_history")

    except Exception as e:
        logger.error(f"Failed to write alerts to {db_name}: {e}")
        raise


# ============================================================================
# DATA QUALITY METRICS
# ============================================================================

def write_quality_metrics(
    spark: SparkSession,
    metrics: Dict,
    run_timestamp: str = None
) -> None:
    """
    Write data quality metrics to data_quality_metrics table.

    Creates one row per metric type (freshness, completeness, consistency, accuracy).

    Args:
        spark: Active SparkSession
        metrics: Quality metrics dictionary from calculate_quality_metrics()
        run_timestamp: Timestamp of ETL run (defaults to now)
    """
    db_name = get_db_display_name()
    logger.info(f"Writing data quality metrics to {db_name}...")

    if run_timestamp is None:
        run_timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    jdbc_url = get_jdbc_url()
    properties = get_jdbc_properties()

    try:
        # Build rows from metrics dict
        # Map each metric to a numeric value for metric_value column
        rows = []

        # Freshness metric (1.0 = fresh, 0.0 = stale)
        if 'freshness' in metrics:
            freshness = metrics['freshness']
            rows.append((
                run_timestamp,
                None,
                'freshness',
                1.0 if freshness.get('passed', True) else 0.0,
                freshness.get('passed', True),
                None
            ))

        # Completeness metric (1.0 - avg_missing_rate = % complete)
        if 'completeness' in metrics:
            completeness = metrics['completeness']
            completeness_value = 1.0 - float(completeness.get('avg_missing_rate', 0))
            rows.append((
                run_timestamp,
                None,
                'completeness',
                completeness_value,
                completeness.get('passed', True),
                None
            ))

        # Consistency metric (1.0 = valid schema, 0.0 = invalid)
        if 'consistency' in metrics:
            consistency = metrics['consistency']
            rows.append((
                run_timestamp,
                None,
                'consistency',
                1.0 if consistency.get('passed', True) else 0.0,
                consistency.get('passed', True),
                None
            ))

        # Accuracy metric (1.0 - rejection_rate = % accurate)
        if 'accuracy' in metrics:
            accuracy = metrics['accuracy']
            accuracy_value = 1.0 - float(accuracy.get('rejection_rate', 0))
            rows.append((
                run_timestamp,
                None,
                'accuracy',
                accuracy_value,
                accuracy.get('passed', True),
                None
            ))

        if not rows:
            logger.warning("No quality metrics to write")
            return

        # Create DataFrame matching data_quality_metrics table schema
        schema = StructType([
            StructField("metric_timestamp", StringType(), False),
            StructField("compressor_id", StringType(), True),
            StructField("metric_type", StringType(), False),
            StructField("metric_value", DoubleType(), True),
            StructField("pass_threshold", BooleanType(), True),
            StructField("details", StringType(), True),
        ])

        metrics_df = spark.createDataFrame(rows, schema=schema)

        # Cast metric_timestamp to timestamp
        metrics_df = metrics_df.withColumn(
            "metric_timestamp",
            col("metric_timestamp").cast("timestamp")
        )

        metrics_df.write \
            .jdbc(
                url=jdbc_url,
                table="data_quality_metrics",
                mode="append",
                properties=properties
            )

        logger.info(f"Successfully wrote {len(rows)} quality metrics")

    except Exception as e:
        logger.error(f"Failed to write quality metrics to {db_name}: {e}")
        raise


# ============================================================================
# MAINTENANCE EVENTS
# ============================================================================

def write_maintenance_events(events_df: DataFrame, mode: str = "append") -> None:
    """
    Write maintenance events to maintenance_events table.

    Args:
        events_df: Maintenance events DataFrame
        mode: Write mode ('append' or 'overwrite')
    """
    db_name = get_db_display_name()
    logger.info(f"Writing maintenance events to {db_name} (mode={mode})...")

    jdbc_url = get_jdbc_url()
    properties = get_jdbc_properties()

    try:
        # Use truncate with CASCADE for overwrite to preserve table schema
        if mode == 'overwrite':
            events_df.write \
                .mode("overwrite") \
                .option("truncate", "true") \
                .option("cascadeTruncate", "true") \
                .jdbc(
                    url=jdbc_url,
                    table="maintenance_events",
                    properties=properties
                )
        else:
            events_df.write \
                .jdbc(
                    url=jdbc_url,
                    table="maintenance_events",
                    mode=mode,
                    properties=properties
                )

        row_count = events_df.count()
        logger.info(f"Successfully wrote {row_count} maintenance events")

    except Exception as e:
        logger.error(f"Failed to write maintenance events to {db_name}: {e}")
        raise


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def test_connection() -> bool:
    """
    Test database connection using JDBC.

    Works with both PostgreSQL and Azure SQL Database.

    Returns:
        bool: True if connection successful, False otherwise
    """
    from src.etl.utils import create_spark_session

    db_name = get_db_display_name()
    logger.info(f"Testing connection to {db_name}...")

    try:
        spark = create_spark_session()
        jdbc_url = get_jdbc_url()
        properties = get_jdbc_properties()

        test_query = "(SELECT 1 as test) as test_query"

        test_df = spark.read \
            .jdbc(
                url=jdbc_url,
                table=test_query,
                properties=properties
            )

        result = test_df.collect()[0][0]

        if result == 1:
            logger.info(f"Connection to {db_name} successful")
            return True
        else:
            logger.error(f"Connection to {db_name} failed - unexpected result")
            return False

    except Exception as e:
        logger.error(f"Connection to {db_name} failed: {e}")
        return False


def get_table_row_count(table_name: str) -> int:
    """
    Get row count for a database table.

    Args:
        table_name: Name of the table

    Returns:
        int: Number of rows in table
    """
    from src.etl.utils import create_spark_session

    db_name = get_db_display_name()
    logger.info(f"Getting row count for '{table_name}' on {db_name}...")

    try:
        spark = create_spark_session()
        jdbc_url = get_jdbc_url()
        properties = get_jdbc_properties()

        df = spark.read \
            .jdbc(
                url=jdbc_url,
                table=table_name,
                properties=properties
            )

        count = df.count()
        logger.info(f"Table '{table_name}' has {count} rows")
        return count

    except Exception as e:
        logger.error(f"Failed to get row count for '{table_name}': {e}")
        return -1
