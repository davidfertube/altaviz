"""
Production Monitoring — Pipeline & Fleet Observability

Provides structured metrics collection for:
1. Pipeline performance (stage durations, throughput, error rates)
2. Data quality (completeness, freshness, anomaly rates)
3. ML model health (prediction counts, drift detection)
4. Fleet health (compressor status distribution, alert rates)

Metrics are:
- Logged to Azure Monitor (Log Analytics workspace) in production
- Written to OneLake pipeline_runs table for dashboarding
- Emitted as structured logs for debugging

Author: David Fernandez
"""

# ===========================================================================
# PATTERN: PipelineMonitor with Context Manager Stages
# WHY: The PipelineMonitor class uses context managers (with monitor.stage())
#      to automatically time each pipeline stage. This pattern ensures
#      duration is always recorded — even if a stage fails with an exception.
#      The __exit__ method captures the duration before the exception
#      propagates. Without context managers, developers would need to
#      manually call start/stop timing, which is error-prone (forgetting
#      to stop timing on the error path).
# SCALING: The monitor itself is lightweight — it stores metrics in a
#          single dataclass and emits them at pipeline completion. No
#          per-row overhead. At 4,700 compressors, the monitoring overhead
#          is <0.1% of total pipeline time.
# ALTERNATIVE: Could use a decorator pattern (@timed("bronze")) on
#              functions, but context managers are more flexible —
#              they can wrap arbitrary code blocks, not just functions.
# ===========================================================================

# ===========================================================================
# PATTERN: Three-Tier Metrics Emission (Log + Azure Monitor + Teams)
# WHY: Pipeline metrics are emitted to three destinations, each serving
#      a different audience:
#      1. Structured Logs (always): Captured by Azure Log Analytics for
#         historical analysis, dashboarding, and trend detection. These
#         logs power the operational Kusto queries that answer "how has
#         pipeline performance changed over the last 30 days?"
#      2. Azure Monitor (if configured): Custom metrics sent to the Log
#         Analytics workspace via the Logs Ingestion API. These appear
#         in Azure Dashboards alongside infrastructure metrics (CPU,
#         memory, Spark executor health) for holistic monitoring.
#      3. Teams Webhook (on failure only): Fire-and-forget alert card
#         sent to the operations Teams channel. This is the human
#         notification layer — critical for overnight failures when
#         nobody is watching dashboards.
#      The three tiers are independent: if Azure Monitor is down,
#      structured logs and Teams alerts still work.
# SCALING: Metrics emission is a single API call per destination per
#          pipeline run (~3 HTTP requests total). No scaling concerns.
# ALTERNATIVE: Could use Prometheus/Grafana for metrics (pull-based,
#              better for high-cardinality metrics), but Azure Monitor
#              integrates natively with the Fabric ecosystem.
# ===========================================================================

import os
import json
import logging
import time
from datetime import datetime
from typing import Dict, Optional, List
from dataclasses import dataclass, field, asdict

logger = logging.getLogger(__name__)


# ===========================================================================
# PATTERN: PipelineMetrics Dataclass (Structured Telemetry)
# WHY: Using a dataclass instead of a plain dict provides:
#      1. Type safety: IDE autocomplete and type checking catch typos
#      2. Default values: New metrics can be added without breaking
#         existing code (defaults to 0 or empty)
#      3. asdict() serialization: Converts to JSON-compatible dict for
#         Azure Monitor ingestion with one function call
#      The metrics are organized by category (stage durations, row counts,
#      data quality, ML results, errors) matching the pipeline structure.
# ===========================================================================
@dataclass
class PipelineMetrics:
    """Structured metrics for a pipeline run."""
    run_id: str = ""
    started_at: str = ""
    completed_at: str = ""
    status: str = "running"
    duration_seconds: float = 0.0

    # Stage durations
    bronze_duration_s: float = 0.0
    silver_duration_s: float = 0.0
    gold_duration_s: float = 0.0
    ml_duration_s: float = 0.0
    export_duration_s: float = 0.0

    # Row counts
    bronze_rows: int = 0
    silver_rows: int = 0
    gold_rows: int = 0
    hourly_agg_rows: int = 0
    alerts_generated: int = 0

    # Data quality
    rejection_rate: float = 0.0
    unique_compressors: int = 0
    data_freshness_minutes: float = 0.0

    # ML
    ml_models_run: int = 0
    anomalies_detected: int = 0
    compressors_at_risk: int = 0

    # Errors
    error_message: str = ""
    warnings: List[str] = field(default_factory=list)


