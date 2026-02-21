"""
Anomaly Detection Module - Isolation Forest on Vibration Data

Detects anomalous vibration patterns in compressor sensor data using
scikit-learn's Isolation Forest. Trained on healthy compressor data,
then used to score new readings for early fault detection.

Catches bearing wear and mechanical issues that are more subtle than
static threshold alerts, providing 24-48 hour early warning of failures.
"""

import logging
import os
import json
import joblib
import numpy as np
from typing import Dict, List, Optional
from datetime import datetime

logger = logging.getLogger('CompressorHealthETL')

# Feature columns used by the model
FEATURE_COLUMNS = [
    'vibration_mean',
    'vibration_std',
    'vibration_max',
    'discharge_temp_mean',
    'discharge_temp_rate_of_change',
    'pressure_delta_mean',
    'horsepower_mean',
]

MODEL_DIR = os.path.join(os.path.dirname(__file__), 'models')
MODEL_PATH = os.path.join(MODEL_DIR, 'isolation_forest.joblib')


def train_anomaly_detector(gold_df, healthy_compressor_ids=None):
    """
    Train Isolation Forest on healthy compressor data from Gold layer.

    Args:
        gold_df: PySpark DataFrame from Gold layer (aggregated 1hr readings)
        healthy_compressor_ids: List of compressor IDs known to be healthy.
            Defaults to all except COMP-003 and COMP-007 (known failures).

    Returns:
        Trained IsolationForest model
    """
    from sklearn.ensemble import IsolationForest

    if healthy_compressor_ids is None:
        healthy_compressor_ids = [
            'COMP-001', 'COMP-002', 'COMP-004', 'COMP-005',
            'COMP-006', 'COMP-008', 'COMP-009', 'COMP-010'
        ]

    # Filter to healthy compressors only
    healthy_df = gold_df.filter(
        gold_df.compressor_id.isin(healthy_compressor_ids)
    )

    # Select feature columns and collect to pandas
    available_cols = [c for c in FEATURE_COLUMNS if c in gold_df.columns]
    features_df = healthy_df.select(['compressor_id'] + available_cols).toPandas()

    # Drop rows with NaN
    features_df = features_df.dropna(subset=available_cols)

    if features_df.empty:
        logger.warning("No training data available for anomaly detector")
        return None

    X_train = features_df[available_cols].values

    # Train Isolation Forest
    model = IsolationForest(
        n_estimators=100,
        contamination=0.05,  # Expect ~5% anomalies in normal data (sensor noise)
        max_samples='auto',
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train)

    # Save model
    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    logger.info(f"Anomaly detector trained on {len(X_train)} samples, saved to {MODEL_PATH}")

    return model


def load_model():
    """Load trained anomaly detection model from disk."""
    if not os.path.exists(MODEL_PATH):
        logger.warning(f"No trained model found at {MODEL_PATH}")
        return None
    return joblib.load(MODEL_PATH)


def score_readings(readings_df, model=None):
    """
    Score sensor readings for anomalies using trained Isolation Forest.

    Args:
        readings_df: PySpark DataFrame with sensor readings (Gold layer format)
        model: Pre-loaded model. If None, loads from disk.

    Returns:
        List of prediction dicts with anomaly scores per compressor
    """
    if model is None:
        model = load_model()

    if model is None:
        logger.warning("No model available, returning empty predictions")
        return []

    available_cols = [c for c in FEATURE_COLUMNS if c in readings_df.columns]

    # Get latest reading per compressor
    from pyspark.sql import functions as F

    latest_times = readings_df.groupBy("compressor_id").agg(
        F.max("agg_timestamp").alias("latest_time")
    )

    latest_df = readings_df.alias("a").join(
        latest_times.alias("b"),
        (F.col("a.compressor_id") == F.col("b.compressor_id")) &
        (F.col("a.agg_timestamp") == F.col("b.latest_time"))
    ).select("a.*")

    # Collect to driver (small: 10 compressors max)
    pdf = latest_df.select(['compressor_id'] + available_cols).toPandas()
    pdf = pdf.dropna(subset=available_cols)

    if pdf.empty:
        return []

    X = pdf[available_cols].values

    # Predict: -1 = anomaly, 1 = normal
    predictions = model.predict(X)
    # Score: more negative = more anomalous
    scores = model.score_samples(X)

    # Convert scores to 0-1 probability (higher = more anomalous)
    min_score = scores.min()
    max_score = scores.max()
    score_range = max_score - min_score if max_score != min_score else 1.0
    anomaly_probabilities = 1.0 - (scores - min_score) / score_range

    results = []
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    for i, row in pdf.iterrows():
        is_anomaly = predictions[i] == -1
        results.append({
            'compressor_id': row['compressor_id'],
            'prediction_timestamp': now,
            'is_anomaly': is_anomaly,
            'anomaly_score': float(scores[i]),
            'anomaly_probability': float(anomaly_probabilities[i]),
            'model_version': 'isolation-forest-v1.0',
            'features_used': json.dumps({col: float(row[col]) for col in available_cols}),
        })

    anomaly_count = sum(1 for r in results if r['is_anomaly'])
    logger.info(f"Anomaly detection: {anomaly_count}/{len(results)} compressors flagged")

    return results
