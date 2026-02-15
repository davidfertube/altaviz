/**
 * Demo data for /demo route — no auth, no database required.
 * Pre-seeded data that simulates a live fleet of 10 pipelines
 * across 4 Texas stations with realistic sensor readings.
 */

import type {
  FleetHealthSummary,
  ActiveAlert,
  SensorReadingAgg,
} from './types';

// === Fleet Health Data ===

export const DEMO_FLEET: FleetHealthSummary[] = [
  {
    compressor_id: 'PL-001',
    model: '24in Transmission',
    station_id: 'STN-001',
    station_name: 'Permian Basin Station',
    latitude: 31.9686,
    longitude: -102.0779,
    last_reading_time: new Date().toISOString(),
    vibration_max: 3.2,
    discharge_temp_max: 205,
    discharge_pressure_mean: 1050,
    active_alert_count: 0,
    health_status: 'healthy',
  },
  {
    compressor_id: 'PL-002',
    model: '24in Transmission',
    station_id: 'STN-001',
    station_name: 'Permian Basin Station',
    latitude: 31.9686,
    longitude: -102.0779,
    last_reading_time: new Date().toISOString(),
    vibration_max: 3.8,
    discharge_temp_max: 212,
    discharge_pressure_mean: 1080,
    active_alert_count: 0,
    health_status: 'healthy',
  },
  {
    compressor_id: 'PL-003',
    model: '20in Lateral',
    station_id: 'STN-002',
    station_name: 'Eagle Ford Station',
    latitude: 28.7041,
    longitude: -98.0685,
    last_reading_time: new Date().toISOString(),
    vibration_max: 7.8,
    discharge_temp_max: 248,
    discharge_pressure_mean: 1290,
    active_alert_count: 3,
    health_status: 'critical',
  },
  {
    compressor_id: 'PL-004',
    model: '16in Gathering',
    station_id: 'STN-002',
    station_name: 'Eagle Ford Station',
    latitude: 28.7041,
    longitude: -98.0685,
    last_reading_time: new Date().toISOString(),
    vibration_max: 2.9,
    discharge_temp_max: 198,
    discharge_pressure_mean: 1020,
    active_alert_count: 0,
    health_status: 'healthy',
  },
  {
    compressor_id: 'PL-005',
    model: '30in Mainline',
    station_id: 'STN-003',
    station_name: 'Corpus Christi Station',
    latitude: 27.8006,
    longitude: -97.3964,
    last_reading_time: new Date().toISOString(),
    vibration_max: 4.1,
    discharge_temp_max: 218,
    discharge_pressure_mean: 1100,
    active_alert_count: 0,
    health_status: 'healthy',
  },
  {
    compressor_id: 'PL-006',
    model: '24in Transmission',
    station_id: 'STN-003',
    station_name: 'Corpus Christi Station',
    latitude: 27.8006,
    longitude: -97.3964,
    last_reading_time: new Date().toISOString(),
    vibration_max: 3.5,
    discharge_temp_max: 208,
    discharge_pressure_mean: 1060,
    active_alert_count: 0,
    health_status: 'healthy',
  },
  {
    compressor_id: 'PL-007',
    model: '20in Lateral',
    station_id: 'STN-003',
    station_name: 'Corpus Christi Station',
    latitude: 27.8006,
    longitude: -97.3964,
    last_reading_time: new Date().toISOString(),
    vibration_max: 6.4,
    discharge_temp_max: 235,
    discharge_pressure_mean: 1220,
    active_alert_count: 2,
    health_status: 'warning',
  },
  {
    compressor_id: 'PL-008',
    model: '16in Gathering',
    station_id: 'STN-004',
    station_name: 'Houston Hub Station',
    latitude: 29.7604,
    longitude: -95.3698,
    last_reading_time: new Date().toISOString(),
    vibration_max: 3.0,
    discharge_temp_max: 195,
    discharge_pressure_mean: 1010,
    active_alert_count: 0,
    health_status: 'healthy',
  },
  {
    compressor_id: 'PL-009',
    model: '30in Mainline',
    station_id: 'STN-004',
    station_name: 'Houston Hub Station',
    latitude: 29.7604,
    longitude: -95.3698,
    last_reading_time: new Date().toISOString(),
    vibration_max: 2.7,
    discharge_temp_max: 192,
    discharge_pressure_mean: 990,
    active_alert_count: 0,
    health_status: 'healthy',
  },
  {
    compressor_id: 'PL-010',
    model: '24in Transmission',
    station_id: 'STN-004',
    station_name: 'Houston Hub Station',
    latitude: 29.7604,
    longitude: -95.3698,
    last_reading_time: new Date().toISOString(),
    vibration_max: 3.3,
    discharge_temp_max: 204,
    discharge_pressure_mean: 1045,
    active_alert_count: 0,
    health_status: 'healthy',
  },
];

