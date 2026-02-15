"""
Database Writer Module

Handles writing Gold layer data to PostgreSQL.
Uses PySpark's JDBC connector for efficient bulk writes.

Connection is configured via DATABASE_URL environment variable:
  DATABASE_URL=postgresql://user:pass@host:port/database

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
from urllib.parse import urlparse
import logging
import os

from src.etl.utils import load_config


logger = logging.getLogger('CompressorHealthETL')

# Load configurations
thresholds_config = load_config('thresholds.yaml')


# ============================================================================
# JDBC CONNECTION FACTORY
# ============================================================================

def _parse_database_url() -> dict:
    """
    Parse DATABASE_URL environment variable into connection components.

    Expected format: postgresql://user:pass@host:port/database

    Returns:
        dict with keys: host, port, database, user, password
    """
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        raise ValueError(
            "DATABASE_URL environment variable is not set. "
            "Expected format: postgresql://user:pass@host:port/database"
        )

    parsed = urlparse(database_url)

    return {
        'host': parsed.hostname or 'localhost',
        'port': parsed.port or 5432,
        'database': (parsed.path or '/postgres').lstrip('/'),
        'user': parsed.username or 'postgres',
        'password': parsed.password or '',
    }


def get_jdbc_url() -> str:
    """Construct JDBC URL for PostgreSQL."""
    conn = _parse_database_url()
    jdbc_url = f"jdbc:postgresql://{conn['host']}:{conn['port']}/{conn['database']}"
    logger.info(f"Using PostgreSQL: {conn['host']}:{conn['port']}/{conn['database']}")
    return jdbc_url


def get_jdbc_properties() -> Dict[str, str]:
    """Get JDBC connection properties for PostgreSQL."""
    conn = _parse_database_url()
    return {
        "driver": "org.postgresql.Driver",
        "user": conn['user'],
        "password": conn['password'],
    }


def get_db_display_name() -> str:
    """Get human-readable database name for logging."""
    conn = _parse_database_url()
    return f"PostgreSQL ({conn['host']}:{conn['port']}/{conn['database']})"


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

    Maps CSV columns (maintenance_type, performed_at, cost_usd) to DB columns
    (event_type, event_date, cost_usd).

    Args:
        events_df: Maintenance events DataFrame from CSV
        mode: Write mode ('append' or 'overwrite')
    """
    db_name = get_db_display_name()
    logger.info(f"Writing maintenance events to {db_name} (mode={mode})...")

    jdbc_url = get_jdbc_url()
    properties = get_jdbc_properties()

    # Remap CSV columns to match maintenance_events table schema
    mapped_df = events_df.select(
        col("compressor_id"),
        col("performed_at").cast("date").alias("event_date"),
        col("maintenance_type").alias("event_type"),
        col("description"),
        lit(None).cast("double").alias("downtime_hours"),
        lit(None).cast("string").alias("severity"),
        col("cost_usd"),
    )

    try:
        if mode == 'overwrite':
            mapped_df.write \
                .mode("overwrite") \
                .option("truncate", "true") \
                .jdbc(
                    url=jdbc_url,
                    table="maintenance_events",
                    properties=properties
                )
        else:
            mapped_df.write \
                .jdbc(
                    url=jdbc_url,
                    table="maintenance_events",
                    mode=mode,
                    properties=properties
                )

        row_count = mapped_df.count()
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


# ============================================================================
# ML PREDICTIONS
# ============================================================================

