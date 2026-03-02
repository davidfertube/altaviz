-- ===============================================
-- ALTAVIZ UNIFIED SCHEMA (PostgreSQL 14+)
-- ===============================================
-- Multi-tenant pipeline integrity monitoring system
-- Includes: 20 tables, 5 views, triggers, seed data
-- Run once on a fresh PostgreSQL database (e.g. Supabase)

-- Drop existing objects for clean install
DROP VIEW IF EXISTS v_agent_activity CASCADE;
DROP VIEW IF EXISTS v_open_work_orders CASCADE;
DROP VIEW IF EXISTS v_fleet_health_summary CASCADE;
DROP VIEW IF EXISTS v_active_alerts CASCADE;
DROP VIEW IF EXISTS v_latest_readings CASCADE;

DROP TABLE IF EXISTS fleet_snapshots CASCADE;
DROP TABLE IF EXISTS agent_sessions CASCADE;
DROP TABLE IF EXISTS optimization_recommendations CASCADE;
DROP TABLE IF EXISTS work_order_transitions CASCADE;
DROP TABLE IF EXISTS work_orders CASCADE;
DROP TABLE IF EXISTS investigation_reports CASCADE;
DROP TABLE IF EXISTS knowledge_base CASCADE;
DROP TABLE IF EXISTS emissions_estimates CASCADE;
DROP TABLE IF EXISTS ml_predictions CASCADE;
DROP TABLE IF EXISTS data_quality_metrics CASCADE;
DROP TABLE IF EXISTS alert_history CASCADE;
DROP TABLE IF EXISTS maintenance_events CASCADE;
DROP TABLE IF EXISTS sensor_readings_agg CASCADE;
DROP TABLE IF EXISTS billing_events CASCADE;
DROP TABLE IF EXISTS pipeline_runs CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS compressor_metadata CASCADE;
DROP TABLE IF EXISTS station_locations CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- Enable pgvector for RAG embedding storage
CREATE EXTENSION IF NOT EXISTS vector;

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

-- ===============================================
-- AUDIT LOG TABLE
-- ===============================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id              BIGSERIAL PRIMARY KEY,
    user_id         UUID REFERENCES users(id),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    action          VARCHAR(100) NOT NULL,
    resource_type   VARCHAR(50) NOT NULL,
    resource_id     VARCHAR(255),
    ip_address      INET,
    details         JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created ON audit_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);


-- ============================================================================
-- PIPELINE OBSERVABILITY
-- ============================================================================

CREATE TABLE IF NOT EXISTS pipeline_runs (
    id              SERIAL PRIMARY KEY,
    run_id          UUID NOT NULL DEFAULT gen_random_uuid(),
    started_at      TIMESTAMPTZ NOT NULL,
    completed_at    TIMESTAMPTZ,
    status          VARCHAR(20) CHECK (status IN ('running', 'success', 'failed', 'partial')),
    bronze_rows     INT,
    silver_rows     INT,
    gold_rows       INT,
    alerts_generated INT,
    ml_models_run   INT,
    duration_seconds DECIMAL(10, 2),
    stage_durations JSONB,
    error_message   TEXT,
    organization_id UUID REFERENCES organizations(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_runs_org ON pipeline_runs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_status ON pipeline_runs(status, created_at DESC);

-- ============================================================================
-- AGENTIC SYSTEM TABLES
-- ============================================================================

-- ============================================================================
-- WORK ORDERS (Use Case 1: Work Order Orchestration Agent)
-- ============================================================================

CREATE TABLE work_orders (
    id              SERIAL PRIMARY KEY,
    work_order_id   VARCHAR(20) UNIQUE NOT NULL,
    compressor_id   VARCHAR(50) NOT NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id),

    -- Source tracking (what triggered this work order)
    source_type     VARCHAR(30) NOT NULL CHECK (source_type IN (
        'alert_triggered', 'investigation', 'optimization', 'manual', 'scheduled'
    )),
    source_id       VARCHAR(100),

    -- Work order details
    title           VARCHAR(300) NOT NULL,
    description     TEXT,
    priority        VARCHAR(20) NOT NULL CHECK (priority IN (
        'emergency', 'urgent', 'high', 'medium', 'low'
    )),
    category        VARCHAR(50) CHECK (category IN (
        'mechanical_repair', 'inspection', 'preventive', 'calibration',
        'emissions_compliance', 'optimization', 'emergency_shutdown'
    )),

    -- State machine
    status          VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft', 'pending_approval', 'approved', 'assigned', 'in_progress',
        'completed', 'verified', 'cancelled', 'rejected'
    )),

    -- Assignment
    assigned_to     VARCHAR(200),
    approved_by     UUID REFERENCES users(id),
    approved_at     TIMESTAMP,

    -- Scheduling
    estimated_hours DECIMAL(6,2),
    estimated_cost  DECIMAL(12,2),
    scheduled_date  DATE,
    due_date        DATE,

    -- Completion
    actual_hours    DECIMAL(6,2),
    actual_cost     DECIMAL(12,2),
    completed_at    TIMESTAMP,
    completion_notes TEXT,
    parts_replaced  JSONB,

    -- AI metadata
    ai_confidence   DECIMAL(5,4),
    ai_reasoning    TEXT,

    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_wo_compressor FOREIGN KEY (compressor_id)
        REFERENCES compressor_metadata(compressor_id) ON DELETE CASCADE
);

