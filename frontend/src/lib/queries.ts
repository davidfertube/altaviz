import { query } from './db';
import type {
  FleetHealthSummary,
  LatestReading,
  ActiveAlert,
  StationLocation,
  CompressorMetadata,
  SensorReadingAgg,
  AlertHistory,
  MaintenanceEvent,
  DataQualityMetric,
  WindowType,
} from './types';

// === Fleet Overview ===

export function getFleetHealth(organizationId: string): Promise<FleetHealthSummary[]> {
  return query<FleetHealthSummary>(
    'SELECT * FROM v_fleet_health_summary WHERE organization_id = $1 ORDER BY compressor_id',
    [organizationId]
  );
}

export function getLatestReadings(organizationId: string): Promise<LatestReading[]> {
  return query<LatestReading>(
    'SELECT * FROM v_latest_readings WHERE organization_id = $1 ORDER BY compressor_id',
    [organizationId]
  );
}

export function getActiveAlerts(organizationId: string): Promise<ActiveAlert[]> {
  return query<ActiveAlert>(
    'SELECT * FROM v_active_alerts WHERE organization_id = $1',
    [organizationId]
  );
}

export function getStations(organizationId: string): Promise<(StationLocation & { compressor_count: number })[]> {
  return query(
    `SELECT s.*, COUNT(c.compressor_id)::int as compressor_count
     FROM station_locations s
     LEFT JOIN compressor_metadata c ON s.station_id = c.station_id
     WHERE s.organization_id = $1
     GROUP BY s.station_id, s.station_name, s.latitude, s.longitude,
              s.region, s.city, s.state, s.created_at, s.organization_id
     ORDER BY s.station_id`,
    [organizationId]
  );
}

// === Compressor Detail ===

export function getCompressor(compressorId: string, organizationId: string): Promise<(CompressorMetadata & { station_name: string })[]> {
  return query(
    `SELECT c.*, s.station_name
     FROM compressor_metadata c
     JOIN station_locations s ON c.station_id = s.station_id
     WHERE c.compressor_id = $1 AND c.organization_id = $2`,
    [compressorId, organizationId]
  );
}

export function getCompressorReadings(
  compressorId: string,
  windowType: WindowType,
  hours: number,
  organizationId: string
): Promise<SensorReadingAgg[]> {
  return query<SensorReadingAgg>(
    `SELECT sra.* FROM sensor_readings_agg sra
     JOIN compressor_metadata cm ON sra.compressor_id = cm.compressor_id
     WHERE sra.compressor_id = $1
       AND sra.window_type = $2
       AND sra.agg_timestamp >= NOW() - make_interval(hours => $3)
       AND cm.organization_id = $4
     ORDER BY sra.agg_timestamp ASC`,
    [compressorId, windowType, hours, organizationId]
  );
}

// === Alerts ===

export function getAlerts(params: {
  organizationId: string;
  severity?: string;
  status?: string;
  compressor?: string;
  limit?: number;
  offset?: number;
}): Promise<(AlertHistory & { model: string; station_id: string; station_name: string })[]> {
  const conditions: string[] = ['a.organization_id = $1'];
  const values: unknown[] = [params.organizationId];
  let idx = 2;

  if (params.severity) {
    conditions.push(`a.severity = $${idx++}`);
    values.push(params.severity);
  }
  if (params.status === 'active') {
    conditions.push(`a.resolved = FALSE`);
  } else if (params.status === 'resolved') {
    conditions.push(`a.resolved = TRUE`);
  }
  if (params.compressor) {
    conditions.push(`a.compressor_id = $${idx++}`);
    values.push(params.compressor);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const limit = params.limit || 50;
  const offset = params.offset || 0;

  values.push(limit, offset);

  return query(
    `SELECT a.*, c.model, c.station_id, s.station_name
     FROM alert_history a
     JOIN compressor_metadata c ON a.compressor_id = c.compressor_id
     JOIN station_locations s ON c.station_id = s.station_id
     ${where}
     ORDER BY a.alert_timestamp DESC
     LIMIT $${idx++} OFFSET $${idx}`,
    values
  );
}

export function acknowledgeAlert(alertId: number, acknowledgedBy: string, organizationId: string): Promise<AlertHistory[]> {
  return query<AlertHistory>(
    `UPDATE alert_history
     SET acknowledged = TRUE, acknowledged_by = $2, acknowledged_at = NOW()
     WHERE id = $1 AND organization_id = $3
     RETURNING *`,
    [alertId, acknowledgedBy, organizationId]
  );
}

export function resolveAlert(alertId: number, organizationId: string): Promise<AlertHistory[]> {
  return query<AlertHistory>(
    `UPDATE alert_history
     SET resolved = TRUE, resolved_at = NOW()
     WHERE id = $1 AND organization_id = $2
     RETURNING *`,
    [alertId, organizationId]
  );
}

// === Data Quality ===

export function getDataQualityMetrics(params: {
  organizationId: string;
  compressor?: string;
  hours?: number;
}): Promise<DataQualityMetric[]> {
  const hours = params.hours || 24;
  if (params.compressor) {
    return query<DataQualityMetric>(
      `SELECT * FROM data_quality_metrics
       WHERE compressor_id = $1
         AND metric_timestamp >= NOW() - make_interval(hours => $2)
         AND organization_id = $3
       ORDER BY metric_timestamp DESC`,
      [params.compressor, hours, params.organizationId]
    );
  }
  return query<DataQualityMetric>(
    `SELECT * FROM data_quality_metrics
     WHERE metric_timestamp >= NOW() - make_interval(hours => $1)
       AND organization_id = $2
     ORDER BY metric_timestamp DESC`,
    [hours, params.organizationId]
  );
}

// === Maintenance ===

export function getMaintenanceEvents(organizationId: string, compressorId?: string): Promise<MaintenanceEvent[]> {
  if (compressorId) {
    return query<MaintenanceEvent>(
      `SELECT * FROM maintenance_events
       WHERE compressor_id = $1 AND organization_id = $2
       ORDER BY event_date DESC`,
      [compressorId, organizationId]
    );
  }
  return query<MaintenanceEvent>(
    `SELECT * FROM maintenance_events
     WHERE organization_id = $1
     ORDER BY event_date DESC`,
    [organizationId]
  );
}
