-- ===============================================
-- COMPRESSOR HEALTH MONITORING DATABASE SCHEMA
-- ===============================================
-- PostgreSQL 14+ schema for compressor health monitoring system
-- Designed for time-series sensor data, alerts, and maintenance tracking

-- Drop existing tables if they exist (for clean reinstall)
DROP TABLE IF EXISTS ml_predictions CASCADE;
DROP TABLE IF EXISTS data_quality_metrics CASCADE;
DROP TABLE IF EXISTS alert_history CASCADE;
DROP TABLE IF EXISTS maintenance_events CASCADE;
DROP TABLE IF EXISTS sensor_readings_agg CASCADE;
DROP TABLE IF EXISTS compressor_metadata CASCADE;
DROP TABLE IF EXISTS station_locations CASCADE;

-- Drop existing views
DROP VIEW IF EXISTS v_fleet_health_summary CASCADE;
DROP VIEW IF EXISTS v_active_alerts CASCADE;
DROP VIEW IF EXISTS v_latest_readings CASCADE;

-- ===============================================
-- DIMENSION TABLES
-- ===============================================

-- 1. STATION LOCATIONS TABLE (for map visualization)
CREATE TABLE station_locations (
    station_id VARCHAR(50) PRIMARY KEY,
    station_name VARCHAR(200) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    region VARCHAR(100),
    city VARCHAR(100),
    state VARCHAR(2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE station_locations IS 'Geographic locations of compressor stations for map visualization';

-- 2. COMPRESSOR METADATA TABLE
CREATE TABLE compressor_metadata (
    compressor_id VARCHAR(50) PRIMARY KEY,
    model VARCHAR(100) NOT NULL,
    horsepower INT NOT NULL,
    install_date DATE NOT NULL,
    station_id VARCHAR(50) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_station FOREIGN KEY (station_id)
        REFERENCES station_locations(station_id) ON DELETE RESTRICT
);

COMMENT ON TABLE compressor_metadata IS 'Fleet metadata for all compressor units';

CREATE INDEX idx_metadata_station ON compressor_metadata(station_id);

-- ===============================================
-- FACT TABLES
-- ===============================================

-- 3. SENSOR READINGS AGGREGATED TABLE
-- Note: Storing hourly aggregates instead of raw 10-min readings to reduce volume
CREATE TABLE sensor_readings_agg (
    id SERIAL PRIMARY KEY,
    compressor_id VARCHAR(50) NOT NULL,
    agg_timestamp TIMESTAMP NOT NULL,
    window_type VARCHAR(10) NOT NULL CHECK (window_type IN ('1hr', '4hr', '24hr')),

    -- Vibration statistics (mm/s)
    vibration_mean DECIMAL(10, 2),
    vibration_std DECIMAL(10, 2),
    vibration_max DECIMAL(10, 2),
    vibration_min DECIMAL(10, 2),

    -- Temperature statistics (°F)
    discharge_temp_mean DECIMAL(10, 2),
    discharge_temp_std DECIMAL(10, 2),
    discharge_temp_max DECIMAL(10, 2),
    discharge_temp_rate_of_change DECIMAL(10, 4),  -- °F/hour

    -- Suction pressure statistics (PSI)
    suction_pressure_mean DECIMAL(10, 2),
    suction_pressure_std DECIMAL(10, 2),
    suction_pressure_min DECIMAL(10, 2),

    -- Discharge pressure statistics (PSI)
    discharge_pressure_mean DECIMAL(10, 2),
    discharge_pressure_std DECIMAL(10, 2),
    discharge_pressure_max DECIMAL(10, 2),

    -- Derived metrics
    pressure_delta_mean DECIMAL(10, 2),  -- discharge - suction

    -- Performance metrics
    horsepower_mean DECIMAL(10, 2),
    horsepower_std DECIMAL(10, 2),
    gas_flow_mean DECIMAL(10, 2),

    -- Data quality metrics
    reading_count INT NOT NULL DEFAULT 0,
    missing_readings INT DEFAULT 0,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_compressor FOREIGN KEY (compressor_id)
        REFERENCES compressor_metadata(compressor_id) ON DELETE CASCADE
);

COMMENT ON TABLE sensor_readings_agg IS 'Aggregated sensor readings by time window (1hr, 4hr, 24hr)';

-- Indexes for time-series queries
CREATE INDEX idx_readings_compressor_time ON sensor_readings_agg(compressor_id, agg_timestamp DESC);
CREATE INDEX idx_readings_timestamp ON sensor_readings_agg(agg_timestamp DESC);
CREATE INDEX idx_readings_window_type ON sensor_readings_agg(window_type);
CREATE INDEX idx_readings_composite ON sensor_readings_agg(compressor_id, window_type, agg_timestamp DESC);

-- 4. MAINTENANCE EVENTS TABLE
CREATE TABLE maintenance_events (
    id SERIAL PRIMARY KEY,
    compressor_id VARCHAR(50) NOT NULL,
    event_date DATE NOT NULL,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('scheduled', 'unscheduled', 'inspection', 'failure')),
    description TEXT,
    downtime_hours DECIMAL(10, 2),
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    cost_usd DECIMAL(12, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_maintenance_compressor FOREIGN KEY (compressor_id)
        REFERENCES compressor_metadata(compressor_id) ON DELETE CASCADE
);

COMMENT ON TABLE maintenance_events IS 'Maintenance logs and failure events';

CREATE INDEX idx_maintenance_compressor ON maintenance_events(compressor_id, event_date DESC);
CREATE INDEX idx_maintenance_type ON maintenance_events(event_type);
CREATE INDEX idx_maintenance_date ON maintenance_events(event_date DESC);

-- 5. ALERT HISTORY TABLE
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_alert_compressor FOREIGN KEY (compressor_id)
        REFERENCES compressor_metadata(compressor_id) ON DELETE CASCADE
);

COMMENT ON TABLE alert_history IS 'Alert history for threshold violations and anomalies';

CREATE INDEX idx_alert_compressor_time ON alert_history(compressor_id, alert_timestamp DESC);
CREATE INDEX idx_alert_severity ON alert_history(severity, resolved);
CREATE INDEX idx_alert_type ON alert_history(alert_type);
CREATE INDEX idx_alert_unresolved ON alert_history(resolved, alert_timestamp DESC) WHERE resolved = FALSE;

-- 6. DATA QUALITY METRICS TABLE
CREATE TABLE data_quality_metrics (
    id SERIAL PRIMARY KEY,
    metric_timestamp TIMESTAMP NOT NULL,
    compressor_id VARCHAR(50),
    metric_type VARCHAR(50) NOT NULL CHECK (metric_type IN ('freshness', 'completeness', 'consistency', 'accuracy')),
    metric_value DECIMAL(10, 4),
    pass_threshold BOOLEAN,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE data_quality_metrics IS 'Data quality monitoring metrics';

CREATE INDEX idx_quality_timestamp ON data_quality_metrics(metric_timestamp DESC);
CREATE INDEX idx_quality_type ON data_quality_metrics(metric_type);
CREATE INDEX idx_quality_compressor ON data_quality_metrics(compressor_id);

-- 7. ML MODEL PREDICTIONS TABLE (for future ML integration)
CREATE TABLE ml_predictions (
    id SERIAL PRIMARY KEY,
    compressor_id VARCHAR(50) NOT NULL,
    prediction_timestamp TIMESTAMP NOT NULL,
    rul_days DECIMAL(10, 2),  -- Remaining Useful Life in days
    failure_probability DECIMAL(5, 4) CHECK (failure_probability BETWEEN 0 AND 1),
    confidence_score DECIMAL(5, 4) CHECK (confidence_score BETWEEN 0 AND 1),
    model_version VARCHAR(50),
    features_used JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_prediction_compressor FOREIGN KEY (compressor_id)
        REFERENCES compressor_metadata(compressor_id) ON DELETE CASCADE
);

COMMENT ON TABLE ml_predictions IS 'Machine learning predictions for remaining useful life';

CREATE INDEX idx_predictions_compressor_time ON ml_predictions(compressor_id, prediction_timestamp DESC);
CREATE INDEX idx_predictions_rul ON ml_predictions(rul_days) WHERE rul_days < 30;

-- ===============================================
-- VIEWS FOR COMMON QUERIES
-- ===============================================

-- View 1: Latest sensor readings per compressor (1hr window)
CREATE VIEW v_latest_readings AS
SELECT DISTINCT ON (compressor_id)
    compressor_id,
    agg_timestamp,
    vibration_mean,
    vibration_max,
    discharge_temp_mean,
    discharge_temp_max,
    discharge_pressure_mean,
    suction_pressure_mean,
    pressure_delta_mean,
    horsepower_mean,
    gas_flow_mean
FROM sensor_readings_agg
WHERE window_type = '1hr'
ORDER BY compressor_id, agg_timestamp DESC;

COMMENT ON VIEW v_latest_readings IS 'Latest 1-hour aggregated readings for each compressor';

-- View 2: Active alerts (unresolved)
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
    s.station_name
FROM alert_history a
JOIN compressor_metadata c ON a.compressor_id = c.compressor_id
JOIN station_locations s ON c.station_id = s.station_id
WHERE a.resolved = FALSE
ORDER BY a.alert_timestamp DESC, a.severity DESC;

COMMENT ON VIEW v_active_alerts IS 'All unresolved alerts with compressor and station details';

-- View 3: Fleet health summary
CREATE VIEW v_fleet_health_summary AS
SELECT
    c.compressor_id,
    c.model,
    c.station_id,
    s.station_name,
    c.latitude,
    c.longitude,
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
    c.compressor_id,
    c.model,
    c.station_id,
    s.station_name,
    c.latitude,
    c.longitude,
    lr.agg_timestamp,
    lr.vibration_max,
    lr.discharge_temp_max,
    lr.discharge_pressure_mean;

COMMENT ON VIEW v_fleet_health_summary IS 'Complete fleet health overview with status and latest metrics';

-- ===============================================
-- HELPFUL FUNCTIONS
-- ===============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for compressor_metadata
CREATE TRIGGER update_compressor_metadata_updated_at
    BEFORE UPDATE ON compressor_metadata
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===============================================
-- INITIAL GRANTS (optional - for production)
-- ===============================================

-- Grant permissions to application user (uncomment for production)
-- CREATE USER compressor_app WITH PASSWORD 'your_secure_password';
-- GRANT CONNECT ON DATABASE compressor_health TO compressor_app;
-- GRANT USAGE ON SCHEMA public TO compressor_app;
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO compressor_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO compressor_app;

-- ===============================================
-- SCHEMA COMPLETE
-- ===============================================

-- Summary of created objects
DO $$
BEGIN
    RAISE NOTICE '✓ Database schema created successfully';
    RAISE NOTICE '  Tables: 7 (station_locations, compressor_metadata, sensor_readings_agg, maintenance_events, alert_history, data_quality_metrics, ml_predictions)';
    RAISE NOTICE '  Views: 3 (v_latest_readings, v_active_alerts, v_fleet_health_summary)';
    RAISE NOTICE '  Indexes: 15';
    RAISE NOTICE '  Functions: 1';
    RAISE NOTICE '  Triggers: 1';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Run seed_data.sql to populate station locations';
    RAISE NOTICE '  2. Run data simulator to generate sensor data';
    RAISE NOTICE '  3. Execute ETL pipeline to populate tables';
END $$;
