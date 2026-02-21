"""
Production Pipeline Orchestrator — Fabric / OneLake at Scale

Orchestrates the full ETL + ML pipeline for 4,700 compressors on Azure Fabric.
Replaces the demo pyspark_pipeline.py with production-grade patterns:

- OneLake Delta tables (not local filesystem)
- Streaming + batch ingestion
- Parallel ML inference
- Production monitoring (Azure Monitor, Teams alerts)
- Configurable stages (skip any layer)

Data flow:
    Event Hubs -> Bronze (raw) -> Silver (cleaned) -> Gold (aggregated)
    -> ML (predictions) -> OneLake (serving) -> [Dashboard / BI / Agent]

Usage:
    # Full pipeline (local mode for development)
    python -m src.etl.pipeline

    # Skip ML (just ETL)
    python -m src.etl.pipeline --skip-ml

    # Stream mode (Fabric notebook)
    from src.etl.pipeline import run_production_pipeline
    run_production_pipeline(spark, mode='stream')

Author: David Fernandez
"""

import sys
import logging
from datetime import datetime
from typing import Optional

from pyspark.sql import SparkSession
from pyspark.sql import functions as F

logger = logging.getLogger(__name__)


def reconcile_late_arrivals(
    spark: SparkSession,
    onelake,
    watermark_hours: int = 4,
    lookback_days: int = 7,
) -> int:
    """
    Re-process Bronze records that arrived significantly after their event time.

    Remote compressors with intermittent connectivity may buffer readings and
    transmit them hours or days later. The streaming watermark drops these to
    maintain state efficiency. This batch reconciliation catches them by:

    1. Scanning recent Bronze for records where ingestion lag > watermark_hours
    2. Running them through Silver cleansing
    3. Upserting into Silver via Delta MERGE (idempotent — safe to re-run)

    Args:
        spark: Active SparkSession
        onelake: OneLakeClient instance
        watermark_hours: Lag threshold matching the streaming watermark_delay
        lookback_days: How far back in Bronze to scan

    Returns:
        Number of late records reconciled
    """
    from src.etl.silver.cleanse import create_silver_layer

    logger.info(f"Late data reconciliation: scanning {lookback_days}d of Bronze "
                f"for records >{watermark_hours}h late")

    bronze_df = onelake.read_recent("bronze", "sensor_readings", days=lookback_days)

    if 'bronze_ingested_at' not in bronze_df.columns or 'timestamp' not in bronze_df.columns:
        logger.info("Reconciliation skipped: missing timestamp columns in Bronze")
        return 0

    # Find records where ingestion lag exceeds the streaming watermark
    lag_seconds = watermark_hours * 3600
    late_df = bronze_df.filter(
        (F.col("bronze_ingested_at").cast("long") - F.col("timestamp").cast("long"))
        > lag_seconds
    )

    late_count = late_df.count()
    if late_count == 0:
        logger.info("No late-arriving records found")
        return 0

    logger.info(f"Found {late_count:,} late-arriving records — running through Silver cleansing")

    # Clean the late data through the same Silver pipeline
    silver_late = create_silver_layer(late_df)
    reconciled = silver_late.count()

    if reconciled > 0:
        # Upsert into Silver using Delta MERGE (idempotent)
        onelake.upsert_table(
            silver_late,
            layer="silver",
            table="sensor_cleaned",
            merge_keys=["compressor_id", "timestamp"],
        )
        logger.info(f"Reconciled {reconciled:,} late records into Silver (Delta MERGE)")

    return reconciled