class PipelineMonitor:
    """
    Production pipeline monitor with Azure Monitor integration.

    Usage:
        monitor = PipelineMonitor()
        monitor.start_run()

        with monitor.stage("bronze"):
            # ... bronze processing
            monitor.record_rows("bronze", 1350000)

        monitor.complete_run(status="success")
        monitor.emit_metrics()
    """

    def __init__(self, organization_id: Optional[str] = None):
        self.organization_id = organization_id or os.environ.get("ETL_ORGANIZATION_ID")
        self.metrics = PipelineMetrics()
        self._stage_start: Optional[float] = None
        self._run_start: Optional[float] = None

    def start_run(self):
        """Mark pipeline run as started."""
        import uuid
        self.metrics.run_id = str(uuid.uuid4())[:8]
        self.metrics.started_at = datetime.now().isoformat()
        self._run_start = time.time()
        logger.info(f"[Monitor] Pipeline run started: {self.metrics.run_id}")

    def stage(self, stage_name: str):
        """Context manager for timing a pipeline stage."""
        return _StageTimer(self, stage_name)

    def record_rows(self, stage: str, count: int):
        """Record row count for a stage."""
        attr = f"{stage}_rows"
        if hasattr(self.metrics, attr):
            setattr(self.metrics, attr, count)

    def record_quality(self, rejection_rate: float, unique_compressors: int, freshness_min: float):
        """Record data quality metrics."""
        self.metrics.rejection_rate = rejection_rate
        self.metrics.unique_compressors = unique_compressors
        self.metrics.data_freshness_minutes = freshness_min

    def record_ml(self, models_run: int, anomalies: int = 0, at_risk: int = 0):
        """Record ML inference metrics."""
        self.metrics.ml_models_run = models_run
        self.metrics.anomalies_detected = anomalies
        self.metrics.compressors_at_risk = at_risk

    def record_alerts(self, count: int):
        """Record alerts generated count."""
        self.metrics.alerts_generated = count

    def add_warning(self, message: str):
        """Add a warning message to metrics."""
        self.metrics.warnings.append(message)
        logger.warning(f"[Monitor] {message}")

    def complete_run(self, status: str = "success", error: str = ""):
        """Mark pipeline run as completed."""
        self.metrics.completed_at = datetime.now().isoformat()
        self.metrics.status = status
        self.metrics.error_message = error

        if self._run_start:
            self.metrics.duration_seconds = round(time.time() - self._run_start, 2)

        logger.info(
            f"[Monitor] Pipeline run completed: status={status}, "
            f"duration={self.metrics.duration_seconds}s"
        )

    def emit_metrics(self):
        """
        Emit metrics to all configured destinations.

        1. Structured log (always) -- provides baseline observability
        2. Azure Monitor (if LOG_ANALYTICS_WORKSPACE_ID set) -- dashboards
        3. Teams webhook (on failure only) -- human notification

        Destinations are independent: failure of one does not affect others.
        Azure Monitor and Teams errors are caught and logged as warnings
        (never crash the pipeline for a monitoring failure).
        """
        metrics_dict = asdict(self.metrics)

        # 1. Structured log
        self._log_summary(metrics_dict)

        # 2. Azure Monitor
        self._emit_to_azure_monitor(metrics_dict)

        # 3. Teams webhook (on failure)
        if self.metrics.status == "failed":
            self._send_teams_alert(metrics_dict)

    def _log_summary(self, metrics: Dict):
        """Log a formatted summary."""
        logger.info("=" * 60)
        logger.info("PIPELINE RUN SUMMARY")
        logger.info("=" * 60)
        logger.info(f"  Run ID:           {metrics['run_id']}")
        logger.info(f"  Status:           {metrics['status']}")
        logger.info(f"  Duration:         {metrics['duration_seconds']}s")
        logger.info(f"  Bronze rows:      {metrics['bronze_rows']:,}")
        logger.info(f"  Silver rows:      {metrics['silver_rows']:,}")
        logger.info(f"  Gold rows:        {metrics['gold_rows']:,}")
        logger.info(f"  Rejection rate:   {metrics['rejection_rate']:.2%}")
        logger.info(f"  Unique units:     {metrics['unique_compressors']:,}")
        logger.info(f"  Alerts generated: {metrics['alerts_generated']:,}")
        logger.info(f"  ML models run:    {metrics['ml_models_run']}/4")
        logger.info(f"  Anomalies:        {metrics['anomalies_detected']:,}")
        logger.info(f"  At-risk units:    {metrics['compressors_at_risk']:,}")

        if metrics['error_message']:
            logger.error(f"  Error: {metrics['error_message']}")

        logger.info("  Stage durations:")
        for stage in ['bronze', 'silver', 'gold', 'ml', 'export']:
            dur = metrics.get(f'{stage}_duration_s', 0)
            logger.info(f"    {stage:12s}: {dur:.2f}s")

        if metrics['warnings']:
            logger.info("  Warnings:")
            for w in metrics['warnings']:
                logger.info(f"    - {w}")
        logger.info("=" * 60)

    def _emit_to_azure_monitor(self, metrics: Dict):
        """Send custom metrics to Azure Log Analytics.

        Uses the Logs Ingestion API (not the classic HTTP Data Collector API)
        which requires a Data Collection Rule (DCR) and a Data Collection
        Endpoint (DCE). The stream_name maps to a custom table in the
        Log Analytics workspace where metrics are queryable via KQL.
        Authentication uses DefaultAzureCredential which automatically
        picks up managed identity in Fabric or az login locally.
        """
        workspace_id = os.environ.get("LOG_ANALYTICS_WORKSPACE_ID")
        if not workspace_id:
            return

        try:
            from azure.monitor.ingestion import LogsIngestionClient
            from azure.identity import DefaultAzureCredential

            credential = DefaultAzureCredential()
            endpoint = os.environ.get("LOG_ANALYTICS_ENDPOINT", "")
            rule_id = os.environ.get("LOG_ANALYTICS_DCR_ID", "")
            stream_name = "Custom-AltavizPipelineRuns_CL"

            client = LogsIngestionClient(endpoint=endpoint, credential=credential)
            client.upload(rule_id=rule_id, stream_name=stream_name, logs=[metrics])

            logger.info("[Monitor] Metrics sent to Azure Monitor")

        except ImportError:
            logger.debug("[Monitor] azure-monitor-ingestion not installed, skipping")
        except Exception as e:
            logger.warning(f"[Monitor] Azure Monitor emit failed: {e}")

    def _send_teams_alert(self, metrics: Dict):
        """Send failure alert to Microsoft Teams webhook.

        Uses Adaptive Cards format (not legacy MessageCard) for rich
        formatting in Teams. The card includes run ID, error message,
        and key metrics so the on-call engineer can assess severity
        without opening a dashboard. The request has a 10-second timeout
        to prevent a slow Teams API from blocking pipeline completion.
        This is fire-and-forget: if Teams is down, we log a warning
        and move on (never retry, never block).
        """
        webhook_url = os.environ.get("TEAMS_WEBHOOK_URL")
        if not webhook_url:
            return

        try:
            import urllib.request

            card = {
                "type": "message",
                "attachments": [{
                    "contentType": "application/vnd.microsoft.card.adaptive",
                    "content": {
                        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                        "type": "AdaptiveCard",
                        "version": "1.4",
                        "body": [
                            {"type": "TextBlock", "text": "Pipeline Failure Alert", "weight": "Bolder", "size": "Large", "color": "Attention"},
                            {"type": "TextBlock", "text": f"Run ID: {metrics['run_id']}"},
                            {"type": "TextBlock", "text": f"Error: {metrics['error_message']}", "wrap": True},
                            {"type": "TextBlock", "text": f"Duration: {metrics['duration_seconds']}s | Bronze: {metrics['bronze_rows']:,} rows"},
                        ],
                    },
                }],
            }

            req = urllib.request.Request(
                webhook_url,
                data=json.dumps(card).encode("utf-8"),
                headers={"Content-Type": "application/json"},
            )
            urllib.request.urlopen(req, timeout=10)
            logger.info("[Monitor] Teams alert sent")

        except Exception as e:
            logger.warning(f"[Monitor] Teams alert failed: {e}")


# ===========================================================================
# PATTERN: Stage Timer as Context Manager
# WHY: _StageTimer implements __enter__ and __exit__ to automatically
#      measure wall-clock duration of any code block wrapped in
#      `with monitor.stage("name"):`. The __exit__ method runs even if
#      the code block raises an exception, so duration is always recorded.
#      The stage name maps to a PipelineMetrics attribute (e.g., "bronze"
#      maps to bronze_duration_s) via dynamic attribute access (setattr).
# ===========================================================================
class _StageTimer:
    """Context manager for timing pipeline stages."""

    def __init__(self, monitor: PipelineMonitor, stage_name: str):
        self.monitor = monitor
        self.stage_name = stage_name
        self.start = None

    def __enter__(self):
        self.start = time.time()
        logger.info(f"[Monitor] Stage '{self.stage_name}' started")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        duration = round(time.time() - self.start, 2)
        attr = f"{self.stage_name}_duration_s"
        if hasattr(self.monitor.metrics, attr):
            setattr(self.monitor.metrics, attr, duration)

        status = "success" if exc_type is None else "failed"
        logger.info(f"[Monitor] Stage '{self.stage_name}': {duration}s ({status})")

        return False    # Don't suppress exceptions
