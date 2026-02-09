-- ===============================================
-- COMPRESSOR HEALTH MONITORING DATABASE SCHEMA
-- Azure SQL Database Compatible
-- ===============================================
-- Converted from PostgreSQL schema for Azure SQL Database
-- Key differences from PostgreSQL:
--   - SERIAL → INT IDENTITY(1,1)
--   - JSONB → NVARCHAR(MAX) (store JSON as text, use JSON functions)
--   - BOOLEAN → BIT
--   - DISTINCT ON → ROW_NUMBER() OVER()
--   - $$ PL/pgSQL → T-SQL syntax
--   - Partial indexes → Filtered indexes (same concept, different syntax)

-- Drop existing objects if they exist
IF OBJECT_ID('v_fleet_health_summary', 'V') IS NOT NULL DROP VIEW v_fleet_health_summary;
IF OBJECT_ID('v_active_alerts', 'V') IS NOT NULL DROP VIEW v_active_alerts;
IF OBJECT_ID('v_latest_readings', 'V') IS NOT NULL DROP VIEW v_latest_readings;
IF OBJECT_ID('ml_predictions', 'U') IS NOT NULL DROP TABLE ml_predictions;
IF OBJECT_ID('data_quality_metrics', 'U') IS NOT NULL DROP TABLE data_quality_metrics;
IF OBJECT_ID('alert_history', 'U') IS NOT NULL DROP TABLE alert_history;
IF OBJECT_ID('maintenance_events', 'U') IS NOT NULL DROP TABLE maintenance_events;
IF OBJECT_ID('sensor_readings_agg', 'U') IS NOT NULL DROP TABLE sensor_readings_agg;
IF OBJECT_ID('compressor_metadata', 'U') IS NOT NULL DROP TABLE compressor_metadata;
IF OBJECT_ID('station_locations', 'U') IS NOT NULL DROP TABLE station_locations;
GO

-- ===============================================
-- DIMENSION TABLES
-- ===============================================

-- 1. STATION LOCATIONS TABLE
CREATE TABLE station_locations (
    station_id VARCHAR(50) PRIMARY KEY,
    station_name VARCHAR(200) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    region VARCHAR(100),
    city VARCHAR(100),
    state VARCHAR(2),
    created_at DATETIME2 DEFAULT GETDATE()
);
GO

-- 2. COMPRESSOR METADATA TABLE
CREATE TABLE compressor_metadata (
    compressor_id VARCHAR(50) PRIMARY KEY,
    model VARCHAR(100) NOT NULL,
    horsepower INT NOT NULL,
    install_date DATE NOT NULL,
    station_id VARCHAR(50) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),

    CONSTRAINT fk_station FOREIGN KEY (station_id)
        REFERENCES station_locations(station_id)
);
GO

CREATE INDEX idx_metadata_station ON compressor_metadata(station_id);
GO

-- ===============================================
-- FACT TABLES
-- ===============================================

-- 3. SENSOR READINGS AGGREGATED TABLE
CREATE TABLE sensor_readings_agg (
    id INT IDENTITY(1,1) PRIMARY KEY,
    compressor_id VARCHAR(50) NOT NULL,
    agg_timestamp DATETIME2 NOT NULL,
    window_type VARCHAR(10) NOT NULL CHECK (window_type IN ('1hr', '4hr', '24hr')),

    -- Vibration statistics (mm/s)
    vibration_mean DECIMAL(10, 2),
    vibration_std DECIMAL(10, 2),
    vibration_max DECIMAL(10, 2),
    vibration_min DECIMAL(10, 2),

    -- Temperature statistics (F)
    discharge_temp_mean DECIMAL(10, 2),
    discharge_temp_std DECIMAL(10, 2),
    discharge_temp_max DECIMAL(10, 2),
    discharge_temp_rate_of_change DECIMAL(10, 4),

    -- Suction pressure statistics (PSI)
    suction_pressure_mean DECIMAL(10, 2),
    suction_pressure_std DECIMAL(10, 2),
    suction_pressure_min DECIMAL(10, 2),

    -- Discharge pressure statistics (PSI)
    discharge_pressure_mean DECIMAL(10, 2),
    discharge_pressure_std DECIMAL(10, 2),
    discharge_pressure_max DECIMAL(10, 2),

    -- Derived metrics
    pressure_delta_mean DECIMAL(10, 2),

    -- Performance metrics
    horsepower_mean DECIMAL(10, 2),
    horsepower_std DECIMAL(10, 2),
    gas_flow_mean DECIMAL(10, 2),

    -- Data quality metrics
    reading_count INT NOT NULL DEFAULT 0,
    missing_readings INT DEFAULT 0,

    -- Metadata
    created_at DATETIME2 DEFAULT GETDATE(),

    CONSTRAINT fk_compressor FOREIGN KEY (compressor_id)
        REFERENCES compressor_metadata(compressor_id) ON DELETE CASCADE
);
GO

