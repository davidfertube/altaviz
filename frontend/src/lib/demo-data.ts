import type {
  FleetHealthSummary,
  AlertHistory,
  ActiveAlert,
  SensorReadingAgg,
  CompressorMetadata,
  LatestReading,
  MlPrediction,
  MaintenanceEvent,
  DataQualityMetric,
  StationLocation,
  WindowType,
} from './types';
import type { ActionPlan } from './action-plan-types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3600_000).toISOString();
}

function daysAgo(d: number): string {
  return hoursAgo(d * 24);
}

// ---------------------------------------------------------------------------
// Stations
// ---------------------------------------------------------------------------

const STATIONS: StationLocation[] = [
  { station_id: 'STN-001', station_name: 'Permian Basin Alpha', latitude: 31.9973, longitude: -102.0779, region: 'permian', city: 'Midland', state: 'TX', created_at: daysAgo(365) },
  { station_id: 'STN-002', station_name: 'Eagle Ford Station Beta', latitude: 28.7041, longitude: -98.0683, region: 'eagle_ford', city: 'Carrizo Springs', state: 'TX', created_at: daysAgo(365) },
  { station_id: 'STN-003', station_name: 'Marcellus Station Gamma', latitude: 41.2033, longitude: -77.1945, region: 'marcellus', city: 'Williamsport', state: 'PA', created_at: daysAgo(365) },
  { station_id: 'STN-004', station_name: 'Haynesville Station Delta', latitude: 32.5252, longitude: -93.7502, region: 'haynesville', city: 'Shreveport', state: 'LA', created_at: daysAgo(365) },
];

// ---------------------------------------------------------------------------
// Pipelines (10 units)
// ---------------------------------------------------------------------------

interface PipelineProfile {
  compressor_id: string;
  model: string;
  horsepower: number;
  station_id: string;
  health: 'healthy' | 'warning' | 'critical';
  vibration: number;
  temp: number;
  pressure: number;
}

const PIPELINES: PipelineProfile[] = [
  { compressor_id: 'PIPE-001', model: 'Ajax DPC-2802', horsepower: 1380, station_id: 'STN-001', health: 'healthy', vibration: 2.8, temp: 195, pressure: 1050 },
  { compressor_id: 'PIPE-002', model: 'Ariel JGK/4', horsepower: 1600, station_id: 'STN-001', health: 'critical', vibration: 7.4, temp: 248, pressure: 1320 },
  { compressor_id: 'PIPE-003', model: 'Caterpillar G3516', horsepower: 1350, station_id: 'STN-001', health: 'warning', vibration: 5.8, temp: 232, pressure: 1180 },
  { compressor_id: 'PIPE-004', model: 'Waukesha L7044GSI', horsepower: 1480, station_id: 'STN-002', health: 'healthy', vibration: 3.1, temp: 198, pressure: 1020 },
  { compressor_id: 'PIPE-005', model: 'Ajax DPC-2802', horsepower: 1380, station_id: 'STN-002', health: 'healthy', vibration: 2.5, temp: 192, pressure: 1060 },
  { compressor_id: 'PIPE-006', model: 'Ariel JGK/4', horsepower: 1600, station_id: 'STN-002', health: 'warning', vibration: 5.2, temp: 228, pressure: 1200 },
  { compressor_id: 'PIPE-007', model: 'Caterpillar G3608', horsepower: 1500, station_id: 'STN-003', health: 'healthy', vibration: 3.0, temp: 200, pressure: 1080 },
  { compressor_id: 'PIPE-008', model: 'Waukesha L7044GSI', horsepower: 1480, station_id: 'STN-003', health: 'healthy', vibration: 2.9, temp: 196, pressure: 1040 },
  { compressor_id: 'PIPE-009', model: 'Ajax DPC-2802', horsepower: 1380, station_id: 'STN-004', health: 'healthy', vibration: 2.6, temp: 194, pressure: 1070 },
  { compressor_id: 'PIPE-010', model: 'Ariel JGK/4', horsepower: 1600, station_id: 'STN-004', health: 'healthy', vibration: 3.2, temp: 202, pressure: 1090 },
];

