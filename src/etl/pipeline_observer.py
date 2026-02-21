"""
Pipeline Observability Module

Tracks structured run metadata for the ETL pipeline:
- Stage durations and row counts
- Data volume anomaly detection
- Success/failure status per stage
- Writes results to pipeline_runs table in PostgreSQL

Author: David Fernandez
"""

import os
import logging
from datetime import datetime
from typing import Optional

logger = logging.getLogger('CompressorHealthETL')


class PipelineObserver:
    """
    Observes and records ETL pipeline execution metrics.

    Usage:
        observer = PipelineObserver()
        observer.start()
        observer.record_stage('bronze', row_count=10080, status='success')
        observer.record_stage('silver', row_count=9800, status='success')
        observer.complete(status='success')
        observer.write_to_database()
    """

    def __init__(self, organization_id: Optional[str] = None):
        self.organization_id = organization_id or os.environ.get('ETL_ORGANIZATION_ID')
        self.started_at: Optional[datetime] = None
        self.completed_at: Optional[datetime] = None
        self.status = 'running'
        self.stages: dict = {}
        self.bronze_rows: Optional[int] = None
        self.silver_rows: Optional[int] = None
        self.gold_rows: Optional[int] = None
        self.alerts_generated: Optional[int] = None
        self.ml_models_run: int = 0
        self.error_message: Optional[str] = None

    def start(self):
        """Mark pipeline run as started."""
        self.started_at = datetime.now()
        self.status = 'running'
        logger.info("[Observer] Pipeline run started")

    def record_stage(self, stage_name: str, row_count: Optional[int] = None,
                     duration_seconds: Optional[float] = None, status: str = 'success'):
        """Record metrics for a pipeline stage."""
        self.stages[stage_name] = {
            'row_count': row_count,
            'duration_seconds': round(duration_seconds, 2) if duration_seconds else None,
            'status': status,
            'timestamp': datetime.now().isoformat(),
        }

        if stage_name == 'bronze' and row_count is not None:
            self.bronze_rows = row_count
        elif stage_name == 'silver' and row_count is not None:
            self.silver_rows = row_count
        elif stage_name == 'gold' and row_count is not None:
            self.gold_rows = row_count

        logger.info(
            f"[Observer] Stage '{stage_name}': "
            f"rows={row_count}, duration={duration_seconds:.2f}s, status={status}"
            if duration_seconds else
            f"[Observer] Stage '{stage_name}': rows={row_count}, status={status}"
        )

    def record_ml(self, models_run: int):
        """Record how many ML models ran successfully."""
        self.ml_models_run = models_run

    def record_alerts(self, count: int):
        """Record number of alerts generated."""
        self.alerts_generated = count

    def complete(self, status: str = 'success', error: Optional[str] = None):
        """Mark pipeline run as completed."""
        self.completed_at = datetime.now()
        self.status = status
        self.error_message = error

        duration = (self.completed_at - self.started_at).total_seconds() if self.started_at else 0
        logger.info(
            f"[Observer] Pipeline completed: status={status}, "
            f"duration={duration:.2f}s, "
            f"stages={len(self.stages)}"
        )

    def check_data_volume_anomaly(self, historical_avg: Optional[int] = None) -> bool:
        """
        Check if Bronze row count is anomalously low.

        If Bronze rows are less than 50% of the historical average,
        flag as a data volume anomaly (likely SCADA outage or source failure).

        Args:
            historical_avg: Average Bronze row count from recent runs.
                            If None, skip the check.

        Returns:
            True if anomaly detected, False otherwise.
        """
        if historical_avg is None or self.bronze_rows is None:
            return False

        if historical_avg > 0 and self.bronze_rows < (historical_avg * 0.5):
            logger.warning(
                f"[Observer] DATA VOLUME ANOMALY: Bronze rows ({self.bronze_rows}) "
                f"are less than 50% of historical average ({historical_avg}). "
                f"Possible SCADA outage or source failure."
            )
            return True
        return False

    def to_dict(self) -> dict:
        """Convert observer state to a dictionary for database storage."""
        duration = None
        if self.started_at and self.completed_at:
            duration = round((self.completed_at - self.started_at).total_seconds(), 2)

        return {
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'status': self.status,
            'bronze_rows': self.bronze_rows,
            'silver_rows': self.silver_rows,
            'gold_rows': self.gold_rows,
            'alerts_generated': self.alerts_generated,
            'ml_models_run': self.ml_models_run,
            'duration_seconds': duration,
            'stage_durations': self.stages,
            'error_message': self.error_message,
            'organization_id': self.organization_id,
        }

    def write_to_database(self):
        """
        Write pipeline run metrics to the pipeline_runs table.

        Uses JDBC via the existing database_writer module.
        Fails silently if database is unavailable.
        """
        try:
            from src.etl.database_writer import test_connection, get_jdbc_url, get_jdbc_properties
            import json

            if not test_connection():
                logger.warning("[Observer] Skipping DB write: no database connection")
                return

            data = self.to_dict()

            # Use direct JDBC insert via psycopg2 or pg driver
            import urllib.parse
            db_url = os.environ.get('DATABASE_URL', '')
            if not db_url:
                logger.warning("[Observer] No DATABASE_URL set, skipping pipeline_runs write")
                return

            # Parse DATABASE_URL for psycopg2
            parsed = urllib.parse.urlparse(db_url)

            import psycopg2
            conn = psycopg2.connect(
                host=parsed.hostname,
                port=parsed.port or 5432,
                dbname=parsed.path.lstrip('/'),
                user=parsed.username,
                password=parsed.password,
                sslmode='require',
            )
            try:
                cur = conn.cursor()
                cur.execute(
                    """INSERT INTO pipeline_runs
                       (started_at, completed_at, status, bronze_rows, silver_rows,
                        gold_rows, alerts_generated, ml_models_run, duration_seconds,
                        stage_durations, error_message, organization_id)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                    [
                        data['started_at'],
                        data['completed_at'],
                        data['status'],
                        data['bronze_rows'],
                        data['silver_rows'],
                        data['gold_rows'],
                        data['alerts_generated'],
                        data['ml_models_run'],
                        data['duration_seconds'],
                        json.dumps(data['stage_durations']),
                        data['error_message'],
                        data['organization_id'],
                    ]
                )
                conn.commit()
                logger.info("[Observer] Pipeline run metrics written to database")
            finally:
                conn.close()

        except Exception as e:
            logger.warning(f"[Observer] Failed to write pipeline run to database: {e}")

    def log_summary(self):
        """Log a formatted summary of the pipeline run."""
        data = self.to_dict()
        logger.info("=" * 60)
        logger.info("PIPELINE RUN SUMMARY")
        logger.info("=" * 60)
        logger.info(f"  Status:           {data['status']}")
        logger.info(f"  Duration:         {data['duration_seconds']}s")
        logger.info(f"  Bronze rows:      {data['bronze_rows']}")
        logger.info(f"  Silver rows:      {data['silver_rows']}")
        logger.info(f"  Gold rows:        {data['gold_rows']}")
        logger.info(f"  Alerts generated: {data['alerts_generated']}")
        logger.info(f"  ML models run:    {data['ml_models_run']}/4")
        if data['error_message']:
            logger.info(f"  Error:            {data['error_message']}")
        logger.info("  Stage breakdown:")
        for stage, info in data['stage_durations'].items():
            logger.info(
                f"    {stage:12s}: {info.get('duration_seconds', '?')}s, "
                f"{info.get('row_count', '?')} rows, "
                f"{info.get('status', '?')}"
            )
        logger.info("=" * 60)
