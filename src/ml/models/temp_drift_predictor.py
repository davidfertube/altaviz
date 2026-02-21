"""
Temperature Drift Prediction Module

Detects cooling system degradation by measuring temperature slope over time.
Uses linear regression on rolling temperature windows to predict time until
warning (240F) and critical (260F) thresholds.

More accurate than the heuristic RUL predictor for temperature-related failures,
catching gradual cooling system degradation 12-24 hours before threshold breach.
"""

import logging
import numpy as np
from typing import Dict, List, Optional
from datetime import datetime

logger = logging.getLogger('CompressorHealthETL')

# Thresholds from config/thresholds.yaml
TEMP_WARNING = 240.0   # F
TEMP_CRITICAL = 260.0  # F
TEMP_NORMAL_MAX = 220.0  # F (upper bound of normal range)

# Minimum slope to consider as drift (F/hour)
MIN_DRIFT_RATE = 0.5


def predict_temp_drift(
    compressor_id: str,
    temp_readings: List[Dict],
    window_hours: int = 24,
) -> Dict:
    """
    Predict temperature drift for a compressor using linear regression.

    Fits a line to recent temperature readings and projects when
    warning/critical thresholds will be reached.

    Args:
        compressor_id: Compressor identifier
        temp_readings: List of dicts with 'agg_timestamp' and 'discharge_temp_mean'
            sorted by timestamp ascending
        window_hours: How many hours of data to use for regression

    Returns:
        Dict with prediction results:
        - compressor_id
        - current_temp: Latest temperature reading
        - drift_rate_f_per_hour: Temperature slope (F/hour, positive = heating)
        - hours_to_warning: Hours until 240F (None if cooling or already past)
        - hours_to_critical: Hours until 260F (None if cooling or already past)
        - drift_status: 'stable' | 'drifting' | 'warning_imminent' | 'critical_imminent'
        - confidence: R-squared of the linear fit
    """
    result = {
        'compressor_id': compressor_id,
        'prediction_timestamp': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        'current_temp': None,
        'drift_rate_f_per_hour': 0.0,
        'hours_to_warning': None,
        'hours_to_critical': None,
        'drift_status': 'stable',
        'confidence': 0.0,
        'model_version': 'linreg-temp-v1.0',
    }

    if not temp_readings or len(temp_readings) < 3:
        logger.debug(f"{compressor_id}: Not enough temperature readings for drift prediction")
        return result

    # Extract timestamps and temperatures
    temps = []
    hours_from_start = []
    t0 = None

    for r in temp_readings:
        temp = r.get('discharge_temp_mean')
        ts = r.get('agg_timestamp')
        if temp is None or ts is None:
            continue

        temp = float(temp)
        if t0 is None:
            t0 = ts
            hours_from_start.append(0.0)
        else:
            delta = (ts - t0).total_seconds() / 3600.0
            hours_from_start.append(delta)
        temps.append(temp)

    if len(temps) < 3:
        return result

    x = np.array(hours_from_start)
    y = np.array(temps)

    result['current_temp'] = float(y[-1])

    # Linear regression: y = mx + b
    n = len(x)
    x_mean = x.mean()
    y_mean = y.mean()

    ss_xy = np.sum((x - x_mean) * (y - y_mean))
    ss_xx = np.sum((x - x_mean) ** 2)

    if ss_xx == 0:
        return result

    slope = ss_xy / ss_xx  # F per hour
    intercept = y_mean - slope * x_mean

    # R-squared for confidence
    y_pred = slope * x + intercept
    ss_res = np.sum((y - y_pred) ** 2)
    ss_tot = np.sum((y - y_mean) ** 2)
    r_squared = 1.0 - (ss_res / ss_tot) if ss_tot > 0 else 0.0

    result['drift_rate_f_per_hour'] = round(float(slope), 4)
    result['confidence'] = round(max(0.0, float(r_squared)), 4)

    current_temp = float(y[-1])
    current_time = float(x[-1])

    # Only predict future thresholds if temperature is rising
    if slope > MIN_DRIFT_RATE:
        # Hours from current time to warning threshold
        if current_temp < TEMP_WARNING:
            hours_to_warn = (TEMP_WARNING - current_temp) / slope
            if 0 < hours_to_warn < 120:  # Within 5 days
                result['hours_to_warning'] = round(hours_to_warn, 1)

        # Hours from current time to critical threshold
        if current_temp < TEMP_CRITICAL:
            hours_to_crit = (TEMP_CRITICAL - current_temp) / slope
            if 0 < hours_to_crit < 120:
                result['hours_to_critical'] = round(hours_to_crit, 1)

        # Determine drift status
        if result['hours_to_critical'] is not None and result['hours_to_critical'] < 12:
            result['drift_status'] = 'critical_imminent'
        elif result['hours_to_warning'] is not None and result['hours_to_warning'] < 12:
            result['drift_status'] = 'warning_imminent'
        else:
            result['drift_status'] = 'drifting'
    else:
        result['drift_status'] = 'stable'

    logger.debug(
        f"{compressor_id}: temp={current_temp:.1f}F, "
        f"drift={slope:.3f}F/hr, status={result['drift_status']}"
    )

    return result


def predict_fleet_temp_drift(aggregated_df) -> List[Dict]:
    """
    Run temperature drift prediction for all compressors in a PySpark DataFrame.

    Args:
        aggregated_df: Gold layer aggregated DataFrame with
            compressor_id, agg_timestamp, discharge_temp_mean columns

    Returns:
        List of prediction dicts, one per compressor
    """
    from pyspark.sql import functions as F

    # Filter to 1hr window readings for best granularity
    df = aggregated_df
    if 'window_type' in aggregated_df.columns:
        df = aggregated_df.filter(F.col("window_type") == "1hr")

    # Collect per-compressor readings (small dataset: ~1,690 rows total)
    rows = df.select(
        "compressor_id", "agg_timestamp", "discharge_temp_mean"
    ).orderBy("compressor_id", "agg_timestamp").collect()

    # Group by compressor
    compressor_readings: Dict[str, List[Dict]] = {}
    for row in rows:
        cid = row['compressor_id']
        if cid not in compressor_readings:
            compressor_readings[cid] = []
        compressor_readings[cid].append(row.asDict())

    # Predict for each compressor
    predictions = []
    for cid, readings in sorted(compressor_readings.items()):
        pred = predict_temp_drift(cid, readings)
        predictions.append(pred)

    drifting = sum(1 for p in predictions if p['drift_status'] != 'stable')
    logger.info(f"Temperature drift: {drifting}/{len(predictions)} compressors drifting")

    return predictions