function stationFor(stationId: string) {
  return STATIONS.find((s) => s.station_id === stationId)!;
}

// ---------------------------------------------------------------------------
// Fleet Health
// ---------------------------------------------------------------------------

export function getDemoFleetHealth(): FleetHealthSummary[] {
  return PIPELINES.map((p) => {
    const stn = stationFor(p.station_id);
    return {
      compressor_id: p.compressor_id,
      model: p.model,
      station_id: p.station_id,
      station_name: stn.station_name,
      latitude: stn.latitude,
      longitude: stn.longitude,
      last_reading_time: hoursAgo(Math.random() * 0.25),
      vibration_max: p.vibration,
      discharge_temp_max: p.temp,
      discharge_pressure_mean: p.pressure,
      active_alert_count: p.health === 'critical' ? 3 : p.health === 'warning' ? 1 : 0,
      health_status: p.health,
    };
  });
}

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------

const DEMO_ALERTS: AlertHistory[] = [
  { id: 1, compressor_id: 'PIPE-002', alert_timestamp: hoursAgo(0.5), alert_type: 'threshold_critical', severity: 'critical', sensor_name: 'vibration_mms', sensor_value: 7.4, threshold_value: 8.0, message: 'Vibration approaching critical threshold — bearing wear suspected', acknowledged: false, acknowledged_by: null, acknowledged_at: null, resolved: false, resolved_at: null, created_at: hoursAgo(0.5) },
  { id: 2, compressor_id: 'PIPE-002', alert_timestamp: hoursAgo(1.2), alert_type: 'threshold_critical', severity: 'critical', sensor_name: 'discharge_temp_f', sensor_value: 248, threshold_value: 240, message: 'Discharge temperature exceeded warning threshold', acknowledged: true, acknowledged_by: 'operator@demo.com', acknowledged_at: hoursAgo(0.8), resolved: false, resolved_at: null, created_at: hoursAgo(1.2) },
  { id: 3, compressor_id: 'PIPE-002', alert_timestamp: hoursAgo(3), alert_type: 'anomaly', severity: 'critical', sensor_name: 'vibration_mms', sensor_value: 6.9, threshold_value: null, message: 'Anomaly detected: vibration pattern consistent with bearing degradation', acknowledged: true, acknowledged_by: 'operator@demo.com', acknowledged_at: hoursAgo(2.5), resolved: false, resolved_at: null, created_at: hoursAgo(3) },
  { id: 4, compressor_id: 'PIPE-003', alert_timestamp: hoursAgo(2), alert_type: 'threshold_warning', severity: 'warning', sensor_name: 'vibration_mms', sensor_value: 5.8, threshold_value: 6.0, message: 'Vibration elevated — monitor closely', acknowledged: false, acknowledged_by: null, acknowledged_at: null, resolved: false, resolved_at: null, created_at: hoursAgo(2) },
  { id: 5, compressor_id: 'PIPE-006', alert_timestamp: hoursAgo(4), alert_type: 'threshold_warning', severity: 'warning', sensor_name: 'discharge_temp_f', sensor_value: 228, threshold_value: 240, message: 'Temperature trending upward — cooling system check recommended', acknowledged: false, acknowledged_by: null, acknowledged_at: null, resolved: false, resolved_at: null, created_at: hoursAgo(4) },
  { id: 6, compressor_id: 'PIPE-003', alert_timestamp: hoursAgo(6), alert_type: 'prediction', severity: 'warning', sensor_name: null, sensor_value: null, threshold_value: null, message: 'ML model predicts potential issue within 72 hours — RUL dropping', acknowledged: true, acknowledged_by: 'admin@demo.com', acknowledged_at: hoursAgo(5), resolved: false, resolved_at: null, created_at: hoursAgo(6) },
  { id: 7, compressor_id: 'PIPE-002', alert_timestamp: hoursAgo(12), alert_type: 'threshold_warning', severity: 'warning', sensor_name: 'discharge_pressure_psi', sensor_value: 1320, threshold_value: 1300, message: 'Discharge pressure above normal range', acknowledged: true, acknowledged_by: 'operator@demo.com', acknowledged_at: hoursAgo(11), resolved: false, resolved_at: null, created_at: hoursAgo(12) },
  { id: 8, compressor_id: 'PIPE-006', alert_timestamp: hoursAgo(18), alert_type: 'threshold_warning', severity: 'warning', sensor_name: 'vibration_mms', sensor_value: 5.2, threshold_value: 6.0, message: 'Vibration slightly elevated', acknowledged: true, acknowledged_by: 'admin@demo.com', acknowledged_at: hoursAgo(16), resolved: true, resolved_at: hoursAgo(8), created_at: hoursAgo(18) },
];