// === Active Alerts ===

export const DEMO_ALERTS: ActiveAlert[] = [
  {
    id: 1001,
    compressor_id: 'PL-003',
    alert_timestamp: new Date(Date.now() - 2 * 3600_000).toISOString(),
    alert_type: 'threshold_critical',
    severity: 'critical',
    sensor_name: 'vibration_mms',
    sensor_value: 7.8,
    threshold_value: 8.0,
    message: 'Vibration approaching critical threshold — possible wall thinning detected',
    acknowledged: false,
    acknowledged_by: null,
    acknowledged_at: null,
    resolved: false,
    resolved_at: null,
    created_at: new Date(Date.now() - 2 * 3600_000).toISOString(),
    model: '20in Lateral',
    station_id: 'STN-002',
    station_name: 'Eagle Ford Station',
  },
  {
    id: 1002,
    compressor_id: 'PL-003',
    alert_timestamp: new Date(Date.now() - 1.5 * 3600_000).toISOString(),
    alert_type: 'threshold_warning',
    severity: 'warning',
    sensor_name: 'discharge_temp_f',
    sensor_value: 248,
    threshold_value: 240,
    message: 'Outlet temperature exceeds warning threshold — check thermal insulation',
    acknowledged: true,
    acknowledged_by: 'operator@altaviz.com',
    acknowledged_at: new Date(Date.now() - 1 * 3600_000).toISOString(),
    resolved: false,
    resolved_at: null,
    created_at: new Date(Date.now() - 1.5 * 3600_000).toISOString(),
    model: '20in Lateral',
    station_id: 'STN-002',
    station_name: 'Eagle Ford Station',
  },
  {
    id: 1003,
    compressor_id: 'PL-003',
    alert_timestamp: new Date(Date.now() - 1 * 3600_000).toISOString(),
    alert_type: 'prediction',
    severity: 'critical',
    sensor_name: null,
    sensor_value: null,
    threshold_value: null,
    message: 'ML model predicts integrity failure within 72 hours — RUL estimate: 3.2 days (confidence: 0.87)',
    acknowledged: false,
    acknowledged_by: null,
    acknowledged_at: null,
    resolved: false,
    resolved_at: null,
    created_at: new Date(Date.now() - 1 * 3600_000).toISOString(),
    model: '20in Lateral',
    station_id: 'STN-002',
    station_name: 'Eagle Ford Station',
  },
  {
    id: 1004,
    compressor_id: 'PL-007',
    alert_timestamp: new Date(Date.now() - 4 * 3600_000).toISOString(),
    alert_type: 'threshold_warning',
    severity: 'warning',
    sensor_name: 'discharge_temp_f',
    sensor_value: 235,
    threshold_value: 240,
    message: 'Outlet temperature trending upward — early corrosion pattern detected',
    acknowledged: false,
    acknowledged_by: null,
    acknowledged_at: null,
    resolved: false,
    resolved_at: null,
    created_at: new Date(Date.now() - 4 * 3600_000).toISOString(),
    model: '20in Lateral',
    station_id: 'STN-003',
    station_name: 'Corpus Christi Station',
  },
  {
    id: 1005,
    compressor_id: 'PL-007',
    alert_timestamp: new Date(Date.now() - 3 * 3600_000).toISOString(),
    alert_type: 'anomaly',
    severity: 'warning',
    sensor_name: 'vibration_mms',
    sensor_value: 6.4,
    threshold_value: 6.0,
    message: 'Anomaly detected: Isolation Forest score -0.73 — unusual vibration pattern',
    acknowledged: false,
    acknowledged_by: null,
    acknowledged_at: null,
    resolved: false,
    resolved_at: null,
    created_at: new Date(Date.now() - 3 * 3600_000).toISOString(),
    model: '20in Lateral',
    station_id: 'STN-003',
    station_name: 'Corpus Christi Station',
  },
];

// === Emissions Data ===

export interface EmissionsEstimate {
  compressor_id: string;
  estimate_timestamp: string;
  methane_tonnes: number;
  co2e_tonnes: number;
  emission_rate_scfh: number;
  estimation_method: string;
  breakdown: {
    combustion_ch4_lb: number;
    combustion_co2_lb: number;
    fugitive_ch4_lb: number;
    pressure_ratio: number;
    fuel_mmbtu: number;
    operating_hours: number;
  };
}

