# Runbook: ML Model Retraining

## When to Retrain

| Model | Frequency | Trigger |
|-------|-----------|---------|
| Anomaly Detector | Weekly | Rolling 30-day training window |
| Temperature Drift | Monthly | New compressor installations |
| Emissions Estimator | Quarterly | EPA factor updates |
| RUL Predictor | As needed | After 500+ run-to-failure examples collected |

## Retraining Steps

### 1. Generate training data
```bash
# Ensure Gold layer has recent data
python3 -m src.etl.pipeline --stage gold

# Compute latest features
python3 -c "
from src.ml.feature_store.store import FeatureStore
fs = FeatureStore()
fs.compute_all_features()
print('Features computed')
"
```

### 2. Train new model version
```bash
# Anomaly detector (Isolation Forest)
python3 -c "
from src.ml.anomaly_detector import AnomalyDetector
detector = AnomalyDetector()
detector.train(days=30)  # Last 30 days of Gold data
print(f'Trained on {detector.training_samples} samples')
"
```

### 3. Evaluate on holdout set
```bash
# Use most recent 7 days as holdout (not seen during training)
python3 -c "
from src.ml.anomaly_detector import AnomalyDetector
detector = AnomalyDetector()
metrics = detector.evaluate(holdout_days=7)
print(f'Precision: {metrics[\"precision\"]:.3f}')
print(f'Recall: {metrics[\"recall\"]:.3f}')
print(f'F1: {metrics[\"f1\"]:.3f}')
"
```

### 4. Register in MLflow
```bash
python3 -c "
from src.ml.serving.model_registry import log_training_run, register_model
run_id = log_training_run(
    model_name='anomaly_detector',
    model_version='v2.0.0',
    metrics={'precision': 0.92, 'recall': 0.88, 'f1': 0.90},
    params={'n_estimators': '100', 'contamination': '0.05', 'training_days': '30'},
)
register_model('anomaly_detector', run_id, stage='Staging')
print(f'Registered as Staging (run_id={run_id})')
"
```

### 5. Validate in Staging
```bash
# Run batch predictor with Staging model
python3 -m src.ml.serving.batch_predictor --stage staging --compressors 100
# Review predictions — do they make sense?
```

### 6. Promote to Production
```bash
python3 -c "
from src.ml.serving.model_registry import register_model
register_model('anomaly_detector', '<run_id>', stage='Production')
print('Promoted to Production')
"
```

### 7. Rollback (if needed)
```bash
# Transition previous version back to Production
python3 -c "
import mlflow
client = mlflow.tracking.MlflowClient()
client.transition_model_version_stage(
    name='anomaly_detector',
    version='<previous_version>',
    stage='Production',
)
print('Rolled back to previous version')
"
```

## Quality Gates
- Precision must be > 0.85 (too many false alarms wastes technician time)
- Recall must be > 0.80 (missed failures cause unplanned shutdowns)
- F1 must be > 0.82 (balanced measure)
- If any metric drops >10% from previous version, do NOT promote