-- Indexes for time-series queries
CREATE INDEX idx_readings_compressor_time ON sensor_readings_agg(compressor_id, agg_timestamp DESC);
CREATE INDEX idx_readings_timestamp ON sensor_readings_agg(agg_timestamp DESC);
CREATE INDEX idx_readings_window_type ON sensor_readings_agg(window_type);
CREATE INDEX idx_readings_composite ON sensor_readings_agg(compressor_id, window_type, agg_timestamp DESC);
GO

-- 4. MAINTENANCE EVENTS TABLE
CREATE TABLE maintenance_events (
    id INT IDENTITY(1,1) PRIMARY KEY,
    compressor_id VARCHAR(50) NOT NULL,
    event_date DATE NOT NULL,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('scheduled', 'unscheduled', 'inspection', 'failure')),
    description NVARCHAR(MAX),
    downtime_hours DECIMAL(10, 2),
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    cost_usd DECIMAL(12, 2),
    created_at DATETIME2 DEFAULT GETDATE(),

    CONSTRAINT fk_maintenance_compressor FOREIGN KEY (compressor_id)
        REFERENCES compressor_metadata(compressor_id) ON DELETE CASCADE
);
GO

CREATE INDEX idx_maintenance_compressor ON maintenance_events(compressor_id, event_date DESC);
CREATE INDEX idx_maintenance_type ON maintenance_events(event_type);
CREATE INDEX idx_maintenance_date ON maintenance_events(event_date DESC);
GO

-- 5. ALERT HISTORY TABLE
CREATE TABLE alert_history (
    id INT IDENTITY(1,1) PRIMARY KEY,
    compressor_id VARCHAR(50) NOT NULL,
    alert_timestamp DATETIME2 NOT NULL,
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('threshold_warning', 'threshold_critical', 'anomaly', 'prediction')),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('warning', 'critical')),
    sensor_name VARCHAR(50),
    sensor_value DECIMAL(10, 4),
    threshold_value DECIMAL(10, 4),
    message NVARCHAR(MAX),
    acknowledged BIT DEFAULT 0,
    acknowledged_by VARCHAR(100),
    acknowledged_at DATETIME2,
    resolved BIT DEFAULT 0,
    resolved_at DATETIME2,
    created_at DATETIME2 DEFAULT GETDATE(),

    CONSTRAINT fk_alert_compressor FOREIGN KEY (compressor_id)
        REFERENCES compressor_metadata(compressor_id) ON DELETE CASCADE
);
GO

CREATE INDEX idx_alert_compressor_time ON alert_history(compressor_id, alert_timestamp DESC);
CREATE INDEX idx_alert_severity ON alert_history(severity, resolved);
CREATE INDEX idx_alert_type ON alert_history(alert_type);
-- Filtered index (Azure SQL equivalent of PostgreSQL partial index)
CREATE INDEX idx_alert_unresolved ON alert_history(resolved, alert_timestamp DESC)
    WHERE resolved = 0;
GO