def write_ml_predictions(spark: SparkSession, aggregated_df: DataFrame) -> None:
    """
    Generate and write ML predictions for RUL (Remaining Useful Life).

    Uses latest vs 24hr-ago 1hr-window readings to compute rate-of-change,
    then feeds into the heuristic RUL predictor.

    Args:
        spark: Active Spark session
        aggregated_df: Gold layer aggregated sensor readings (1hr window)
    """
    import json
    from pyspark.sql import functions as F
    from pyspark.sql.types import StructType, StructField, StringType, TimestampType, DoubleType
    from src.ml.rul_predictor import calculate_rul

    db_name = get_db_display_name()
    logger.info(f"Generating and writing ML predictions to {db_name}...")

    jdbc_url = get_jdbc_url()
    properties = get_jdbc_properties()

    # Get latest reading per compressor (most recent 1hr aggregate)
    latest_times = aggregated_df.groupBy("compressor_id") \
        .agg(F.max("agg_timestamp").alias("latest_time"))

    latest_df = aggregated_df.alias("a").join(
        latest_times.alias("b"),
        (F.col("a.compressor_id") == F.col("b.compressor_id")) &
        (F.col("a.agg_timestamp") == F.col("b.latest_time"))
    ).select("a.*")

    # Get reading from ~24hrs ago per compressor (baseline for rate-of-change)
    baseline_times = aggregated_df.groupBy("compressor_id") \
        .agg(F.min("agg_timestamp").alias("baseline_time"))

    baseline_df = aggregated_df.alias("a").join(
        baseline_times.alias("b"),
        (F.col("a.compressor_id") == F.col("b.compressor_id")) &
        (F.col("a.agg_timestamp") == F.col("b.baseline_time"))
    ).select("a.*")

    # Collect to driver (small dataset: 10 compressors)
    readings_latest = {row['compressor_id']: row.asDict() for row in latest_df.collect()}
    readings_baseline = {row['compressor_id']: row.asDict() for row in baseline_df.collect()}

    def remap_columns(row_dict):
        """Map aggregate column names (_mean) to predictor column names (_avg)."""
        if not row_dict:
            return None
        return {
            'vibration_avg': row_dict.get('vibration_mean', 0),
            'discharge_temp_avg': row_dict.get('discharge_temp_mean', 0),
            'discharge_pressure_avg': row_dict.get('discharge_pressure_mean', 0),
        }

    # Generate predictions
    predictions = []
    all_compressor_ids = set(readings_latest.keys()) | set(readings_baseline.keys())

    for comp_id in sorted(all_compressor_ids):
        pred = calculate_rul(
            comp_id,
            remap_columns(readings_latest.get(comp_id)),
            remap_columns(readings_baseline.get(comp_id))
        )
        predictions.append(pred)

    if not predictions:
        logger.warning("No predictions generated")
        return

    # Map predictor output to ml_predictions table schema
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    db_rows = []
    for p in predictions:
        rul_hours = p.get('predicted_rul_hours')
        rul_days = round(rul_hours / 24.0, 2) if rul_hours is not None else None
        features = json.dumps({
            'primary_risk_sensor': p.get('primary_risk_sensor'),
            'model_version': p.get('model_version', 'heuristic-v1.0'),
        })
        db_rows.append((
            p['compressor_id'],
            now,
            rul_days,
            p.get('failure_probability', 0.0),
            p.get('confidence_score', 0.0),
            p.get('model_version', 'heuristic-v1.0'),
            features,
        ))

    schema = StructType([
        StructField("compressor_id", StringType(), False),
        StructField("prediction_timestamp", StringType(), False),
        StructField("rul_days", DoubleType(), True),
        StructField("failure_probability", DoubleType(), True),
        StructField("confidence_score", DoubleType(), True),
        StructField("model_version", StringType(), True),
        StructField("features_used", StringType(), True),
    ])

    predictions_df = spark.createDataFrame(db_rows, schema=schema)

    # Cast prediction_timestamp string to timestamp for JDBC
    predictions_df = predictions_df.withColumn(
        "prediction_timestamp",
        F.col("prediction_timestamp").cast("timestamp")
    )

    try:
        predictions_df.write \
            .jdbc(jdbc_url, "ml_predictions", mode="append", properties=properties)

        logger.info(f"Successfully wrote {len(predictions)} ML predictions")

    except Exception as e:
        logger.error(f"Failed to write ML predictions: {e}")
        raise


# ============================================================================
# EMISSIONS ESTIMATES
# ============================================================================

def write_emissions_estimates(
    spark: SparkSession,
    emissions: list,
    organization_id: str = None,
) -> None:
    """
    Write emissions estimates to the emissions_estimates table.

    Args:
        spark: Active Spark session
        emissions: List of emission estimate dicts from estimate_fleet_emissions()
        organization_id: Organization ID to tag rows with (from ETL_ORGANIZATION_ID env)
    """
    from pyspark.sql import functions as F
    from pyspark.sql.types import StructType, StructField, StringType, DoubleType

    db_name = get_db_display_name()
    logger.info(f"Writing emissions estimates to {db_name}...")

    if not emissions:
        logger.warning("No emissions estimates to write")
        return

    jdbc_url = get_jdbc_url()
    properties = get_jdbc_properties()

    org_id = organization_id or os.environ.get('ETL_ORGANIZATION_ID')

    # Build rows for DataFrame
    rows = []
    for e in emissions:
        rows.append((
            e['compressor_id'],
            e.get('estimate_timestamp', datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
            e.get('methane_tonnes'),
            e.get('co2e_tonnes'),
            e.get('emission_rate_scfh'),
            e.get('estimation_method', 'epa_subpart_w'),
            org_id,
        ))

    schema = StructType([
        StructField("compressor_id", StringType(), False),
        StructField("estimate_timestamp", StringType(), False),
        StructField("methane_tonnes", DoubleType(), True),
        StructField("co2e_tonnes", DoubleType(), True),
        StructField("emission_rate_scfh", DoubleType(), True),
        StructField("estimation_method", StringType(), True),
        StructField("organization_id", StringType(), True),
    ])

    emissions_df = spark.createDataFrame(rows, schema=schema)

    # Cast estimate_timestamp string to timestamp for JDBC write
    emissions_df = emissions_df.withColumn(
        "estimate_timestamp",
        F.col("estimate_timestamp").cast("timestamp")
    )

    try:
        emissions_df.write.jdbc(
            jdbc_url, "emissions_estimates", mode="append", properties=properties
        )

        logger.info(f"Successfully wrote {len(emissions)} emissions estimates")

    except Exception as e:
        logger.error(f"Failed to write emissions estimates: {e}")
        raise