export function getDemoActiveAlerts(): ActiveAlert[] {
  return DEMO_ALERTS.filter((a) => !a.resolved).map((a) => {
    const p = PIPELINES.find((p) => p.compressor_id === a.compressor_id)!;
    const stn = stationFor(p.station_id);
    return { ...a, model: p.model, station_id: p.station_id, station_name: stn.station_name };
  });
}

export function getDemoAlerts(params?: {
  status?: string;
  severity?: string;
  compressor?: string;
  limit?: number;
  offset?: number;
}): AlertHistory[] {
  let filtered = [...DEMO_ALERTS];
  if (params?.status === 'active') filtered = filtered.filter((a) => !a.resolved);
  if (params?.status === 'resolved') filtered = filtered.filter((a) => a.resolved);
  if (params?.severity) filtered = filtered.filter((a) => a.severity === params.severity);
  if (params?.compressor) filtered = filtered.filter((a) => a.compressor_id === params.compressor);
  const offset = params?.offset ?? 0;
  const limit = params?.limit ?? 50;
  return filtered.slice(offset, offset + limit);
}

// ---------------------------------------------------------------------------
// Pipeline Detail
// ---------------------------------------------------------------------------

export function getDemoPipelineDetail(id: string): {
  metadata: CompressorMetadata;
  latestReading: LatestReading | null;
  prediction: MlPrediction | null;
} | null {
  const p = PIPELINES.find((p) => p.compressor_id === id);
  if (!p) return null;
  const stn = stationFor(p.station_id);

  const metadata: CompressorMetadata & { station_name: string } = {
    compressor_id: p.compressor_id,
    model: p.model,
    horsepower: p.horsepower,
    install_date: daysAgo(800),
    station_id: p.station_id,
    latitude: stn.latitude,
    longitude: stn.longitude,
    created_at: daysAgo(800),
    updated_at: hoursAgo(1),
    station_name: stn.station_name,
  };

  const latestReading: LatestReading = {
    compressor_id: p.compressor_id,
    agg_timestamp: hoursAgo(0.1),
    vibration_mean: p.vibration * 0.95,
    vibration_max: p.vibration,
    discharge_temp_mean: p.temp - 3,
    discharge_temp_max: p.temp,
    discharge_pressure_mean: p.pressure,
    suction_pressure_mean: 62,
    pressure_delta_mean: p.pressure - 62,
    horsepower_mean: p.horsepower * 0.85,
    gas_flow_mean: 9500,
  };

  const prediction: MlPrediction = {
    id: 1,
    compressor_id: p.compressor_id,
    prediction_timestamp: hoursAgo(0.5),
    rul_days: p.health === 'critical' ? 12 : p.health === 'warning' ? 45 : 180,
    failure_probability: p.health === 'critical' ? 0.78 : p.health === 'warning' ? 0.35 : 0.05,
    confidence_score: 0.87,
    model_version: 'v2.1.0',
    features_used: { vibration_trend: true, temp_drift: true, pressure_delta: true },
    created_at: hoursAgo(0.5),
  };

  return { metadata, latestReading, prediction };
}