-- 6. DATA QUALITY METRICS TABLE
CREATE TABLE data_quality_metrics (
    id INT IDENTITY(1,1) PRIMARY KEY,
    metric_timestamp DATETIME2 NOT NULL,
    compressor_id VARCHAR(50),
    metric_type VARCHAR(50) NOT NULL CHECK (metric_type IN ('freshness', 'completeness', 'consistency', 'accuracy')),
    metric_value DECIMAL(10, 4),
    pass_threshold BIT,
    details NVARCHAR(MAX),  -- Store JSON as text, query with JSON_VALUE()
    created_at DATETIME2 DEFAULT GETDATE()
);
GO

CREATE INDEX idx_quality_timestamp ON data_quality_metrics(metric_timestamp DESC);
CREATE INDEX idx_quality_type ON data_quality_metrics(metric_type);
CREATE INDEX idx_quality_compressor ON data_quality_metrics(compressor_id);
GO

-- 7. ML MODEL PREDICTIONS TABLE
CREATE TABLE ml_predictions (
    id INT IDENTITY(1,1) PRIMARY KEY,
    compressor_id VARCHAR(50) NOT NULL,
    prediction_timestamp DATETIME2 NOT NULL,
    rul_days DECIMAL(10, 2),
    failure_probability DECIMAL(5, 4) CHECK (failure_probability BETWEEN 0 AND 1),
    confidence_score DECIMAL(5, 4) CHECK (confidence_score BETWEEN 0 AND 1),
    model_version VARCHAR(50),
    features_used NVARCHAR(MAX),  -- Store JSON as text
    created_at DATETIME2 DEFAULT GETDATE(),

    CONSTRAINT fk_prediction_compressor FOREIGN KEY (compressor_id)
        REFERENCES compressor_metadata(compressor_id) ON DELETE CASCADE
);
GO

CREATE INDEX idx_predictions_compressor_time ON ml_predictions(compressor_id, prediction_timestamp DESC);
-- Filtered index for compressors approaching failure
CREATE INDEX idx_predictions_rul ON ml_predictions(rul_days)
    WHERE rul_days < 30;
GO

-- ===============================================
-- VIEWS FOR COMMON QUERIES
-- ===============================================

-- View 1: Latest sensor readings per compressor (1hr window)
-- Uses ROW_NUMBER() instead of PostgreSQL's DISTINCT ON
CREATE VIEW v_latest_readings AS
SELECT
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
FROM (
    SELECT
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
        gas_flow_mean,
        ROW_NUMBER() OVER (PARTITION BY compressor_id ORDER BY agg_timestamp DESC) as rn
    FROM sensor_readings_agg
    WHERE window_type = '1hr'
) sub
WHERE rn = 1;
GO

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
WHERE a.resolved = 0;
GO

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
LEFT JOIN alert_history aa ON c.compressor_id = aa.compressor_id AND aa.resolved = 0
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
GO

-- ===============================================
-- TRIGGER: Auto-update updated_at column
-- ===============================================
-- Azure SQL uses T-SQL triggers instead of PL/pgSQL

CREATE TRIGGER trg_update_compressor_metadata
ON compressor_metadata
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE compressor_metadata
    SET updated_at = GETDATE()
    FROM compressor_metadata cm
    INNER JOIN inserted i ON cm.compressor_id = i.compressor_id;
END;
GO

-- ===============================================
-- SCHEMA COMPLETE
-- ===============================================

PRINT 'Database schema created successfully';
PRINT '  Tables: 7 (station_locations, compressor_metadata, sensor_readings_agg, maintenance_events, alert_history, data_quality_metrics, ml_predictions)';
PRINT '  Views: 3 (v_latest_readings, v_active_alerts, v_fleet_health_summary)';
PRINT '  Indexes: 15';
PRINT '  Triggers: 1';
PRINT '';
PRINT 'Next steps:';
PRINT '  1. Run seed_data_azure_sql.sql to populate station locations';
PRINT '  2. Run data simulator to generate sensor data';
PRINT '  3. Execute ETL pipeline with DB_TYPE=azure_sql';
GO