CREATE INDEX idx_wo_org_status ON work_orders(organization_id, status);
CREATE INDEX idx_wo_compressor ON work_orders(compressor_id, created_at DESC);
CREATE INDEX idx_wo_priority ON work_orders(priority, status) WHERE status NOT IN ('completed', 'cancelled', 'rejected', 'verified');
CREATE INDEX idx_wo_scheduled ON work_orders(scheduled_date) WHERE status IN ('approved', 'assigned');

CREATE TRIGGER update_work_orders_updated_at
    BEFORE UPDATE ON work_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- WORK ORDER TRANSITIONS (audit trail for state machine)
-- ============================================================================

CREATE TABLE work_order_transitions (
    id              SERIAL PRIMARY KEY,
    work_order_id   VARCHAR(20) NOT NULL REFERENCES work_orders(work_order_id),
    from_status     VARCHAR(20),
    to_status       VARCHAR(20) NOT NULL,
    transitioned_by UUID REFERENCES users(id),
    agent_name      VARCHAR(50),
    reason          TEXT,
    metadata        JSONB,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wot_wo ON work_order_transitions(work_order_id, created_at DESC);

-- ============================================================================
-- INVESTIGATION REPORTS (Use Case 2: Root Cause Investigation Agent)
-- ============================================================================

CREATE TABLE investigation_reports (
    id              SERIAL PRIMARY KEY,
    investigation_id VARCHAR(30) UNIQUE NOT NULL,
    compressor_id   VARCHAR(50) NOT NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id),

    -- Trigger
    trigger_type    VARCHAR(30) NOT NULL CHECK (trigger_type IN (
        'alert', 'anomaly', 'work_order', 'optimization', 'manual'
    )),
    trigger_id      VARCHAR(100),

    -- Analysis results
    root_cause      TEXT NOT NULL,
    confidence      DECIMAL(5,4) NOT NULL,
    failure_mode    VARCHAR(50),
    severity        VARCHAR(20) NOT NULL CHECK (severity IN (
        'healthy', 'early_warning', 'warning', 'critical', 'emergency'
    )),

    -- Structured evidence
    evidence_chain  JSONB NOT NULL,
    contributing_factors JSONB,
    similar_incidents JSONB,

    -- Recommendations
    recommended_actions JSONB NOT NULL,
    estimated_rul_hours DECIMAL(10,2),
    estimated_repair_cost DECIMAL(12,2),

    -- RAG sources
    knowledge_sources JSONB,

    -- Learning / feedback
    technician_feedback TEXT,
    feedback_rating INT CHECK (feedback_rating BETWEEN 1 AND 5),
    was_correct     BOOLEAN,

    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_inv_compressor FOREIGN KEY (compressor_id)
        REFERENCES compressor_metadata(compressor_id) ON DELETE CASCADE
);

CREATE INDEX idx_inv_org ON investigation_reports(organization_id, created_at DESC);
CREATE INDEX idx_inv_compressor ON investigation_reports(compressor_id, created_at DESC);
CREATE INDEX idx_inv_failure_mode ON investigation_reports(failure_mode);

CREATE TRIGGER update_investigation_reports_updated_at
    BEFORE UPDATE ON investigation_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- KNOWLEDGE BASE (Use Case 2: RAG source documents with pgvector)
-- ============================================================================

CREATE TABLE knowledge_base (
    id              SERIAL PRIMARY KEY,
    doc_id          VARCHAR(50) UNIQUE NOT NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id),

    doc_type        VARCHAR(30) NOT NULL CHECK (doc_type IN (
        'maintenance_manual', 'service_bulletin', 'incident_report',
        'best_practice', 'oem_spec', 'regulatory', 'learned_lesson'
    )),
    title           VARCHAR(500) NOT NULL,
    content         TEXT NOT NULL,

    -- Metadata for filtering
    compressor_models JSONB,
    failure_modes   JSONB,
    components      JSONB,

    -- pgvector embedding (1536-dim for text-embedding-3-small)
    embedding       vector(1536),

    source_url      TEXT,
    version         VARCHAR(20),

    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_kb_org ON knowledge_base(organization_id);
CREATE INDEX idx_kb_type ON knowledge_base(doc_type);
CREATE INDEX idx_kb_embedding ON knowledge_base USING hnsw (embedding vector_cosine_ops);

CREATE TRIGGER update_knowledge_base_updated_at
    BEFORE UPDATE ON knowledge_base
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- OPTIMIZATION RECOMMENDATIONS (Use Case 3: Fleet Optimization Copilot)
-- ============================================================================