// ---------------------------------------------------------------------------
// Pipeline Readings (time series)
// ---------------------------------------------------------------------------

export function getDemoPipelineReadings(
  id: string,
  window: WindowType = '1hr',
  hours: number = 24
): SensorReadingAgg[] {
  const p = PIPELINES.find((p) => p.compressor_id === id);
  if (!p) return [];

  const intervalHours = window === '1hr' ? 1 : window === '4hr' ? 4 : 24;
  const count = Math.ceil(hours / intervalHours);
  const readings: SensorReadingAgg[] = [];

  for (let i = count - 1; i >= 0; i--) {
    const t = i * intervalHours;
    // For critical/warning pipelines, simulate an upward trend in vibration
    const trendFactor = p.health !== 'healthy' ? 1 + (count - i) * 0.02 : 1;
    const jitter = () => (Math.random() - 0.5) * 0.4;

    readings.push({
      id: count - i,
      compressor_id: p.compressor_id,
      agg_timestamp: hoursAgo(t),
      window_type: window,
      vibration_mean: +(p.vibration * 0.9 * trendFactor + jitter()).toFixed(2),
      vibration_std: +(0.3 + Math.random() * 0.2).toFixed(2),
      vibration_max: +(p.vibration * trendFactor + jitter()).toFixed(2),
      vibration_min: +(p.vibration * 0.7 * trendFactor + jitter()).toFixed(2),
      discharge_temp_mean: +(p.temp - 3 + jitter() * 5).toFixed(1),
      discharge_temp_std: +(1.5 + Math.random()).toFixed(2),
      discharge_temp_max: +(p.temp + jitter() * 3).toFixed(1),
      discharge_temp_rate_of_change: +(p.health !== 'healthy' ? 0.3 + Math.random() * 0.2 : -0.05 + Math.random() * 0.1).toFixed(3),
      suction_pressure_mean: +(62 + jitter() * 4).toFixed(1),
      suction_pressure_std: +(1.2 + Math.random() * 0.5).toFixed(2),
      suction_pressure_min: +(58 + jitter() * 3).toFixed(1),
      discharge_pressure_mean: +(p.pressure + jitter() * 10).toFixed(1),
      discharge_pressure_std: +(5 + Math.random() * 3).toFixed(2),
      discharge_pressure_max: +(p.pressure + 15 + jitter() * 5).toFixed(1),
      pressure_delta_mean: +(p.pressure - 62 + jitter() * 10).toFixed(1),
      horsepower_mean: +(p.horsepower * 0.85 + jitter() * 20).toFixed(1),
      horsepower_std: +(15 + Math.random() * 10).toFixed(2),
      gas_flow_mean: +(9500 + jitter() * 500).toFixed(0),
      reading_count: window === '1hr' ? 12 : window === '4hr' ? 48 : 288,
      missing_readings: Math.floor(Math.random() * 2),
      created_at: hoursAgo(t),
    });
  }

  return readings;
}

// ---------------------------------------------------------------------------
// Pipeline Alerts (for detail view)
// ---------------------------------------------------------------------------

export function getDemoPipelineAlerts(id: string): AlertHistory[] {
  return DEMO_ALERTS.filter((a) => a.compressor_id === id);
}

// ---------------------------------------------------------------------------
// Maintenance Events
// ---------------------------------------------------------------------------

