"""
PySpark ETL Pipeline Orchestrator

Main entry point for the Altaviz ETL pipeline.
Orchestrates data flow through Bronze → Silver → Gold → PostgreSQL/Azure SQL.

Pipeline stages:
1. Bronze: Load raw Parquet data, write to Delta Lake (immutable)
2. Silver: Data quality checks, cleaning, validation
3. Gold: Feature engineering, aggregations, ML-ready data
4. Database: Write aggregates, alerts, metadata, and quality metrics

Usage:
    python src/etl/pyspark_pipeline.py

Author: David Fernandez
"""

import sys
from pathlib import Path
from datetime import datetime
import logging

from pyspark.sql import SparkSession

# Import ETL modules
from src.etl.utils import create_spark_session, load_config, setup_logging, Timer, log_dataframe_stats
from src.etl.schemas import SENSOR_SCHEMA, METADATA_SCHEMA, MAINTENANCE_SCHEMA
from src.etl.data_quality import create_silver_layer, calculate_quality_metrics
from src.etl.transformations import create_gold_layer, aggregate_for_dashboard
from src.etl.database_writer import (
    write_sensor_aggregates,
    write_compressor_metadata,
    write_maintenance_events,
    generate_alerts,
    write_alerts,
    write_quality_metrics,
    test_connection,
    get_db_display_name
)


# ============================================================================
# SETUP
# ============================================================================

# Setup logging
logger = setup_logging()

# Load configurations
etl_config = load_config('etl_config.yaml')
db_config = load_config('database.yaml')


# ============================================================================
# BRONZE LAYER
# ============================================================================

def load_bronze_layer(spark: SparkSession) -> tuple:
    """
    Load raw data and write to Bronze Delta Lake layer.

    Bronze layer is the immutable landing zone for raw data.
    No transformations except adding load timestamp.

    Returns:
        tuple: (sensor_df, metadata_df, maintenance_df)
    """
    logger.info("=" * 80)
    logger.info("BRONZE LAYER: Loading raw data")
    logger.info("=" * 80)

    with Timer("Bronze layer load"):
        # Get paths from config
        raw_data_path = etl_config['data_paths']['raw_data']
        bronze_path = etl_config['data_paths']['processed_bronze']
        metadata_path = etl_config['data_paths']['metadata']
        maintenance_path = etl_config['data_paths']['maintenance_logs']

        # Load sensor readings with explicit schema
        logger.info(f"Loading sensor readings from {raw_data_path}...")
        sensor_df = spark.read \
            .schema(SENSOR_SCHEMA) \
            .parquet(f"{raw_data_path}/sensor_readings.parquet")

        log_dataframe_stats(sensor_df, "Sensor readings")

        # Load metadata
        logger.info(f"Loading compressor metadata from {metadata_path}...")
        metadata_df = spark.read \
            .schema(METADATA_SCHEMA) \
            .csv(metadata_path, header=True)

        log_dataframe_stats(metadata_df, "Compressor metadata")

        # Load maintenance logs
        logger.info(f"Loading maintenance logs from {maintenance_path}...")
        maintenance_df = spark.read \
            .schema(MAINTENANCE_SCHEMA) \
            .csv(maintenance_path, header=True)

        log_dataframe_stats(maintenance_df, "Maintenance logs")

        # Add load timestamp to bronze layer
        from pyspark.sql.functions import current_timestamp
        sensor_df = sensor_df.withColumn("bronze_loaded_at", current_timestamp())

        # Write to Bronze Delta Lake (append mode - never overwrite)
        logger.info(f"Writing to Bronze Delta Lake: {bronze_path}")
        sensor_df.write \
            .format("delta") \
            .mode("append") \
            .save(bronze_path)

        logger.info("Bronze layer complete")

    return sensor_df, metadata_df, maintenance_df


def read_bronze_layer(spark: SparkSession):
    """
    Read existing Bronze layer from Delta Lake.

    Returns:
        DataFrame: Bronze layer sensor data
    """
    bronze_path = etl_config['data_paths']['processed_bronze']

    logger.info(f"Reading Bronze layer from: {bronze_path}")
    bronze_df = spark.read \
        .format("delta") \
        .load(bronze_path)

    log_dataframe_stats(bronze_df, "Bronze layer")

    return bronze_df


# ============================================================================
# SILVER LAYER
# ============================================================================

