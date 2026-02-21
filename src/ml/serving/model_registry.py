"""
Model Registry — MLflow Integration for Model Lifecycle Management

Tracks model training experiments, versions, and deployment state.
In production (Fabric), this uses the built-in MLflow tracking server.
For local development, uses a file-based MLflow backend.

Model lifecycle:
1. Train on historical data (weekly/monthly)
2. Evaluate on holdout set
3. Register in MLflow (staging → production)
4. Serve via batch predictor
5. Monitor drift → retrain

Author: David Fernandez
"""

import os
import logging
from datetime import datetime
from typing import Dict, Optional
from pathlib import Path

logger = logging.getLogger(__name__)

MODEL_REGISTRY_DIR = Path("models/registry")
MLFLOW_TRACKING_URI = os.environ.get("MLFLOW_TRACKING_URI", "file:./mlruns")


def get_mlflow_client():
    """Get MLflow client, initializing tracking URI."""
    try:
        import mlflow
        mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)
        return mlflow
    except ImportError:
        logger.warning("mlflow not installed, using local registry")
        return None


def log_training_run(
    model_name: str,
    model_version: str,
    metrics: Dict[str, float],
    params: Dict[str, str],
    model_artifact=None,
    tags: Optional[Dict[str, str]] = None,
) -> Optional[str]:
    """
    Log a model training run to MLflow.

    Args:
        model_name: Name of the model (e.g., 'anomaly_detector')
        model_version: Version string (e.g., 'v1.0.0')
        metrics: Training metrics (e.g., {'accuracy': 0.95, 'f1': 0.92})
        params: Hyperparameters (e.g., {'n_estimators': '100'})
        model_artifact: Trained model object (sklearn, etc.)
        tags: Additional metadata tags

    Returns:
        MLflow run ID (or None if MLflow unavailable)
    """
    mlflow = get_mlflow_client()
    if mlflow is None:
        _log_to_file(model_name, model_version, metrics, params)
        return None

    mlflow.set_experiment(f"altaviz/{model_name}")

    with mlflow.start_run(run_name=f"{model_name}_{model_version}") as run:
        mlflow.log_params(params)
        mlflow.log_metrics(metrics)

        if tags:
            mlflow.set_tags(tags)

        mlflow.set_tag("model_version", model_version)
        mlflow.set_tag("pipeline", "altaviz-production")
        mlflow.set_tag("fleet_size", "4700")

        if model_artifact is not None:
            try:
                mlflow.sklearn.log_model(model_artifact, model_name)
            except Exception:
                import joblib
                artifact_path = MODEL_REGISTRY_DIR / model_name / f"{model_version}.joblib"
                artifact_path.parent.mkdir(parents=True, exist_ok=True)
                joblib.dump(model_artifact, artifact_path)
                mlflow.log_artifact(str(artifact_path))

        run_id = run.info.run_id
        logger.info(
            f"MLflow run logged: {model_name} {model_version} "
            f"(run_id={run_id}, metrics={metrics})"
        )
        return run_id


def register_model(
    model_name: str,
    run_id: str,
    stage: str = "Staging",
) -> Optional[str]:
    """
    Register a model version in MLflow Model Registry.

    Stages: None → Staging → Production → Archived

    Args:
        model_name: Model name
        run_id: MLflow run ID
        stage: Target stage

    Returns:
        Model version number
    """
    mlflow = get_mlflow_client()
    if mlflow is None:
        return None

    try:
        model_uri = f"runs:/{run_id}/{model_name}"
        result = mlflow.register_model(model_uri, model_name)

        client = mlflow.tracking.MlflowClient()
        client.transition_model_version_stage(
            name=model_name,
            version=result.version,
            stage=stage,
        )

        logger.info(f"Model registered: {model_name} v{result.version} → {stage}")
        return result.version

    except Exception as e:
        logger.error(f"Model registration failed: {e}")
        return None


def load_production_model(model_name: str):
    """
    Load the current Production-stage model from registry.

    Falls back to local file if MLflow unavailable.
    """
    mlflow = get_mlflow_client()

    if mlflow is not None:
        try:
            model_uri = f"models:/{model_name}/Production"
            model = mlflow.sklearn.load_model(model_uri)
            logger.info(f"Loaded production model: {model_name}")
            return model
        except Exception as e:
            logger.warning(f"MLflow load failed ({e}), falling back to local")

    # Fallback: load from local joblib
    import joblib
    local_paths = [
        MODEL_REGISTRY_DIR / model_name / "production.joblib",
        Path(f"src/ml/models/isolation_forest.joblib"),
    ]

    for path in local_paths:
        if path.exists():
            logger.info(f"Loaded local model: {path}")
            return joblib.load(path)

    logger.warning(f"No model found for {model_name}")
    return None


def get_model_info(model_name: str) -> Dict:
    """Get information about a registered model."""
    mlflow = get_mlflow_client()
    if mlflow is None:
        return {'model_name': model_name, 'status': 'mlflow_unavailable'}

    try:
        client = mlflow.tracking.MlflowClient()
        model = client.get_registered_model(model_name)

        versions = []
        for v in model.latest_versions:
            versions.append({
                'version': v.version,
                'stage': v.current_stage,
                'status': v.status,
                'created': v.creation_timestamp,
            })

        return {
            'model_name': model_name,
            'description': model.description,
            'versions': versions,
            'tags': model.tags,
        }
    except Exception as e:
        return {'model_name': model_name, 'error': str(e)}


def _log_to_file(model_name: str, version: str, metrics: Dict, params: Dict):
    """Fallback logging when MLflow is unavailable."""
    log_dir = MODEL_REGISTRY_DIR / model_name
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / "training_log.jsonl"

    import json
    entry = {
        'timestamp': datetime.now().isoformat(),
        'model_name': model_name,
        'version': version,
        'metrics': metrics,
        'params': params,
    }

    with open(log_file, 'a') as f:
        f.write(json.dumps(entry) + '\n')

    logger.info(f"Training run logged to {log_file}")
