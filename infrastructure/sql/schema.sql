-- ===============================================
-- ALTAVIZ UNIFIED SCHEMA (PostgreSQL 14+)
-- ===============================================
-- Multi-tenant compressor health monitoring system
-- Includes: 11 tables, 3 views, triggers, seed data
-- Run once on a fresh PostgreSQL database (e.g. Supabase)

-- Drop existing objects for clean install
DROP VIEW IF EXISTS v_fleet_health_summary CASCADE;
DROP VIEW IF EXISTS v_active_alerts CASCADE;
DROP VIEW IF EXISTS v_latest_readings CASCADE;

DROP TABLE IF EXISTS emissions_estimates CASCADE;
DROP TABLE IF EXISTS ml_predictions CASCADE;
DROP TABLE IF EXISTS data_quality_metrics CASCADE;
DROP TABLE IF EXISTS alert_history CASCADE;
DROP TABLE IF EXISTS maintenance_events CASCADE;
DROP TABLE IF EXISTS sensor_readings_agg CASCADE;
DROP TABLE IF EXISTS billing_events CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS compressor_metadata CASCADE;
DROP TABLE IF EXISTS station_locations CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- ===============================================
-- TENANT TABLE
-- ===============================================

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    stripe_customer_id VARCHAR(100),
    subscription_tier VARCHAR(20) DEFAULT 'free'
        CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
    subscription_status VARCHAR(20) DEFAULT 'active'
        CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'trialing')),
    max_compressors INT DEFAULT 2,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_org_slug ON organizations(slug);
CREATE INDEX idx_org_stripe ON organizations(stripe_customer_id);

-- ===============================================
-- USER TABLE
-- ===============================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(200),
    password_hash VARCHAR(255),
    provider_id VARCHAR(255) UNIQUE,
    role VARCHAR(20) DEFAULT 'viewer'
        CHECK (role IN ('owner', 'admin', 'operator', 'viewer')),
    avatar_url TEXT,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_org ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_provider ON users(provider_id);

-- ===============================================
-- BILLING TABLE
-- ===============================================

CREATE TABLE billing_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    stripe_event_id VARCHAR(100) UNIQUE,
    event_type VARCHAR(50) NOT NULL,
    amount_cents INT,
    currency VARCHAR(3) DEFAULT 'usd',
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_billing_org ON billing_events(organization_id);
CREATE INDEX idx_billing_stripe_event ON billing_events(stripe_event_id);

-- ===============================================
-- DIMENSION TABLES
-- ===============================================

CREATE TABLE station_locations (
    station_id VARCHAR(50) PRIMARY KEY,
    station_name VARCHAR(200) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    region VARCHAR(100),
    city VARCHAR(100),
    state VARCHAR(2),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_station_org ON station_locations(organization_id);

CREATE TABLE compressor_metadata (
    compressor_id VARCHAR(50) PRIMARY KEY,
    model VARCHAR(100) NOT NULL,
    horsepower INT NOT NULL,
    install_date DATE NOT NULL,
    station_id VARCHAR(50) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_station FOREIGN KEY (station_id)
        REFERENCES station_locations(station_id) ON DELETE RESTRICT
);

CREATE INDEX idx_metadata_station ON compressor_metadata(station_id);
CREATE INDEX idx_compressor_org ON compressor_metadata(organization_id);

-- ===============================================
-- FACT TABLES
-- ===============================================

CREATE TABLE sensor_readings_agg (
    id SERIAL PRIMARY KEY,
    compressor_id VARCHAR(50) NOT NULL,
    agg_timestamp TIMESTAMP NOT NULL,
    window_type VARCHAR(10) NOT NULL CHECK (window_type IN ('1hr', '4hr', '24hr')),

    vibration_mean DECIMAL(10, 2),
    vibration_std DECIMAL(10, 2),
    vibration_max DECIMAL(10, 2),
    vibration_min DECIMAL(10, 2),

    discharge_temp_mean DECIMAL(10, 2),
    discharge_temp_std DECIMAL(10, 2),
    discharge_temp_max DECIMAL(10, 2),
    discharge_temp_rate_of_change DECIMAL(10, 4),

    suction_pressure_mean DECIMAL(10, 2),
    suction_pressure_std DECIMAL(10, 2),
    suction_pressure_min DECIMAL(10, 2),

    discharge_pressure_mean DECIMAL(10, 2),
    discharge_pressure_std DECIMAL(10, 2),
    discharge_pressure_max DECIMAL(10, 2),

    pressure_delta_mean DECIMAL(10, 2),

    horsepower_mean DECIMAL(10, 2),
    horsepower_std DECIMAL(10, 2),
    gas_flow_mean DECIMAL(10, 2),

    reading_count INT NOT NULL DEFAULT 0,
    missing_readings INT DEFAULT 0,

    organization_id UUID NOT NULL REFERENCES organizations(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_compressor FOREIGN KEY (compressor_id)
        REFERENCES compressor_metadata(compressor_id) ON DELETE CASCADE
);

CREATE INDEX idx_readings_compressor_time ON sensor_readings_agg(compressor_id, agg_timestamp DESC);
CREATE INDEX idx_readings_timestamp ON sensor_readings_agg(agg_timestamp DESC);
CREATE INDEX idx_readings_window_type ON sensor_readings_agg(window_type);
CREATE INDEX idx_readings_composite ON sensor_readings_agg(compressor_id, window_type, agg_timestamp DESC);
CREATE INDEX idx_readings_org ON sensor_readings_agg(organization_id);

CREATE TABLE maintenance_events (
    id SERIAL PRIMARY KEY,
    compressor_id VARCHAR(50) NOT NULL,
    event_date DATE NOT NULL,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('scheduled', 'unscheduled', 'inspection', 'failure')),
    description TEXT,
    downtime_hours DECIMAL(10, 2),
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    cost_usd DECIMAL(12, 2),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_maintenance_compressor FOREIGN KEY (compressor_id)
        REFERENCES compressor_metadata(compressor_id) ON DELETE CASCADE
);

CREATE INDEX idx_maintenance_compressor ON maintenance_events(compressor_id, event_date DESC);
CREATE INDEX idx_maintenance_type ON maintenance_events(event_type);
CREATE INDEX idx_maintenance_date ON maintenance_events(event_date DESC);
CREATE INDEX idx_maintenance_org ON maintenance_events(organization_id);

CREATE TABLE alert_history (
    id SERIAL PRIMARY KEY,
    compressor_id VARCHAR(50) NOT NULL,
    alert_timestamp TIMESTAMP NOT NULL,
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('threshold_warning', 'threshold_critical', 'anomaly', 'prediction')),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('warning', 'critical')),
    sensor_name VARCHAR(50),
    sensor_value DECIMAL(10, 4),
    threshold_value DECIMAL(10, 4),
    message TEXT,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by VARCHAR(100),
    acknowledged_at TIMESTAMP,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_alert_compressor FOREIGN KEY (compressor_id)
        REFERENCES compressor_metadata(compressor_id) ON DELETE CASCADE
);