def process_silver_layer(spark: SparkSession, bronze_df) -> tuple:
    """
    Transform Bronze to Silver layer with data quality checks.

    Silver layer applies:
    - Schema validation
    - Null removal
    - Outlier detection
    - Timestamp validation

    Returns:
        tuple: (silver_df, quality_metrics)
    """
    logger.info("=" * 80)
    logger.info("SILVER LAYER: Data quality and cleaning")
    logger.info("=" * 80)

    with Timer("Silver layer processing"):
        # Get quality thresholds from config
        max_missing_rate = etl_config['data_quality']['max_missing_rate']
        outlier_threshold = etl_config['data_quality']['outlier_std_threshold']

        # Apply Silver transformations
        silver_df = create_silver_layer(
            bronze_df,
            max_missing_rate=max_missing_rate,
            outlier_std_threshold=outlier_threshold
        )

        # Calculate quality metrics
        quality_metrics = calculate_quality_metrics(
            bronze_df,
            silver_df,
            max_missing_rate
        )

        # Write to Silver Delta Lake
        silver_path = etl_config['data_paths']['processed_silver']
        logger.info(f"Writing to Silver Delta Lake: {silver_path}")

        silver_df.write \
            .format("delta") \
            .mode("overwrite") \
            .save(silver_path)

        logger.info("Silver layer complete")

    return silver_df, quality_metrics


def read_silver_layer(spark: SparkSession):
    """
    Read existing Silver layer from Delta Lake.

    Returns:
        DataFrame: Silver layer cleaned data
    """
    silver_path = etl_config['data_paths']['processed_silver']

    logger.info(f"Reading Silver layer from: {silver_path}")
    silver_df = spark.read \
        .format("delta") \
        .load(silver_path)

    log_dataframe_stats(silver_df, "Silver layer")

    return silver_df


# ============================================================================
# GOLD LAYER
# ============================================================================

def process_gold_layer(spark: SparkSession, silver_df):
    """
    Transform Silver to Gold layer with feature engineering.

    Gold layer adds:
    - Rolling window aggregations (1hr, 4hr, 24hr)
    - Rate of change calculations
    - Derived metrics
    - Threshold flags
    - Time features

    Returns:
        DataFrame: Gold layer with ML-ready features
    """
    logger.info("=" * 80)
    logger.info("GOLD LAYER: Feature engineering")
    logger.info("=" * 80)

    with Timer("Gold layer processing"):
        # Apply Gold transformations
        gold_df = create_gold_layer(silver_df)

        # Write to Gold Delta Lake (partitioned by date)
        gold_path = etl_config['data_paths']['processed_gold']
        partition_column = etl_config['partitioning']['gold_layer_partition_by']

        logger.info(f"Writing to Gold Delta Lake: {gold_path}")
        logger.info(f"Partitioned by: {partition_column}")

        gold_df.write \
            .format("delta") \
            .mode("append") \
            .partitionBy(partition_column) \
            .save(gold_path)

        logger.info("Gold layer complete")

    return gold_df


def read_gold_layer(spark: SparkSession):
    """
    Read existing Gold layer from Delta Lake.

    Returns:
        DataFrame: Gold layer feature-engineered data
    """
    gold_path = etl_config['data_paths']['processed_gold']

    logger.info(f"Reading Gold layer from: {gold_path}")
    gold_df = spark.read \
        .format("delta") \
        .load(gold_path)

    log_dataframe_stats(gold_df, "Gold layer")

    return gold_df


# ============================================================================
# DATABASE EXPORT
# ============================================================================

def export_to_database(spark, gold_df, metadata_df=None, maintenance_df=None, quality_metrics=None):
    """
    Export pipeline results to PostgreSQL/Azure SQL for dashboard consumption.

    Writes:
    - Compressor metadata (must be first — FK dependency)
    - Aggregated sensor readings (hourly)
    - Alerts from threshold violations
    - Maintenance events
    - Data quality metrics
    """
    db_name = get_db_display_name()
    logger.info("=" * 80)
    logger.info(f"DATABASE EXPORT: Writing to {db_name}")
    logger.info("=" * 80)

    with Timer("Database export"):
        # Test connection first
        if not test_connection():
            logger.error(f"Connection to {db_name} failed. Skipping export.")
            return

        # Write compressor metadata FIRST (FK dependency for other tables)
        if metadata_df is not None:
            logger.info("Writing compressor metadata...")
            write_compressor_metadata(metadata_df, mode='overwrite')

        # Write maintenance events
        if maintenance_df is not None:
            logger.info("Writing maintenance events...")
            write_maintenance_events(maintenance_df, mode='overwrite')

        # Aggregate Gold layer for dashboard
        logger.info("Aggregating Gold layer for dashboard...")
        agg_df = aggregate_for_dashboard(gold_df, window_type='1hr')

        # Write aggregated sensor readings
        logger.info("Writing sensor aggregates...")
        write_sensor_aggregates(agg_df, mode='append')

        # Generate and write alerts
        logger.info("Generating alerts from threshold violations...")
        alerts_df = generate_alerts(gold_df)

        if alerts_df.count() > 0:
            logger.info("Writing alerts...")
            write_alerts(alerts_df, mode='append')
        else:
            logger.info("No alerts to write (all sensors normal)")

        # Write data quality metrics
        if quality_metrics is not None:
            logger.info("Writing data quality metrics...")
            write_quality_metrics(spark, quality_metrics)

        logger.info(f"Database export to {db_name} complete")