export const DEMO_EMISSIONS: EmissionsEstimate[] = DEMO_FLEET.map((c) => {
  const hp = c.discharge_pressure_mean ? c.discharge_pressure_mean * 1.3 : 1400;
  const pressureRatio = (c.discharge_pressure_mean || 1050) / 60;
  const fugitiveFactor = Math.min(pressureRatio / 10.0, 2.0);
  const fuelMmbtu = hp * 0.007;
  const ch4Combustion = fuelMmbtu * 0.0023;
  const co2Combustion = fuelMmbtu * 117.0;
  const fugitiveCh4 = 8.01 * fugitiveFactor * 0.0423 * 0.93;
  const totalCh4 = ch4Combustion + fugitiveCh4;
  const totalCo2e = co2Combustion + totalCh4 * 28;

  return {
    compressor_id: c.compressor_id,
    estimate_timestamp: new Date().toISOString(),
    methane_tonnes: +(totalCh4 * 0.000453592).toFixed(6),
    co2e_tonnes: +(totalCo2e * 0.000453592).toFixed(4),
    emission_rate_scfh: +(8.01 * fugitiveFactor).toFixed(2),
    estimation_method: 'epa_subpart_w',
    breakdown: {
      combustion_ch4_lb: +ch4Combustion.toFixed(4),
      combustion_co2_lb: +co2Combustion.toFixed(2),
      fugitive_ch4_lb: +fugitiveCh4.toFixed(4),
      pressure_ratio: +pressureRatio.toFixed(2),
      fuel_mmbtu: +fuelMmbtu.toFixed(4),
      operating_hours: 1,
    },
  };
});

// === Time-series readings (24 hours of 1hr aggregates for PL-003) ===

function generateReadings(compressorId: string, baseVibration: number, baseTemp: number, basePressure: number, degrading: boolean): SensorReadingAgg[] {
  const readings: SensorReadingAgg[] = [];
  const now = Date.now();

  for (let i = 23; i >= 0; i--) {
    const t = now - i * 3600_000;
    const progress = degrading ? (23 - i) / 23 : 0;
    const noise = () => (Math.random() - 0.5) * 0.4;

    const vibMean = baseVibration + progress * 4.5 + noise();
    const tempMean = baseTemp + progress * 35 + noise() * 3;
    const dischargePressure = basePressure + progress * 180 + noise() * 10;

    readings.push({
      id: 10000 + (23 - i),
      compressor_id: compressorId,
      agg_timestamp: new Date(t).toISOString(),
      window_type: '1hr',
      vibration_mean: +vibMean.toFixed(2),
      vibration_std: +(0.3 + progress * 0.8).toFixed(2),
      vibration_max: +(vibMean + 0.5 + progress * 1.2).toFixed(2),
      vibration_min: +(vibMean - 0.4).toFixed(2),
      discharge_temp_mean: +tempMean.toFixed(1),
      discharge_temp_std: +(2.5 + progress * 3).toFixed(1),
      discharge_temp_max: +(tempMean + 5 + progress * 8).toFixed(1),
      discharge_temp_rate_of_change: +(progress * 15 + noise() * 2).toFixed(1),
      suction_pressure_mean: +(60 - progress * 10 + noise() * 2).toFixed(1),
      suction_pressure_std: +(1.5 + progress * 2).toFixed(1),
      suction_pressure_min: +(55 - progress * 15).toFixed(1),
      discharge_pressure_mean: +dischargePressure.toFixed(1),
      discharge_pressure_std: +(8 + progress * 12).toFixed(1),
      discharge_pressure_max: +(dischargePressure + 20 + progress * 30).toFixed(1),
      pressure_delta_mean: +(dischargePressure - 60 + progress * 10).toFixed(1),
      horsepower_mean: +(1400 + progress * 200 + noise() * 20).toFixed(0),
      horsepower_std: +(30 + progress * 50).toFixed(0),
      gas_flow_mean: +(10000 - progress * 2000 + noise() * 200).toFixed(0),
      reading_count: 6,
      missing_readings: 0,
      created_at: new Date(t).toISOString(),
    });
  }
  return readings;
}

export const DEMO_READINGS: Record<string, SensorReadingAgg[]> = {
  'PL-001': generateReadings('PL-001', 3.0, 200, 1040, false),
  'PL-002': generateReadings('PL-002', 3.5, 205, 1070, false),
  'PL-003': generateReadings('PL-003', 3.2, 210, 1050, true),  // Degrading segment
  'PL-004': generateReadings('PL-004', 2.8, 195, 1010, false),
  'PL-005': generateReadings('PL-005', 3.8, 212, 1090, false),
  'PL-006': generateReadings('PL-006', 3.3, 203, 1050, false),
  'PL-007': generateReadings('PL-007', 3.5, 208, 1060, true),  // Early corrosion
  'PL-008': generateReadings('PL-008', 2.8, 192, 1000, false),
  'PL-009': generateReadings('PL-009', 2.5, 188, 980, false),
  'PL-010': generateReadings('PL-010', 3.1, 200, 1035, false),
};