def run_production_pipeline(
    spark: Optional[SparkSession] = None,
    mode: str = "batch",
    source_path: Optional[str] = None,
    skip_bronze: bool = False,
    skip_silver: bool = False,
    skip_gold: bool = False,
    skip_ml: bool = False,
    skip_quality: bool = False,
):
    """
    Run the complete production ETL + ML pipeline.

    Args:
        spark: SparkSession (created if None)
        mode: 'batch' (file-based) or 'stream' (Event Hubs)
        source_path: Path to source data (batch mode)
        skip_bronze: Read existing Bronze instead of ingesting
        skip_silver: Read existing Silver
        skip_gold: Read existing Gold
        skip_ml: Skip ML inference stage
        skip_quality: Skip data quality checks
    """
    from src.etl.onelake import OneLakeClient
    from src.monitoring.metrics import PipelineMonitor

    monitor = PipelineMonitor()
    monitor.start_run()

    logger.info("=" * 80)
    logger.info("ALTAVIZ PRODUCTION PIPELINE - 4,700 COMPRESSORS")
    logger.info(f"Mode: {mode} | Started: {datetime.now()}")
    logger.info("=" * 80)

    try:
        # Create Spark session if not provided (Fabric provides one)
        if spark is None:
            from src.etl.utils import create_spark_session
            spark = create_spark_session()

        onelake = OneLakeClient(spark)

        # ================================================================
        # BRONZE LAYER
        # ================================================================
        with monitor.stage("bronze"):
            if not skip_bronze:
                if mode == "stream":
                    from src.ingestion.event_hub_consumer import start_streaming_ingestion
                    query = start_streaming_ingestion(spark)
                    logger.info("Streaming ingestion started (background)")
                else:
                    from src.etl.bronze.ingest import ingest_to_bronze
                    if source_path:
                        from src.etl.schemas import SENSOR_SCHEMA
                        source_df = spark.read.schema(SENSOR_SCHEMA).parquet(source_path)
                    else:
                        source_df = spark.read.parquet("data/raw/fleet/sensor_readings/")

                    bronze_rows = ingest_to_bronze(spark, source_df, onelake)
                    monitor.record_rows("bronze", bronze_rows)
            else:
                logger.info("Skipping Bronze (reading existing)")

            from src.etl.bronze.ingest import read_bronze
            bronze_df = read_bronze(spark, onelake, days=10)
            if skip_bronze:
                monitor.record_rows("bronze", bronze_df.count())

        # ================================================================
        # SILVER LAYER
        # ================================================================
        with monitor.stage("silver"):
            if not skip_silver:
                from src.etl.silver.cleanse import create_silver_layer, calculate_quality_metrics

                silver_df = create_silver_layer(bronze_df)
                silver_rows = silver_df.count()
                monitor.record_rows("silver", silver_rows)

                onelake.write_table(
                    silver_df, layer="silver", table="sensor_cleaned",
                    mode="append", partition_by=["date"],
                )

                if not skip_quality:
                    quality = calculate_quality_metrics(bronze_df, silver_df)
                    monitor.record_quality(
                        quality['rejection_rate'],
                        quality['unique_compressors'],
                        0.0,
                    )
            else:
                logger.info("Skipping Silver (reading existing)")
                silver_df = onelake.read_recent("silver", "sensor_cleaned", days=10)
                monitor.record_rows("silver", silver_df.count())

        # ================================================================
        # DATA QUALITY CHECKS
        # ================================================================
        if not skip_quality:
            from src.etl.silver.quality import run_quality_checks
            quality_report = run_quality_checks(silver_df, expected_compressors=4700)

            if not quality_report.overall_passed:
                monitor.add_warning(
                    f"Quality checks failed: "
                    f"{sum(1 for c in quality_report.checks if not c.passed)} checks"
                )

        # ================================================================
        # GOLD LAYER
        # ================================================================
        with monitor.stage("gold"):
            if not skip_gold:
                from src.etl.gold.aggregate import (
                    create_gold_layer, aggregate_hourly, generate_alerts,
                )

                gold_df = create_gold_layer(silver_df)
                gold_rows = gold_df.count()
                monitor.record_rows("gold", gold_rows)

                onelake.write_table(
                    gold_df, layer="gold", table="hourly_aggregates",
                    mode="append", partition_by=["date"], optimize_after=True,
                )

                hourly_df = aggregate_hourly(gold_df)
                monitor.metrics.hourly_agg_rows = hourly_df.count()

                alerts_df = generate_alerts(gold_df)
                alert_count = alerts_df.count()
                monitor.record_alerts(alert_count)

                if alert_count > 0:
                    onelake.write_table(
                        alerts_df, layer="gold", table="alert_history", mode="append",
                    )
            else:
                logger.info("Skipping Gold (reading existing)")
                hourly_df = onelake.read_recent("gold", "hourly_aggregates", days=10)
                monitor.record_rows("gold", hourly_df.count())

        # ================================================================
        # ML INFERENCE
        # ================================================================
        with monitor.stage("ml"):
            if not skip_ml:
                from src.ml.serving.batch_predictor import BatchPredictor

                predictor = BatchPredictor(spark, onelake)
                ml_results = predictor.run_all_models(hourly_df)

                models_run = sum(1 for v in ml_results.values() if v is not None)
                anomalies = 0
                at_risk = 0

                if ml_results.get('anomaly'):
                    anomalies = sum(1 for r in ml_results['anomaly'] if r.get('is_anomaly'))
                if ml_results.get('rul'):
                    at_risk = sum(1 for r in ml_results['rul']
                                  if r.get('predicted_rul_hours') is not None)

                monitor.record_ml(models_run, anomalies, at_risk)
                predictor.write_predictions_to_onelake()
            else:
                logger.info("Skipping ML inference")

        # ================================================================
        # LATE DATA RECONCILIATION
        # ================================================================
        with monitor.stage("reconciliation"):
            late_rows = reconcile_late_arrivals(
                spark, onelake, watermark_hours=4, lookback_days=7,
            )
            if late_rows > 0:
                monitor.add_warning(f"Reconciled {late_rows:,} late-arriving records")

        # ================================================================
        # COMPLETE
        # ================================================================
        monitor.complete_run(status="success")
        monitor.emit_metrics()

        logger.info("=" * 80)
        logger.info("PIPELINE COMPLETED SUCCESSFULLY")
        logger.info("=" * 80)

        spark.stop()
        return True

    except Exception as e:
        monitor.complete_run(status="failed", error=str(e))
        monitor.emit_metrics()

        logger.error("=" * 80)
        logger.error(f"PIPELINE FAILED: {e}")
        logger.error("=" * 80)

        import traceback
        traceback.print_exc()

        return False


def main():
    """CLI entry point."""
    import argparse

    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(name)s] %(levelname)s: %(message)s',
    )

    parser = argparse.ArgumentParser(description='Altaviz Production Pipeline')
    parser.add_argument('--mode', choices=['batch', 'stream'], default='batch')
    parser.add_argument('--source', type=str, default=None)
    parser.add_argument('--skip-bronze', action='store_true')
    parser.add_argument('--skip-silver', action='store_true')
    parser.add_argument('--skip-gold', action='store_true')
    parser.add_argument('--skip-ml', action='store_true')
    parser.add_argument('--skip-quality', action='store_true')

    args = parser.parse_args()

    success = run_production_pipeline(
        mode=args.mode,
        source_path=args.source,
        skip_bronze=args.skip_bronze,
        skip_silver=args.skip_silver,
        skip_gold=args.skip_gold,
        skip_ml=args.skip_ml,
        skip_quality=args.skip_quality,
    )

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
