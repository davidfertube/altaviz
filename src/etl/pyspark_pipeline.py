"""
PySpark ETL Pipeline Orchestrator

Main entry point for the Altaviz ETL pipeline.
Orchestrates data flow through Bronze -> Silver -> Gold -> ML -> Database.

Pipeline stages:
1. Bronze: Load raw Parquet data, write to Delta Lake (immutable)
2. Silver: Data quality checks, cleaning, validation
3. Gold: Feature engineering, aggregations, ML-ready data
4. ML Inference: Anomaly detection, temperature drift, emissions, RUL prediction
5. Database: Write aggregates, alerts, predictions, emissions, and quality metrics

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
from src.etl.pipeline_observer import PipelineObserver
from src.etl.data_quality import create_silver_layer, calculate_quality_metrics
from src.etl.transformations import create_gold_layer, aggregate_for_dashboard
from src.etl.database_writer import (
    write_sensor_aggregates,
    write_compressor_metadata,
    write_maintenance_events,
    generate_alerts,
    write_alerts,
    write_quality_metrics,
    write_ml_predictions,
    write_emissions_estimates,
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
# ML INFERENCE STAGE
# ============================================================================

def run_ml_inference(spark: SparkSession, gold_df, metadata_df=None):
    """
    Run ML inference models on Gold layer data.

    Runs four models in sequence, logging results for each:
    1. Anomaly detection (Isolation Forest on vibration patterns)
    2. Temperature drift prediction (linear regression on temp trends)
    3. Emissions estimation (EPA Subpart W emission factors)
    4. RUL prediction (rate-of-change heuristic)

    Each model is wrapped in its own try/except so a failure in one
    does not prevent the others from running.

    Args:
        spark: Active SparkSession
        gold_df: Gold layer DataFrame with ML-ready features
        metadata_df: Optional compressor metadata DataFrame

    Returns:
        dict: Results from each model (may contain None for failed models)
    """
    logger.info("=" * 80)
    logger.info("ML INFERENCE STAGE: Running predictive models")
    logger.info("=" * 80)

    results = {
        'anomaly_scores': None,
        'temp_drift': None,
        'emissions': None,
        'rul_predictions': None,
    }

    with Timer("ML inference stage"):
        # Aggregate Gold layer for ML models (same format as dashboard export)
        logger.info("Aggregating Gold layer for ML models...")
        agg_df = aggregate_for_dashboard(gold_df, window_type='1hr')

        # --- 1. Anomaly Detection ---
        try:
            from src.ml.anomaly_detector import score_readings, train_anomaly_detector, load_model

            logger.info("[ML 1/4] Running anomaly detection (Isolation Forest)...")

            # Train model if not already saved
            model = load_model()
            if model is None:
                logger.info("No trained anomaly model found, training on current data...")
                model = train_anomaly_detector(agg_df)

            if model is not None:
                anomaly_results = score_readings(agg_df, model=model)
                results['anomaly_scores'] = anomaly_results

                anomaly_count = sum(1 for r in anomaly_results if r.get('is_anomaly'))
                logger.info(
                    f"[ML 1/4] Anomaly detection complete: "
                    f"{anomaly_count}/{len(anomaly_results)} compressors flagged as anomalous"
                )
                for r in anomaly_results:
                    if r.get('is_anomaly'):
                        logger.warning(
                            f"  ANOMALY: {r['compressor_id']} "
                            f"(score={r.get('anomaly_score', 0):.4f}, "
                            f"prob={r.get('anomaly_probability', 0):.2%})"
                        )
            else:
                logger.warning("[ML 1/4] Anomaly detection skipped: no model available")

        except Exception as e:
            logger.error(f"[ML 1/4] Anomaly detection failed (non-fatal): {e}")

        # --- 2. Temperature Drift Prediction ---
        try:
            from src.ml.temp_drift_predictor import predict_fleet_temp_drift

            logger.info("[ML 2/4] Running temperature drift prediction...")
            temp_drift_results = predict_fleet_temp_drift(agg_df)
            results['temp_drift'] = temp_drift_results

            drifting = [p for p in temp_drift_results if p.get('drift_status') != 'stable']
            logger.info(
                f"[ML 2/4] Temperature drift complete: "
                f"{len(drifting)}/{len(temp_drift_results)} compressors showing drift"
            )
            for p in drifting:
                logger.warning(
                    f"  DRIFT: {p['compressor_id']} "
                    f"status={p['drift_status']}, "
                    f"rate={p.get('drift_rate_f_per_hour', 0):.3f} F/hr, "
                    f"hours_to_warning={p.get('hours_to_warning')}, "
                    f"hours_to_critical={p.get('hours_to_critical')}"
                )

        except Exception as e:
            logger.error(f"[ML 2/4] Temperature drift prediction failed (non-fatal): {e}")

        # --- 3. Emissions Estimation ---
        try:
            from src.ml.emissions_estimator import estimate_fleet_emissions

            logger.info("[ML 3/4] Running emissions estimation (EPA Subpart W)...")
            emissions_results = estimate_fleet_emissions(agg_df)
            results['emissions'] = emissions_results

            total_ch4 = sum(e.get('methane_tonnes', 0) for e in emissions_results)
            total_co2e = sum(e.get('co2e_tonnes', 0) for e in emissions_results)
            logger.info(
                f"[ML 3/4] Emissions estimation complete: "
                f"{len(emissions_results)} compressors, "
                f"total CH4={total_ch4:.6f} tonnes/hr, "
                f"total CO2e={total_co2e:.4f} tonnes/hr"
            )

            # Write emissions to database
            if test_connection():
                write_emissions_estimates(spark, emissions_results)
            else:
                logger.warning("[ML 3/4] Skipping emissions DB write: no database connection")

        except Exception as e:
            logger.error(f"[ML 3/4] Emissions estimation failed (non-fatal): {e}")

        # --- 4. RUL Prediction (fleet-level) ---
        try:
            from src.ml.rul_predictor import calculate_rul
            from pyspark.sql import functions as F

            logger.info("[ML 4/4] Running fleet RUL prediction...")

            # Get latest and baseline readings per compressor
            latest_times = agg_df.groupBy("compressor_id").agg(
                F.max("agg_timestamp").alias("latest_time")
            )
            latest_df = agg_df.alias("a").join(
                latest_times.alias("b"),
                (F.col("a.compressor_id") == F.col("b.compressor_id")) &
                (F.col("a.agg_timestamp") == F.col("b.latest_time"))
            ).select("a.*")

            baseline_times = agg_df.groupBy("compressor_id").agg(
                F.min("agg_timestamp").alias("baseline_time")
            )
            baseline_df = agg_df.alias("a").join(
                baseline_times.alias("b"),
                (F.col("a.compressor_id") == F.col("b.compressor_id")) &
                (F.col("a.agg_timestamp") == F.col("b.baseline_time"))
            ).select("a.*")

            readings_latest = {row['compressor_id']: row.asDict() for row in latest_df.collect()}
            readings_baseline = {row['compressor_id']: row.asDict() for row in baseline_df.collect()}

            def remap_rul_columns(row_dict):
                """Map aggregate column names (_mean) to RUL predictor column names (_avg)."""
                if not row_dict:
                    return None
                return {
                    'vibration_avg': row_dict.get('vibration_mean', 0),
                    'discharge_temp_avg': row_dict.get('discharge_temp_mean', 0),
                    'discharge_pressure_avg': row_dict.get('discharge_pressure_mean', 0),
                }

            rul_predictions = []
            all_ids = sorted(set(readings_latest.keys()) | set(readings_baseline.keys()))
            for comp_id in all_ids:
                pred = calculate_rul(
                    comp_id,
                    remap_rul_columns(readings_latest.get(comp_id)),
                    remap_rul_columns(readings_baseline.get(comp_id))
                )
                rul_predictions.append(pred)

            results['rul_predictions'] = rul_predictions

            at_risk = [p for p in rul_predictions if p.get('predicted_rul_hours') is not None]
            logger.info(
                f"[ML 4/4] RUL prediction complete: "
                f"{len(at_risk)}/{len(rul_predictions)} compressors with finite RUL"
            )
            for p in at_risk:
                rul_h = p.get('predicted_rul_hours')
                rul_d = round(rul_h / 24.0, 1) if rul_h is not None else None
                logger.warning(
                    f"  AT RISK: {p['compressor_id']} "
                    f"RUL={rul_h}h ({rul_d}d), "
                    f"failure_prob={p.get('failure_probability', 0):.1%}, "
                    f"sensor={p.get('primary_risk_sensor')}"
                )

        except Exception as e:
            logger.error(f"[ML 4/4] RUL prediction failed (non-fatal): {e}")

    # Summary
    completed = sum(1 for v in results.values() if v is not None)
    logger.info(f"ML inference stage complete: {completed}/4 models ran successfully")

    return results


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

        # Generate and write ML predictions
        logger.info("Generating ML predictions...")
        write_ml_predictions(spark, agg_df)

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
    skip_ml: bool = False,
    skip_db: bool = False
):
    """
    Run the complete ETL pipeline.

    Args:
        skip_bronze: If True, read existing Bronze layer instead of loading raw data
        skip_silver: If True, read existing Silver layer instead of processing
        skip_gold: If True, read existing Gold layer instead of processing
        skip_ml: If True, skip ML inference stage
        skip_db: If True, skip database export
    """
    pipeline_start = datetime.now()
    observer = PipelineObserver()
    observer.start()

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
        bronze_start = datetime.now()
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
        bronze_rows = bronze_df.count()
        observer.record_stage('bronze', row_count=bronze_rows,
                              duration_seconds=(datetime.now() - bronze_start).total_seconds())

        # SILVER LAYER
        silver_start = datetime.now()
        if not skip_silver:
            silver_df, quality_metrics = process_silver_layer(spark, bronze_df)
        else:
            silver_df = read_silver_layer(spark)
        silver_rows = silver_df.count()
        observer.record_stage('silver', row_count=silver_rows,
                              duration_seconds=(datetime.now() - silver_start).total_seconds())

        # GOLD LAYER
        gold_start = datetime.now()
        if not skip_gold:
            gold_df = process_gold_layer(spark, silver_df)
        else:
            gold_df = read_gold_layer(spark)
        gold_rows = gold_df.count()
        observer.record_stage('gold', row_count=gold_rows,
                              duration_seconds=(datetime.now() - gold_start).total_seconds())

        # ML INFERENCE
        ml_start = datetime.now()
        if not skip_ml:
            ml_results = run_ml_inference(spark, gold_df, metadata_df)
            models_run = sum(1 for v in ml_results.values() if v is not None)
            observer.record_ml(models_run)
            observer.record_stage('ml', duration_seconds=(datetime.now() - ml_start).total_seconds())
        else:
            logger.info("Skipping ML inference stage (--skip-ml)")
            observer.record_stage('ml', duration_seconds=0, status='skipped')

        # DATABASE EXPORT
        db_start = datetime.now()
        if not skip_db:
            export_to_database(spark, gold_df, metadata_df, maintenance_df, quality_metrics)
            observer.record_stage('database', duration_seconds=(datetime.now() - db_start).total_seconds())
        else:
            observer.record_stage('database', duration_seconds=0, status='skipped')

        # Pipeline complete
        observer.complete(status='success')
        observer.log_summary()

        pipeline_end = datetime.now()
        duration = (pipeline_end - pipeline_start).total_seconds()

        logger.info("=" * 80)
        logger.info("ALTAVIZ ETL PIPELINE COMPLETED SUCCESSFULLY")
        logger.info(f"Duration: {duration:.2f} seconds")
        logger.info("=" * 80)

        # Write observer metrics to database
        if not skip_db:
            observer.write_to_database()

        # Stop Spark
        spark.stop()

        return True

    except Exception as e:
        observer.complete(status='failed', error=str(e))
        observer.log_summary()

        logger.error("=" * 80)
        logger.error("PIPELINE FAILED")
        logger.error(f"Error: {e}")
        logger.error("=" * 80)

        import traceback
        traceback.print_exc()

        # Try to write failure metrics
        if not skip_db:
            observer.write_to_database()

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
        python src/etl/pyspark_pipeline.py --skip-ml          # Skip ML inference
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
    parser.add_argument('--skip-ml', action='store_true',
                       help='Skip ML inference stage')
    parser.add_argument('--skip-db', '--skip-postgres', action='store_true',
                       dest='skip_db',
                       help='Skip database export')

    args = parser.parse_args()

    # Run pipeline
    success = run_pipeline(
        skip_bronze=args.skip_bronze,
        skip_silver=args.skip_silver,
        skip_gold=args.skip_gold,
        skip_ml=args.skip_ml,
        skip_db=args.skip_db
    )

    # Exit with appropriate code
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
