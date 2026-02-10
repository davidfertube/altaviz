-- Migration 002: Add organization_id to alert_history, maintenance_events, data_quality_metrics
-- Purpose: Direct multi-tenant isolation without relying on FK chain through compressor_metadata
-- Run AFTER migration 001 (auth + tenancy)

BEGIN;

-- 1. Add organization_id columns (nullable initially for backfill)
ALTER TABLE alert_history
  ADD COLUMN IF NOT EXISTS organization_id UUID;

ALTER TABLE maintenance_events
  ADD COLUMN IF NOT EXISTS organization_id UUID;

ALTER TABLE data_quality_metrics
  ADD COLUMN IF NOT EXISTS organization_id UUID;

-- 2. Backfill from compressor_metadata FK chain
UPDATE alert_history a
SET organization_id = c.organization_id
FROM compressor_metadata c
WHERE a.compressor_id = c.compressor_id
  AND a.organization_id IS NULL;

UPDATE maintenance_events m
SET organization_id = c.organization_id
FROM compressor_metadata c
WHERE m.compressor_id = c.compressor_id
  AND m.organization_id IS NULL;

UPDATE data_quality_metrics dq
SET organization_id = c.organization_id
FROM compressor_metadata c
WHERE dq.compressor_id = c.compressor_id
  AND dq.organization_id IS NULL;

-- 3. Add FK constraints
ALTER TABLE alert_history
  ADD CONSTRAINT fk_alert_org FOREIGN KEY (organization_id) REFERENCES organizations(id);

ALTER TABLE maintenance_events
  ADD CONSTRAINT fk_maintenance_org FOREIGN KEY (organization_id) REFERENCES organizations(id);

ALTER TABLE data_quality_metrics
  ADD CONSTRAINT fk_quality_org FOREIGN KEY (organization_id) REFERENCES organizations(id);

-- 4. Create indexes for org-scoped queries
CREATE INDEX IF NOT EXISTS idx_alert_org_timestamp
  ON alert_history(organization_id, alert_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_alert_org_resolved
  ON alert_history(organization_id, resolved, alert_timestamp DESC)
  WHERE resolved = FALSE;

CREATE INDEX IF NOT EXISTS idx_maintenance_org_date
  ON maintenance_events(organization_id, event_date DESC);

CREATE INDEX IF NOT EXISTS idx_quality_org_timestamp
  ON data_quality_metrics(organization_id, metric_timestamp DESC);

-- 5. Recreate views with direct org_id filtering
DROP VIEW IF EXISTS v_active_alerts;
CREATE VIEW v_active_alerts AS
SELECT
  a.id,
  a.compressor_id,
  a.organization_id,
  a.alert_timestamp,
  a.alert_type,
  a.severity,
  a.sensor_name,
  a.sensor_value,
  a.threshold_value,
  a.message,
  a.acknowledged,
  a.acknowledged_by,
  a.acknowledged_at,
  a.resolved,
  a.resolved_at,
  c.model AS compressor_model,
  s.station_name,
  s.state
FROM alert_history a
JOIN compressor_metadata c ON a.compressor_id = c.compressor_id
JOIN station_locations s ON c.station_id = s.station_id
WHERE a.resolved = FALSE;

COMMIT;