# ============================================================================
# MAIN PIPELINE
# ============================================================================

def run_pipeline(
    skip_bronze: bool = False,
    skip_silver: bool = False,
    skip_gold: bool = False,
    skip_db: bool = False
):
    """
    Run the complete ETL pipeline.

    Args:
        skip_bronze: If True, read existing Bronze layer instead of loading raw data
        skip_silver: If True, read existing Silver layer instead of processing
        skip_gold: If True, read existing Gold layer instead of processing
        skip_db: If True, skip database export
    """
    pipeline_start = datetime.now()

    logger.info("=" * 80)
    logger.info("ALTAVIZ ETL PIPELINE STARTING")
    logger.info(f"Timestamp: {pipeline_start}")
    logger.info("=" * 80)

    metadata_df = None
    maintenance_df = None
    quality_metrics = None

    try:
        # Create Spark session
        logger.info("Creating Spark session...")
        spark = create_spark_session()

        # BRONZE LAYER
        if not skip_bronze:
            sensor_df, metadata_df, maintenance_df = load_bronze_layer(spark)
            bronze_df = sensor_df
        else:
            bronze_df = read_bronze_layer(spark)
            # Load metadata separately when skipping bronze
            metadata_path = etl_config['data_paths']['metadata']
            maintenance_path = etl_config['data_paths']['maintenance_logs']
            metadata_df = spark.read.schema(METADATA_SCHEMA).csv(metadata_path, header=True)
            maintenance_df = spark.read.schema(MAINTENANCE_SCHEMA).csv(maintenance_path, header=True)

        # SILVER LAYER
        if not skip_silver:
            silver_df, quality_metrics = process_silver_layer(spark, bronze_df)
        else:
            silver_df = read_silver_layer(spark)

        # GOLD LAYER
        if not skip_gold:
            gold_df = process_gold_layer(spark, silver_df)
        else:
            gold_df = read_gold_layer(spark)

        # DATABASE EXPORT
        if not skip_db:
            export_to_database(spark, gold_df, metadata_df, maintenance_df, quality_metrics)

        # Pipeline complete
        pipeline_end = datetime.now()
        duration = (pipeline_end - pipeline_start).total_seconds()

        logger.info("=" * 80)
        logger.info("ALTAVIZ ETL PIPELINE COMPLETED SUCCESSFULLY")
        logger.info(f"Duration: {duration:.2f} seconds")
        logger.info("=" * 80)

        # Stop Spark
        spark.stop()

        return True

    except Exception as e:
        logger.error("=" * 80)
        logger.error("PIPELINE FAILED")
        logger.error(f"Error: {e}")
        logger.error("=" * 80)

        import traceback
        traceback.print_exc()

        return False


# ============================================================================
# COMMAND LINE INTERFACE
# ============================================================================

def main():
    """
    Main entry point for command line execution.

    Usage:
        python src/etl/pyspark_pipeline.py                    # Full pipeline
        python src/etl/pyspark_pipeline.py --skip-bronze      # Skip Bronze
        python src/etl/pyspark_pipeline.py --skip-db          # Skip DB export
    """
    import argparse

    parser = argparse.ArgumentParser(description='Altaviz ETL Pipeline')
    parser.add_argument('--skip-bronze', action='store_true',
                       help='Skip Bronze layer (read existing)')
    parser.add_argument('--skip-silver', action='store_true',
                       help='Skip Silver layer (read existing)')
    parser.add_argument('--skip-gold', action='store_true',
                       help='Skip Gold layer (read existing)')
    parser.add_argument('--skip-db', '--skip-postgres', action='store_true',
                       dest='skip_db',
                       help='Skip database export')

    args = parser.parse_args()

    # Run pipeline
    success = run_pipeline(
        skip_bronze=args.skip_bronze,
        skip_silver=args.skip_silver,
        skip_gold=args.skip_gold,
        skip_db=args.skip_db
    )

    # Exit with appropriate code
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