CREATE INDEX idx_alert_compressor_time ON alert_history(compressor_id, alert_timestamp DESC);
CREATE INDEX idx_alert_severity ON alert_history(severity, resolved);
CREATE INDEX idx_alert_type ON alert_history(alert_type);
CREATE INDEX idx_alert_unresolved ON alert_history(resolved, alert_timestamp DESC) WHERE resolved = FALSE;
CREATE INDEX idx_alert_org ON alert_history(organization_id);
CREATE INDEX idx_alert_org_timestamp ON alert_history(organization_id, alert_timestamp DESC);

CREATE TABLE data_quality_metrics (
    id SERIAL PRIMARY KEY,
    metric_timestamp TIMESTAMP NOT NULL,
    compressor_id VARCHAR(50),
    metric_type VARCHAR(50) NOT NULL CHECK (metric_type IN ('freshness', 'completeness', 'consistency', 'accuracy')),
    metric_value DECIMAL(10, 4),
    pass_threshold BOOLEAN,
    details JSONB,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_quality_timestamp ON data_quality_metrics(metric_timestamp DESC);
CREATE INDEX idx_quality_type ON data_quality_metrics(metric_type);
CREATE INDEX idx_quality_compressor ON data_quality_metrics(compressor_id);
CREATE INDEX idx_quality_org ON data_quality_metrics(organization_id);

CREATE TABLE ml_predictions (
    id SERIAL PRIMARY KEY,
    compressor_id VARCHAR(50) NOT NULL,
    prediction_timestamp TIMESTAMP NOT NULL,
    rul_days DECIMAL(10, 2),
    failure_probability DECIMAL(5, 4) CHECK (failure_probability BETWEEN 0 AND 1),
    confidence_score DECIMAL(5, 4) CHECK (confidence_score BETWEEN 0 AND 1),
    model_version VARCHAR(50),
    features_used JSONB,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_prediction_compressor FOREIGN KEY (compressor_id)
        REFERENCES compressor_metadata(compressor_id) ON DELETE CASCADE
);

CREATE INDEX idx_predictions_compressor_time ON ml_predictions(compressor_id, prediction_timestamp DESC);
CREATE INDEX idx_predictions_rul ON ml_predictions(rul_days) WHERE rul_days < 30;
CREATE INDEX idx_predictions_org ON ml_predictions(organization_id);

CREATE TABLE emissions_estimates (
    id SERIAL PRIMARY KEY,
    compressor_id VARCHAR(50) NOT NULL,
    estimate_timestamp TIMESTAMP NOT NULL,
    methane_tonnes DECIMAL(10, 4),
    co2e_tonnes DECIMAL(10, 4),
    emission_rate_scfh DECIMAL(10, 4),
    estimation_method VARCHAR(50) DEFAULT 'epa_subpart_w',
    organization_id UUID NOT NULL REFERENCES organizations(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_emissions_compressor FOREIGN KEY (compressor_id)
        REFERENCES compressor_metadata(compressor_id) ON DELETE CASCADE
);

CREATE INDEX idx_emissions_compressor_time ON emissions_estimates(compressor_id, estimate_timestamp DESC);
CREATE INDEX idx_emissions_org ON emissions_estimates(organization_id);

-- ===============================================
-- VIEWS (org-aware)
-- ===============================================

CREATE VIEW v_latest_readings AS
SELECT DISTINCT ON (sra.compressor_id)
    sra.compressor_id,
    sra.agg_timestamp,
    sra.vibration_mean,
    sra.vibration_max,
    sra.discharge_temp_mean,
    sra.discharge_temp_max,
    sra.discharge_pressure_mean,
    sra.suction_pressure_mean,
    sra.pressure_delta_mean,
    sra.horsepower_mean,
    sra.gas_flow_mean,
    cm.organization_id
FROM sensor_readings_agg sra
JOIN compressor_metadata cm ON sra.compressor_id = cm.compressor_id
WHERE sra.window_type = '1hr'
ORDER BY sra.compressor_id, sra.agg_timestamp DESC;

CREATE VIEW v_active_alerts AS
SELECT
    a.id,
    a.compressor_id,
    a.alert_timestamp,
    a.alert_type,
    a.severity,
    a.sensor_name,
    a.sensor_value,
    a.threshold_value,
    a.message,
    c.model,
    c.station_id,
    s.station_name,
    a.organization_id
FROM alert_history a
JOIN compressor_metadata c ON a.compressor_id = c.compressor_id
JOIN station_locations s ON c.station_id = s.station_id
WHERE a.resolved = FALSE
ORDER BY a.alert_timestamp DESC, a.severity DESC;

CREATE VIEW v_fleet_health_summary AS
SELECT
    c.compressor_id,
    c.model,
    c.station_id,
    s.station_name,
    c.latitude,
    c.longitude,
    c.organization_id,
    lr.agg_timestamp as last_reading_time,
    lr.vibration_max,
    lr.discharge_temp_max,
    lr.discharge_pressure_mean,
    COUNT(DISTINCT aa.id) as active_alert_count,
    MAX(CASE
        WHEN aa.severity = 'critical' THEN 'critical'
        WHEN aa.severity = 'warning' THEN 'warning'
        ELSE 'healthy'
    END) as health_status
FROM compressor_metadata c
LEFT JOIN station_locations s ON c.station_id = s.station_id
LEFT JOIN v_latest_readings lr ON c.compressor_id = lr.compressor_id
LEFT JOIN alert_history aa ON c.compressor_id = aa.compressor_id AND aa.resolved = FALSE
GROUP BY
    c.compressor_id, c.model, c.station_id, s.station_name,
    c.latitude, c.longitude, c.organization_id,
    lr.agg_timestamp, lr.vibration_max, lr.discharge_temp_max, lr.discharge_pressure_mean;

-- ===============================================
-- TRIGGERS
-- ===============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_compressor_metadata_updated_at
    BEFORE UPDATE ON compressor_metadata
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===============================================
-- SEED DATA
-- ===============================================

INSERT INTO organizations (name, slug, subscription_tier, max_compressors)
VALUES ('Altaviz Demo', 'altaviz-demo', 'enterprise', 100)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO station_locations (station_id, station_name, latitude, longitude, region, city, state, organization_id)
VALUES
    ('STATION-A', 'Eagle Ford Station A', 28.9144, -98.5242, 'South Texas', 'Karnes City', 'TX',
        (SELECT id FROM organizations WHERE slug = 'altaviz-demo')),
    ('STATION-B', 'Permian Basin Station B', 31.9973, -102.0779, 'West Texas', 'Midland', 'TX',
        (SELECT id FROM organizations WHERE slug = 'altaviz-demo')),
    ('STATION-C', 'Haynesville Station C', 32.5007, -93.7465, 'East Texas', 'Carthage', 'TX',
        (SELECT id FROM organizations WHERE slug = 'altaviz-demo')),
    ('STATION-D', 'Barnett Shale Station D', 32.7555, -97.3308, 'North Texas', 'Fort Worth', 'TX',
        (SELECT id FROM organizations WHERE slug = 'altaviz-demo'))
ON CONFLICT (station_id) DO NOTHING;

INSERT INTO users (organization_id, email, name, role)
VALUES (
    (SELECT id FROM organizations WHERE slug = 'altaviz-demo'),
    'admin@altaviz.com', 'admin', 'owner'
) ON CONFLICT (email) DO NOTHING;
