"""
Statistical RUL (Remaining Useful Life) predictor using rate-of-change heuristics.
For interview demo - production would use trained LSTM/timeseries model.
"""
import os
import yaml
from datetime import datetime, timedelta

# Load thresholds from config/thresholds.yaml
_config_path = os.path.join(os.path.dirname(__file__), '..', '..', 'config', 'thresholds.yaml')
with open(_config_path, 'r') as f:
    _thresholds_config = yaml.safe_load(f)

_sensor = _thresholds_config['sensor_thresholds']

CRITICAL_THRESHOLDS = {
    'vibration': float(_sensor['vibration_mms']['critical_threshold']),
    'discharge_temp': float(_sensor['discharge_temp_f']['critical_threshold']),
    'discharge_pressure': float(_sensor['discharge_pressure_psi']['critical_threshold_high']),
}

WARNING_THRESHOLDS = {
    'vibration': float(_sensor['vibration_mms']['warning_threshold']),
    'discharge_temp': float(_sensor['discharge_temp_f']['warning_threshold']),
    'discharge_pressure': float(_sensor['discharge_pressure_psi']['warning_threshold_high']),
}

def calculate_rul(compressor_id, recent_data_4hr, recent_data_24hr):
    """
    Calculate Remaining Useful Life (RUL) in hours based on rate of change.

    Args:
        compressor_id: Compressor identifier
        recent_data_4hr: Latest 4hr aggregated reading (dict)
        recent_data_24hr: Latest 24hr aggregated reading (dict)

    Returns:
        dict: {
            'compressor_id': str,
            'predicted_rul_hours': float or None,
            'failure_probability': float (0-1),
            'confidence_score': float (0-1),
            'primary_risk_sensor': str or None,
            'model_version': str
        }
    """

    if not recent_data_4hr or not recent_data_24hr:
        return {
            'compressor_id': compressor_id,
            'predicted_rul_hours': None,
            'failure_probability': 0.0,
            'confidence_score': 0.0,
            'primary_risk_sensor': None,
            'model_version': 'heuristic-v1.0',
            'created_at': datetime.utcnow()
        }

    def _val(d, key, default=0):
        """Get value from dict, coercing None to default."""
        v = d.get(key)
        return default if v is None else float(v)

    # Calculate rate of change (4hr vs 24hr averages)
    vibration_current = _val(recent_data_4hr, 'vibration_avg')
    vibration_24h = _val(recent_data_24hr, 'vibration_avg')
    vibration_rate = max(0, (vibration_current - vibration_24h) / 20.0)  # per hour

    temp_current = _val(recent_data_4hr, 'discharge_temp_avg')
    temp_24h = _val(recent_data_24hr, 'discharge_temp_avg')
    temp_rate = max(0, (temp_current - temp_24h) / 20.0)

    pressure_current = _val(recent_data_4hr, 'discharge_pressure_avg')
    pressure_24h = _val(recent_data_24hr, 'discharge_pressure_avg')
    pressure_rate = abs((pressure_current - pressure_24h) / 20.0)

    # Determine primary risk sensor and RUL
    rul_hours = None
    primary_risk = None
    confidence = 0.0

    # Vibration-based RUL
    if vibration_rate > 0.05:  # Significant increase
        hours_to_critical = (CRITICAL_THRESHOLDS['vibration'] - vibration_current) / vibration_rate
        if 0 < hours_to_critical < 120:  # 0-120 hours (5 days)
            rul_hours = hours_to_critical
            primary_risk = 'vibration'
            confidence = min(0.95, 0.5 + (vibration_rate * 10))  # Higher rate = higher confidence

    # Temperature-based RUL
    if temp_rate > 0.5:
        hours_to_critical = (CRITICAL_THRESHOLDS['discharge_temp'] - temp_current) / temp_rate
        if 0 < hours_to_critical < 120:
            if rul_hours is None or hours_to_critical < rul_hours:
                rul_hours = hours_to_critical
                primary_risk = 'discharge_temp'
                confidence = min(0.90, 0.4 + (temp_rate * 0.5))

    # Pressure-based RUL (less predictive, lower confidence)
    if pressure_rate > 2.0:
        hours_to_critical = (CRITICAL_THRESHOLDS['discharge_pressure'] - pressure_current) / pressure_rate
        if 0 < hours_to_critical < 96:
            if rul_hours is None or hours_to_critical < rul_hours:
                rul_hours = hours_to_critical
                primary_risk = 'discharge_pressure'
                confidence = min(0.75, 0.3 + (pressure_rate * 0.05))

    # Calculate failure probability based on current metrics
    failure_prob = 0.0
    if vibration_current > WARNING_THRESHOLDS['vibration']:
        failure_prob = max(failure_prob, (vibration_current - WARNING_THRESHOLDS['vibration']) /
                           (CRITICAL_THRESHOLDS['vibration'] - WARNING_THRESHOLDS['vibration']))
    if temp_current > WARNING_THRESHOLDS['discharge_temp']:
        failure_prob = max(failure_prob, (temp_current - WARNING_THRESHOLDS['discharge_temp']) /
                           (CRITICAL_THRESHOLDS['discharge_temp'] - WARNING_THRESHOLDS['discharge_temp']))

    failure_prob = min(0.99, failure_prob)  # Cap at 99%

    return {
        'compressor_id': compressor_id,
        'predicted_rul_hours': round(rul_hours, 1) if rul_hours else None,
        'failure_probability': round(failure_prob, 3),
        'confidence_score': round(confidence, 3),
        'primary_risk_sensor': primary_risk,
        'model_version': 'heuristic-v1.0',
        'created_at': datetime.utcnow()
    }