CREATE TABLE optimization_recommendations (
    id              SERIAL PRIMARY KEY,
    recommendation_id VARCHAR(30) UNIQUE NOT NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id),

    rec_type        VARCHAR(30) NOT NULL CHECK (rec_type IN (
        'load_balance', 'deferred_maintenance', 'emissions_reduction',
        'efficiency_improvement', 'preventive_schedule', 'fleet_reconfig'
    )),

    -- Scope
    scope           VARCHAR(20) NOT NULL CHECK (scope IN (
        'compressor', 'station', 'basin', 'fleet'
    )),
    target_ids      JSONB NOT NULL,

    -- Recommendation
    title           VARCHAR(300) NOT NULL,
    description     TEXT NOT NULL,
    priority        VARCHAR(20) NOT NULL CHECK (priority IN (
        'critical', 'high', 'medium', 'low', 'informational'
    )),

    -- Impact estimates
    estimated_savings_usd  DECIMAL(12,2),
    estimated_emissions_reduction_tonnes DECIMAL(10,4),
    estimated_uptime_improvement_pct DECIMAL(5,2),

    -- What-if scenario results
    scenario_data   JSONB,

    -- Status
    status          VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'accepted', 'implemented', 'dismissed', 'expired'
    )),
    accepted_by     UUID REFERENCES users(id),

    -- Link to work order if acted upon
    work_order_id   VARCHAR(20) REFERENCES work_orders(work_order_id),

    ai_confidence   DECIMAL(5,4),

    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at      TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_opt_org_status ON optimization_recommendations(organization_id, status);
CREATE INDEX idx_opt_type ON optimization_recommendations(rec_type);

CREATE TRIGGER update_optimization_recommendations_updated_at
    BEFORE UPDATE ON optimization_recommendations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- AGENT SESSIONS (shared: conversation memory & context for all 3 agents)
-- ============================================================================

CREATE TABLE agent_sessions (
    id              SERIAL PRIMARY KEY,
    session_id      UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    user_id         UUID REFERENCES users(id),

    agent_type      VARCHAR(30) NOT NULL CHECK (agent_type IN (
        'work_order', 'investigation', 'optimization', 'diagnostics'
    )),

    -- Context
    compressor_id   VARCHAR(50),
    trigger_type    VARCHAR(30),
    trigger_id      VARCHAR(100),

    -- Conversation
    messages        JSONB NOT NULL DEFAULT '[]',
    context         JSONB,

    -- Result
    result_type     VARCHAR(30),
    result_id       VARCHAR(100),

    status          VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN (
        'active', 'waiting_approval', 'completed', 'failed', 'expired'
    )),

    -- Metrics
    total_tokens    INT DEFAULT 0,
    total_tool_calls INT DEFAULT 0,
    duration_seconds DECIMAL(10,2),

    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at    TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_as_org ON agent_sessions(organization_id, created_at DESC);
CREATE INDEX idx_as_agent ON agent_sessions(agent_type, status);
CREATE INDEX idx_as_user ON agent_sessions(user_id, created_at DESC);

CREATE TRIGGER update_agent_sessions_updated_at
    BEFORE UPDATE ON agent_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FLEET SNAPSHOTS (Use Case 3: periodic fleet health captures)
-- ============================================================================

CREATE TABLE fleet_snapshots (
    id              SERIAL PRIMARY KEY,
    snapshot_id     VARCHAR(30) UNIQUE NOT NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id),

    snapshot_type   VARCHAR(20) NOT NULL CHECK (snapshot_type IN (
        'hourly', 'daily', 'weekly'
    )),

    -- Fleet-level metrics
    total_compressors INT,
    healthy_count    INT,
    warning_count    INT,
    critical_count   INT,
    offline_count    INT,

    -- Aggregate health scores
    fleet_health_score DECIMAL(5,2),
    avg_rul_hours    DECIMAL(10,2),
    total_emissions_tonnes DECIMAL(10,4),
    fleet_efficiency_pct DECIMAL(5,2),

    -- Per-basin breakdown
    basin_metrics    JSONB,

    -- Top risks
    top_risks        JSONB,

    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_fs_org ON fleet_snapshots(organization_id, created_at DESC);
CREATE INDEX idx_fs_type ON fleet_snapshots(snapshot_type);

-- ============================================================================
-- AGENTIC SYSTEM VIEWS
-- ============================================================================

CREATE VIEW v_open_work_orders AS
SELECT wo.*, cm.model, cm.station_id, sl.station_name
FROM work_orders wo
JOIN compressor_metadata cm ON wo.compressor_id = cm.compressor_id
JOIN station_locations sl ON cm.station_id = sl.station_id
WHERE wo.status NOT IN ('completed', 'verified', 'cancelled', 'rejected')
ORDER BY
    CASE wo.priority
        WHEN 'emergency' THEN 1
        WHEN 'urgent' THEN 2
        WHEN 'high' THEN 3
        WHEN 'medium' THEN 4
        WHEN 'low' THEN 5
    END,
    wo.created_at;

CREATE VIEW v_agent_activity AS
SELECT
    s.agent_type,
    s.status,
    COUNT(*) as session_count,
    AVG(s.total_tokens) as avg_tokens,
    AVG(s.duration_seconds) as avg_duration_s,
    s.organization_id
FROM agent_sessions s
WHERE s.created_at >= NOW() - INTERVAL '7 days'
GROUP BY s.agent_type, s.status, s.organization_id;
