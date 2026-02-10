// ============================================
// TypeScript interfaces for Altaviz database
// Maps to infrastructure/sql/schema.sql
// ============================================

// === DIMENSION TABLES ===

export interface StationLocation {
  station_id: string;
  station_name: string;
  latitude: number;
  longitude: number;
  region: string;
  city: string;
  state: string;
  created_at: string;
}

export interface CompressorMetadata {
  compressor_id: string;
  model: string;
  horsepower: number;
  install_date: string;
  station_id: string;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
}

// === FACT TABLES ===

export interface SensorReadingAgg {
  id: number;
  compressor_id: string;
  agg_timestamp: string;
  window_type: WindowType;
  vibration_mean: number | null;
  vibration_std: number | null;
  vibration_max: number | null;
  vibration_min: number | null;
  discharge_temp_mean: number | null;
  discharge_temp_std: number | null;
  discharge_temp_max: number | null;
  discharge_temp_rate_of_change: number | null;
  suction_pressure_mean: number | null;
  suction_pressure_std: number | null;
  suction_pressure_min: number | null;
  discharge_pressure_mean: number | null;
  discharge_pressure_std: number | null;
  discharge_pressure_max: number | null;
  pressure_delta_mean: number | null;
  horsepower_mean: number | null;
  horsepower_std: number | null;
  gas_flow_mean: number | null;
  reading_count: number;
  missing_readings: number;
  created_at: string;
}

export interface AlertHistory {
  id: number;
  compressor_id: string;
  alert_timestamp: string;
  alert_type: 'threshold_warning' | 'threshold_critical' | 'anomaly' | 'prediction';
  severity: Severity;
  sensor_name: string | null;
  sensor_value: number | null;
  threshold_value: number | null;
  message: string | null;
  acknowledged: boolean;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}

export interface MaintenanceEvent {
  id: number;
  compressor_id: string;
  event_date: string;
  event_type: 'scheduled' | 'unscheduled' | 'inspection' | 'failure';
  description: string | null;
  downtime_hours: number | null;
  severity: 'low' | 'medium' | 'high' | 'critical' | null;
  cost_usd: number | null;
  created_at: string;
}

export interface DataQualityMetric {
  id: number;
  metric_timestamp: string;
  compressor_id: string | null;
  metric_type: 'freshness' | 'completeness' | 'consistency' | 'accuracy';
  metric_value: number | null;
  pass_threshold: boolean | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface MlPrediction {
  id: number;
  compressor_id: string;
  prediction_timestamp: string;
  rul_days: number | null;
  failure_probability: number | null;
  confidence_score: number | null;
  model_version: string | null;
  features_used: Record<string, unknown> | null;
  created_at: string;
}

// === VIEWS ===

export interface FleetHealthSummary {
  compressor_id: string;
  model: string;
  station_id: string;
  station_name: string;
  latitude: number | null;
  longitude: number | null;
  last_reading_time: string | null;
  vibration_max: number | null;
  discharge_temp_max: number | null;
  discharge_pressure_mean: number | null;
  active_alert_count: number;
  health_status: HealthStatus;
}

export interface LatestReading {
  compressor_id: string;
  agg_timestamp: string;
  vibration_mean: number | null;
  vibration_max: number | null;
  discharge_temp_mean: number | null;
  discharge_temp_max: number | null;
  discharge_pressure_mean: number | null;
  suction_pressure_mean: number | null;
  pressure_delta_mean: number | null;
  horsepower_mean: number | null;
  gas_flow_mean: number | null;
}

export interface ActiveAlert extends AlertHistory {
  model: string;
  station_id: string;
  station_name: string;
}

// === AUTH & BILLING TABLES ===

export interface Organization {
  id: string;
  name: string;
  slug: string;
  stripe_customer_id: string | null;
  subscription_tier: 'free' | 'pro' | 'enterprise';
  subscription_status: 'active' | 'past_due' | 'canceled' | 'trialing';
  max_compressors: number;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  organization_id: string;
  email: string;
  name: string | null;
  azure_ad_id: string | null;
  role: 'owner' | 'admin' | 'operator' | 'viewer';
  avatar_url: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BillingEvent {
  id: string;
  organization_id: string;
  stripe_event_id: string | null;
  event_type: string;
  amount_cents: number | null;
  currency: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// === UI TYPES ===

export type HealthStatus = 'healthy' | 'warning' | 'critical';
export type Severity = 'warning' | 'critical';
export type WindowType = '1hr' | '4hr' | '24hr';
export type TimeRange = '1h' | '4h' | '24h' | '7d';
