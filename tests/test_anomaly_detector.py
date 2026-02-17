"""Tests for Isolation Forest anomaly detection on vibration data."""
import pytest
import numpy as np
from datetime import datetime, timedelta
from pyspark.sql.types import (
    StructType,
    StructField,
    StringType,
    DoubleType,
    TimestampType,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def gold_like_schema():
    """Schema matching the columns the anomaly detector expects from the Gold layer."""
    return StructType([
        StructField("compressor_id", StringType(), False),
        StructField("agg_timestamp", TimestampType(), False),
        StructField("vibration_mean", DoubleType(), True),
        StructField("vibration_std", DoubleType(), True),
        StructField("vibration_max", DoubleType(), True),
        StructField("discharge_temp_mean", DoubleType(), True),
        StructField("discharge_temp_rate_of_change", DoubleType(), True),
        StructField("pressure_delta_mean", DoubleType(), True),
        StructField("horsepower_mean", DoubleType(), True),
    ])


@pytest.fixture
def healthy_gold_df(spark, gold_like_schema):
    """DataFrame of healthy compressor readings suitable for training."""
    base = datetime(2026, 1, 1, 0, 0)
    data = []
    for cid in ["COMP-001", "COMP-002", "COMP-004", "COMP-005"]:
        for i in range(30):
            ts = base + timedelta(hours=i)
            np.random.seed(hash(cid + str(i)) % 2**31)
            data.append((
                cid, ts,
                3.0 + np.random.normal(0, 0.3),   # vibration_mean
                0.2 + np.random.normal(0, 0.05),   # vibration_std
                3.5 + np.random.normal(0, 0.4),    # vibration_max
                200.0 + np.random.normal(0, 5),    # discharge_temp_mean
                0.1 + np.random.normal(0, 0.05),   # discharge_temp_rate_of_change
                1050.0 + np.random.normal(0, 20),  # pressure_delta_mean
                1400.0 + np.random.normal(0, 30),  # horsepower_mean
            ))
    return spark.createDataFrame(data, gold_like_schema)


@pytest.fixture
def scoring_gold_df(spark, gold_like_schema):
    """Small DataFrame for scoring with one normal and one anomalous compressor."""
    ts = datetime(2026, 1, 5, 12, 0)
    data = [
        # Normal reading
        ("COMP-001", ts, 3.0, 0.2, 3.5, 200.0, 0.1, 1050.0, 1400.0),
        # Anomalous reading -- very high vibration and temp
        ("COMP-003", ts, 9.5, 2.0, 12.0, 280.0, 5.0, 1350.0, 1800.0),
    ]
    return spark.createDataFrame(data, gold_like_schema)


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_train_returns_model(healthy_gold_df):
    """Training on valid data should return a fitted IsolationForest."""
    from src.ml.anomaly_detector import train_anomaly_detector
    import tempfile, os, joblib

    model = train_anomaly_detector(healthy_gold_df)
    assert model is not None
    # Model should have a predict method (fitted sklearn estimator)
    assert hasattr(model, "predict")
    assert hasattr(model, "score_samples")


def test_train_empty_dataframe_returns_none(spark, gold_like_schema):
    """Training on empty DataFrame should return None, not crash."""
    from src.ml.anomaly_detector import train_anomaly_detector

    empty_df = spark.createDataFrame([], gold_like_schema)
    model = train_anomaly_detector(empty_df)
    assert model is None


def test_score_readings_output_structure(healthy_gold_df, scoring_gold_df):
    """score_readings should return list of dicts with required keys."""
    from src.ml.anomaly_detector import train_anomaly_detector, score_readings

    model = train_anomaly_detector(healthy_gold_df)
    results = score_readings(scoring_gold_df, model=model)

    assert isinstance(results, list)
    assert len(results) == 2  # one per compressor

    required_keys = {
        "compressor_id",
        "prediction_timestamp",
        "is_anomaly",
        "anomaly_score",
        "anomaly_probability",
        "model_version",
        "features_used",
    }
    for r in results:
        assert required_keys.issubset(r.keys()), f"Missing keys: {required_keys - r.keys()}"


def test_anomaly_score_range(healthy_gold_df, scoring_gold_df):
    """Anomaly probabilities should be in [0, 1]."""
    from src.ml.anomaly_detector import train_anomaly_detector, score_readings

    model = train_anomaly_detector(healthy_gold_df)
    results = score_readings(scoring_gold_df, model=model)

    for r in results:
        assert 0.0 <= r["anomaly_probability"] <= 1.0, (
            f"anomaly_probability {r['anomaly_probability']} out of [0,1]"
        )


def test_score_readings_no_model_returns_empty(scoring_gold_df, tmp_path, monkeypatch):
    """score_readings with no model available returns empty list."""
    from src.ml import anomaly_detector

    # Point MODEL_PATH to a non-existent file so load_model returns None
    monkeypatch.setattr(anomaly_detector, "MODEL_PATH", str(tmp_path / "no_model.joblib"))
    results = anomaly_detector.score_readings(scoring_gold_df, model=None)
    assert results == []


def test_score_readings_empty_df_returns_empty(spark, gold_like_schema, healthy_gold_df):
    """Scoring an empty DataFrame should return empty list."""
    from src.ml.anomaly_detector import train_anomaly_detector, score_readings

    model = train_anomaly_detector(healthy_gold_df)
    empty_df = spark.createDataFrame([], gold_like_schema)
    results = score_readings(empty_df, model=model)
    assert results == []