const DEMO_MAINTENANCE: MaintenanceEvent[] = [
  { id: 1, compressor_id: 'PIPE-002', event_date: daysAgo(14), event_type: 'inspection', description: 'Routine quarterly inspection — vibration slightly elevated', downtime_hours: 2, severity: 'low', cost_usd: 450, created_at: daysAgo(14) },
  { id: 2, compressor_id: 'PIPE-002', event_date: daysAgo(90), event_type: 'scheduled', description: 'Bearing lubrication and alignment check', downtime_hours: 4, severity: 'medium', cost_usd: 1200, created_at: daysAgo(90) },
  { id: 3, compressor_id: 'PIPE-003', event_date: daysAgo(30), event_type: 'inspection', description: 'Monthly vibration analysis', downtime_hours: 1, severity: 'low', cost_usd: 300, created_at: daysAgo(30) },
  { id: 4, compressor_id: 'PIPE-006', event_date: daysAgo(45), event_type: 'unscheduled', description: 'Cooling fan motor replacement', downtime_hours: 6, severity: 'high', cost_usd: 3800, created_at: daysAgo(45) },
  { id: 5, compressor_id: 'PIPE-001', event_date: daysAgo(60), event_type: 'scheduled', description: 'Semi-annual valve service', downtime_hours: 8, severity: 'medium', cost_usd: 2100, created_at: daysAgo(60) },
  { id: 6, compressor_id: 'PIPE-005', event_date: daysAgo(120), event_type: 'scheduled', description: 'Annual overhaul and emissions test', downtime_hours: 24, severity: 'medium', cost_usd: 8500, created_at: daysAgo(120) },
];

export function getDemoPipelineMaintenance(compressorId?: string): MaintenanceEvent[] {
  if (compressorId) return DEMO_MAINTENANCE.filter((m) => m.compressor_id === compressorId);
  return DEMO_MAINTENANCE;
}

// ---------------------------------------------------------------------------
// Data Quality
// ---------------------------------------------------------------------------

export function getDemoDataQuality(): DataQualityMetric[] {
  const types: DataQualityMetric['metric_type'][] = ['freshness', 'completeness', 'consistency', 'accuracy'];
  const values = [0.97, 0.95, 0.99, 0.94];
  return types.map((t, i) => ({
    id: i + 1,
    metric_timestamp: hoursAgo(0.5),
    compressor_id: null,
    metric_type: t,
    metric_value: values[i],
    pass_threshold: true,
    details: null,
    created_at: hoursAgo(0.5),
  }));
}

// ---------------------------------------------------------------------------
// Stations
// ---------------------------------------------------------------------------

export function getDemoStations(): (StationLocation & { compressor_count: number })[] {
  return STATIONS.map((s) => ({
    ...s,
    compressor_count: PIPELINES.filter((p) => p.station_id === s.station_id).length,
  }));
}

// ---------------------------------------------------------------------------
// Action Plans (Field Operator Action Center)
// ---------------------------------------------------------------------------

