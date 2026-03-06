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
