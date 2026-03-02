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

// === AGENT TABLES ===

export type WorkOrderStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'verified'
  | 'cancelled';

export type WorkOrderCategory =
  | 'mechanical_repair'
  | 'inspection'
  | 'preventive'
  | 'calibration'
  | 'emissions_compliance'
  | 'optimization'
  | 'emergency_shutdown';

export type WorkOrderPriority = 'emergency' | 'urgent' | 'high' | 'medium' | 'low';

export interface WorkOrder {
  id: string;
  organization_id: string;
  compressor_id: string;
  title: string;
  description: string | null;
  priority: WorkOrderPriority;
  category: WorkOrderCategory;
  status: WorkOrderStatus;
  source: 'agent' | 'manual' | 'investigation' | 'optimization';
  source_id: string | null;
  assigned_to: string | null;
  estimated_hours: number | null;
  estimated_cost: number | null;
  actual_hours: number | null;
  actual_cost: number | null;
  parts_needed: { part_name: string; part_number?: string; quantity: number; estimated_cost?: number }[];
  safety_considerations: string[];
  requires_shutdown: boolean;
  scheduled_date: string | null;
  approved_by: string | null;
  approved_at: string | null;
  completed_at: string | null;
  completion_notes: string | null;
  agent_session_id: string | null;
  agent_confidence: number | null;
  agent_reasoning: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkOrderTransition {
  id: number;
  work_order_id: string;
  from_status: WorkOrderStatus | null;
  to_status: WorkOrderStatus;
  changed_by: string | null;
  reason: string | null;
  created_at: string;
}

export type InvestigationSeverity = 'healthy' | 'early_warning' | 'warning' | 'critical' | 'emergency';

export interface EvidenceStep {
  step_number: number;
  finding: string;
  source: string;
  confidence: number;
  supports_hypothesis: boolean;
}

export interface SimilarIncident {
  compressor_id: string;
  date: string;
  failure_mode: string;
  similarity_score: number;
  outcome: string;
}

export interface KnowledgeSource {
  doc_id: string;
  title: string;
  relevance_score: number;
  excerpt: string;
}

export interface InvestigationReport {
  id: string;
  organization_id: string;
  compressor_id: string;
  root_cause: string;
  failure_mode: string | null;
  severity: InvestigationSeverity;
  confidence: number;
  evidence_chain: EvidenceStep[];
  contributing_factors: string[];
  similar_incidents: SimilarIncident[];
  recommended_actions: { action: string; priority: string; estimated_downtime_hours?: number; rationale: string }[];
  estimated_rul_hours: number | null;
  estimated_repair_cost: number | null;
  knowledge_sources: KnowledgeSource[];
  agent_session_id: string | null;
  feedback_rating: number | null;
  feedback_correct: boolean | null;
  feedback_text: string | null;
  actual_root_cause: string | null;
  created_at: string;
  updated_at: string;
}

export type RecommendationStatus = 'active' | 'accepted' | 'dismissed' | 'implemented' | 'expired';

export interface OptimizationRecommendation {
  id: string;
  organization_id: string;
  rec_type: 'load_balance' | 'deferred_maintenance' | 'emissions_reduction' | 'efficiency_improvement' | 'preventive_schedule' | 'fleet_reconfig';
  scope: 'compressor' | 'station' | 'basin' | 'fleet';
  target_ids: string[];
  title: string;
  description: string | null;
  priority: 'critical' | 'high' | 'medium' | 'low' | 'informational';
  estimated_savings_usd: number | null;
  estimated_emissions_reduction_tonnes: number | null;
  estimated_uptime_improvement_pct: number | null;
  scenario_data: Record<string, unknown> | null;
  confidence: number;
  status: RecommendationStatus;
  work_order_id: string | null;
  agent_session_id: string | null;
  created_at: string;
  updated_at: string;
}

export type AgentType = 'diagnostics' | 'investigation' | 'work_order' | 'optimization';

export interface AgentSession {
  session_id: string;
  organization_id: string;
  user_id: string | null;
  agent_type: AgentType;
  compressor_id: string | null;
  trigger_type: string | null;
  trigger_id: string | null;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  result_type: string | null;
  result_id: string | null;
  total_tokens: number;
  total_tool_calls: number;
  duration_seconds: number;
  created_at: string;
  completed_at: string | null;
}

export interface FleetSnapshot {
  id: string;
  organization_id: string;
  snapshot_type: 'hourly' | 'daily' | 'weekly';
  total_compressors: number;
  health_distribution: Record<string, number>;
  fleet_health_score: number;
  total_emissions_tonnes: number | null;
  avg_rul_days: number | null;
  basin_metrics: Record<string, unknown> | null;
  top_risks: Record<string, unknown>[];
  created_at: string;
}

// === AGENT API RESPONSE TYPES ===

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface WhatIfResult {
  scenario_type: string;
  target_ids: string[];
  baseline: Record<string, unknown>;
  projected: Record<string, unknown>;
  risk_assessment: string;
  recommendation: string;
  confidence: number;
}