const ACTION_PLANS: ActionPlan[] = [
  {
    compressorId: 'PIPE-002',
    model: 'Ariel JGK/4',
    stationName: 'Permian Basin Alpha',
    stationId: 'STN-001',
    status: 'critical',
    headline: 'Bearing Failure Detected — Immediate Action Required',
    diagnosis:
      'Main shaft bearing on PIPE-002 is showing exponential vibration increase (7.4 mm/s, threshold 6.0). Discharge temperature elevated to 248°F indicates friction-related heating. ML anomaly model confidence 0.91. At current degradation rate, bearing seizure expected within 48-72 hours without intervention.',
    confidence: 0.91,
    estimatedHours: 12,
    estimatedCost: 14500,
    createdAt: hoursAgo(0.5),
    safetyWarnings: [
      { level: 'danger', message: 'Do NOT approach while unit is running at elevated vibration levels. Risk of catastrophic bearing failure and ejected debris.' },
      { level: 'danger', message: 'Hot surface warning — discharge temperature at 248°F. Wear heat-resistant gloves.' },
      { level: 'caution', message: 'Wear hearing protection — vibration levels exceed 7 mm/s, noise above 95 dB likely.' },
      { level: 'info', message: 'LOTO (Lock Out / Tag Out) required before any physical inspection.' },
    ],
    actionSteps: [
      { id: 'step-1', order: 1, instruction: 'Acknowledge this alert in the system', detail: 'Confirms you are the responding operator. Timestamps your response for audit trail.', priority: 'immediate', requiresShutdown: false },
      { id: 'step-2', order: 2, instruction: 'Notify maintenance supervisor immediately', detail: 'Call shift lead or use Teams to report bearing failure on PIPE-002 at Permian Basin Alpha. Estimated repair cost exceeds $10K — requires supervisor approval.', priority: 'immediate', requiresShutdown: false },
      { id: 'step-3', order: 3, instruction: 'Prepare for controlled shutdown within 2 hours', detail: 'Coordinate with operations to reroute gas flow. Notify downstream stations of reduced capacity.', priority: 'immediate', requiresShutdown: true },
      { id: 'step-4', order: 4, instruction: 'Isolate unit from gas flow', detail: 'Close suction and discharge valves. Bleed pressure to 0 PSI. Verify with pressure gauge before approaching.', priority: 'immediate', requiresShutdown: true },
      { id: 'step-5', order: 5, instruction: 'Perform bearing inspection per SOP-BRG-001', detail: 'Remove access panel, inspect main shaft bearings for scoring, discoloration, or metal debris. Photograph findings.', priority: 'immediate', requiresShutdown: true },
      { id: 'step-6', order: 6, instruction: 'Replace main shaft bearings if scoring detected', detail: 'Use bearing puller set. Install new P/N AJ-BRG-JGK4-MS bearings. Torque to spec (185 ft-lb). Pack with Shell Alvania EP-2 grease.', priority: 'immediate', requiresShutdown: true },
      { id: 'step-7', order: 7, instruction: 'Verify alignment and run test at 50% load', detail: 'Check shaft alignment with dial indicator (tolerance ±0.002"). Start unit at 50% load for 30 min, monitor vibration. Target < 3.5 mm/s.', priority: 'immediate', requiresShutdown: false },
    ],
    partsAndTools: [
      { name: 'Main shaft bearing set', partNumber: 'AJ-BRG-JGK4-MS', quantity: 2, type: 'part', estimatedCost: 4200 },
      { name: 'Bearing seal kit', partNumber: 'AJ-SEAL-JGK4', quantity: 1, type: 'part', estimatedCost: 680 },
      { name: 'Shell Alvania EP-2 grease (5 gal)', partNumber: null, quantity: 1, type: 'part', estimatedCost: 120 },
      { name: 'Bearing puller set', partNumber: null, quantity: 1, type: 'tool', estimatedCost: null },
      { name: 'Torque wrench (100-250 ft-lb)', partNumber: null, quantity: 1, type: 'tool', estimatedCost: null },
      { name: 'Dial indicator with magnetic base', partNumber: null, quantity: 1, type: 'tool', estimatedCost: null },
      { name: 'Vibration analyzer', partNumber: null, quantity: 1, type: 'tool', estimatedCost: null },
    ],
    routing: {
      primary: 'create_work_order',
      label: 'Create Emergency Work Order',
      description: 'This issue requires a formal work order. Estimated cost ($14,500) exceeds $10K threshold — supervisor approval will be required before work begins.',
    },
    similarFixes: [
      { compressorId: 'COMP-1847', model: 'Ariel JGK/4', date: '2025-11-14', issue: 'Main bearing vibration spike to 7.8 mm/s', resolution: 'Bearing replacement + shaft realignment. Root cause: lubrication system partial blockage.', outcome: 'successful' },
      { compressorId: 'COMP-3201', model: 'Ariel JGK/4', date: '2025-08-22', issue: 'Bearing temperature rise with vibration at 6.9 mm/s', resolution: 'Bearing replacement. Also found coupling misalignment during inspection.', outcome: 'successful' },
      { compressorId: 'COMP-0592', model: 'Ariel JGK/4', date: '2025-06-03', issue: 'Vibration at 7.1 mm/s, initial diagnosis: bearing wear', resolution: 'Bearing replaced but vibration returned within 2 weeks. Actual root cause was crankshaft wear.', outcome: 'partial' },
    ],
    teamsNotification: {
      title: 'Critical Alert: PIPE-002 Bearing Failure',
      severity: 'critical',
      compressorId: 'PIPE-002',
      stationName: 'Permian Basin Alpha',
      message: 'Vibration at 7.4 mm/s (threshold: 6.0). Discharge temp 248°F. ML confidence 91%. Estimated 48-72 hrs to bearing seizure. Immediate inspection required.',
      sentAt: hoursAgo(0.5),
      acknowledged: false,
    },
  },
  {
    compressorId: 'PIPE-003',
    model: 'Caterpillar G3516',
    stationName: 'Permian Basin Alpha',
    stationId: 'STN-001',
    status: 'warning',
    headline: 'Cooling System Degradation — Schedule Maintenance',
    diagnosis:
      'PIPE-003 discharge temperature trending upward over the past 72 hours (now 232°F, warning threshold 240°F). Pattern consistent with cooling system degradation — likely fouled heat exchanger or reduced coolant flow. ML temperature drift model projects warning threshold breach in 5-7 days at current rate.',
    confidence: 0.78,
    estimatedHours: 4,
    estimatedCost: 2800,
    createdAt: hoursAgo(3),
    safetyWarnings: [
      { level: 'caution', message: 'Monitor temperature remotely before approaching. If discharge temp exceeds 240°F, do not perform hands-on inspection.' },
      { level: 'info', message: 'Unit is safe for routine visual inspection at current temperature levels.' },
    ],
    actionSteps: [
      { id: 'step-1', order: 1, instruction: 'Log current readings in shift report', detail: 'Record discharge temp (232°F), vibration (5.8 mm/s), and pressure (1180 PSI). Note upward temperature trend.', priority: 'immediate', requiresShutdown: false },
      { id: 'step-2', order: 2, instruction: 'Inspect cooling fan operation', detail: 'Visual check that cooling fan is running at correct RPM. Listen for unusual bearing noise. Check belt tension.', priority: 'next_shift', requiresShutdown: false },
      { id: 'step-3', order: 3, instruction: 'Check coolant levels and condition', detail: 'Inspect coolant reservoir level. Check for discoloration or contamination. Top off if below minimum mark.', priority: 'next_shift', requiresShutdown: false },
      { id: 'step-4', order: 4, instruction: 'Clean heat exchanger fins', detail: 'Use compressed air to blow out debris from heat exchanger fins. Check for bent or damaged fins that restrict airflow.', priority: 'next_shift', requiresShutdown: true },
      { id: 'step-5', order: 5, instruction: 'Schedule full cooling system service', detail: 'If temperature continues trending up after cleaning, escalate for full coolant flush and heat exchanger inspection during next maintenance window.', priority: 'next_maintenance_window', requiresShutdown: true },
    ],
    partsAndTools: [
      { name: 'Coolant (CAT ELC, 5 gal)', partNumber: 'CAT-ELC-5GAL', quantity: 1, type: 'part', estimatedCost: 85 },
      { name: 'Air filter element', partNumber: 'CAT-AF-G3516', quantity: 1, type: 'part', estimatedCost: 120 },
      { name: 'Fan belt', partNumber: 'CAT-BELT-G3516-FAN', quantity: 1, type: 'part', estimatedCost: 45 },
      { name: 'Compressed air (portable)', partNumber: null, quantity: 1, type: 'tool', estimatedCost: null },
      { name: 'IR temperature gun', partNumber: null, quantity: 1, type: 'tool', estimatedCost: null },
    ],
    routing: {
      primary: 'escalate_supervisor',
      label: 'Escalate to Maintenance Supervisor',
      description: 'Temperature trend requires supervisor awareness for scheduling. Not yet urgent — target next-shift maintenance window.',
    },
    similarFixes: [
      { compressorId: 'COMP-2104', model: 'Caterpillar G3516', date: '2025-12-08', issue: 'Gradual temp rise to 238°F over 5 days', resolution: 'Heat exchanger fin cleaning + coolant flush. Root cause: cotton-wood seed debris blocking airflow.', outcome: 'successful' },
      { compressorId: 'COMP-0873', model: 'Caterpillar G3516', date: '2025-09-15', issue: 'Discharge temp reached 241°F', resolution: 'Replaced coolant pump impeller. Pump was cavitating due to worn seal.', outcome: 'successful' },
    ],
    teamsNotification: {
      title: 'Warning: PIPE-003 Temperature Trending Up',
      severity: 'warning',
      compressorId: 'PIPE-003',
      stationName: 'Permian Basin Alpha',
      message: 'Discharge temp at 232°F, trending upward over 72 hours. Warning threshold (240°F) projected in 5-7 days. Cooling system inspection recommended.',
      sentAt: hoursAgo(3),
      acknowledged: true,
    },
  },
  {
    compressorId: 'PIPE-006',
    model: 'Ariel JGK/4',
    stationName: 'Eagle Ford Station Beta',
    stationId: 'STN-002',
    status: 'monitoring',
    headline: 'Minor Vibration Increase — Continue Monitoring',
    diagnosis:
      'PIPE-006 vibration has increased from baseline 3.2 mm/s to 5.2 mm/s over the past 2 weeks. Still within warning range but above normal band (1.5-4.5 mm/s). No correlated temperature or pressure anomalies. ML models show low failure probability (12%). Likely early-stage wear that should be tracked.',
    confidence: 0.65,
    estimatedHours: null,
    estimatedCost: null,
    createdAt: hoursAgo(8),
    safetyWarnings: [
      { level: 'info', message: 'No immediate safety concerns. Standard PPE required for site visit.' },
    ],
    actionSteps: [
      { id: 'step-1', order: 1, instruction: 'Review vibration trend data weekly', detail: 'Check the 7-day trend chart for PIPE-006. Flag if vibration exceeds 6.0 mm/s or shows accelerating increase.', priority: 'monitor', requiresShutdown: false },
      { id: 'step-2', order: 2, instruction: 'Add to next scheduled inspection', detail: 'Include PIPE-006 bearing inspection in the next planned maintenance round for Eagle Ford Station Beta.', priority: 'next_maintenance_window', requiresShutdown: false },
      { id: 'step-3', order: 3, instruction: 'Compare with fleet baseline', detail: 'Check if other Ariel JGK/4 units at this station show similar vibration patterns. Could indicate shared environmental factor.', priority: 'monitor', requiresShutdown: false },
    ],
    partsAndTools: [],
    routing: {
      primary: 'monitor_no_action',
      label: 'No Immediate Action Required',
      description: 'Continue standard monitoring. This unit will be automatically flagged if conditions worsen.',
    },
    similarFixes: [
      { compressorId: 'COMP-4412', model: 'Ariel JGK/4', date: '2026-01-20', issue: 'Gradual vibration increase from 3.0 to 5.5 mm/s over 3 weeks', resolution: 'Monitored for 2 additional weeks. Vibration stabilized at 5.3 mm/s. Bearing replaced during scheduled maintenance.', outcome: 'successful' },
    ],
    teamsNotification: {
      title: 'Info: PIPE-006 Vibration Above Normal',
      severity: 'info',
      compressorId: 'PIPE-006',
      stationName: 'Eagle Ford Station Beta',
      message: 'Vibration at 5.2 mm/s (normal range: 1.5-4.5). Low failure probability (12%). Added to monitoring watchlist.',
      sentAt: hoursAgo(8),
      acknowledged: true,
    },
  },
];

export function getDemoActionPlans(): ActionPlan[] {
  return ACTION_PLANS;
}

export function getDemoActionPlan(compressorId: string): ActionPlan | null {
  return ACTION_PLANS.find((p) => p.compressorId === compressorId) ?? null;
}
