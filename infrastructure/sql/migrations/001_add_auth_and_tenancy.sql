-- ===============================================
-- MIGRATION 001: Auth + Multi-Tenancy Tables
-- ===============================================
-- Adds organizations, users, and organization_id to existing tables
-- Run this AFTER the base schema.sql + seed_data.sql

-- 1. Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
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

CREATE INDEX IF NOT EXISTS idx_org_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_org_stripe ON organizations(stripe_customer_id);

COMMENT ON TABLE organizations IS 'Multi-tenant organizations for SaaS billing and data isolation';

-- 2. Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(200),
    azure_ad_id VARCHAR(255) UNIQUE,
    role VARCHAR(20) DEFAULT 'viewer'
        CHECK (role IN ('owner', 'admin', 'operator', 'viewer')),
    avatar_url TEXT,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_azure_ad ON users(azure_ad_id);

COMMENT ON TABLE users IS 'Authenticated users with organization membership and RBAC roles';

-- 3. Create billing_events table
CREATE TABLE IF NOT EXISTS billing_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    stripe_event_id VARCHAR(100) UNIQUE,
    event_type VARCHAR(50) NOT NULL,
    amount_cents INT,
    currency VARCHAR(3) DEFAULT 'usd',
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_billing_org ON billing_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_billing_stripe_event ON billing_events(stripe_event_id);

COMMENT ON TABLE billing_events IS 'Stripe billing event log for audit trail';

-- 4. Add organization_id to station_locations
ALTER TABLE station_locations
    ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

CREATE INDEX IF NOT EXISTS idx_station_org ON station_locations(organization_id);

-- 5. Add organization_id to compressor_metadata
ALTER TABLE compressor_metadata
    ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

CREATE INDEX IF NOT EXISTS idx_compressor_org ON compressor_metadata(organization_id);

-- 6. Create default organization and backfill existing data
DO $$
DECLARE
    default_org_id UUID;
BEGIN
    -- Insert default org if not exists
    INSERT INTO organizations (name, slug, subscription_tier, max_compressors)
    VALUES ('Altaviz Demo', 'altaviz-demo', 'enterprise', 100)
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO default_org_id;

    -- If org already existed, fetch its id
    IF default_org_id IS NULL THEN
        SELECT id INTO default_org_id FROM organizations WHERE slug = 'altaviz-demo';
    END IF;

    -- Backfill station_locations
    UPDATE station_locations SET organization_id = default_org_id
    WHERE organization_id IS NULL;

    -- Backfill compressor_metadata
    UPDATE compressor_metadata SET organization_id = default_org_id
    WHERE organization_id IS NULL;

    RAISE NOTICE 'Default organization created with id: %', default_org_id;
END $$;

-- 7. Recreate views with organization awareness
DROP VIEW IF EXISTS v_fleet_health_summary CASCADE;
DROP VIEW IF EXISTS v_active_alerts CASCADE;
DROP VIEW IF EXISTS v_latest_readings CASCADE;

-- View 1: Latest sensor readings per compressor (1hr window)
CREATE VIEW v_latest_readings AS
SELECT DISTINCT ON (compressor_id)
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

COMMENT ON VIEW v_latest_readings IS 'Latest 1-hour aggregated readings with organization context';

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
    s.station_name,
    c.organization_id
FROM alert_history a
JOIN compressor_metadata c ON a.compressor_id = c.compressor_id
JOIN station_locations s ON c.station_id = s.station_id
WHERE a.resolved = FALSE
ORDER BY a.alert_timestamp DESC, a.severity DESC;

COMMENT ON VIEW v_active_alerts IS 'Unresolved alerts with organization context';

-- View 3: Fleet health summary
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
    c.compressor_id,
    c.model,
    c.station_id,
    s.station_name,
    c.latitude,
    c.longitude,
    c.organization_id,
    lr.agg_timestamp,
    lr.vibration_max,
    lr.discharge_temp_max,
    lr.discharge_pressure_mean;

COMMENT ON VIEW v_fleet_health_summary IS 'Fleet health with organization context for multi-tenant filtering';

-- 8. Add updated_at trigger to new tables
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===============================================
-- MIGRATION COMPLETE
-- ===============================================
DO $$
BEGIN
    RAISE NOTICE 'Migration 001 complete:';
    RAISE NOTICE '  + organizations table';
    RAISE NOTICE '  + users table';
    RAISE NOTICE '  + billing_events table';
    RAISE NOTICE '  + organization_id on station_locations';
    RAISE NOTICE '  + organization_id on compressor_metadata';
    RAISE NOTICE '  + views recreated with org awareness';
    RAISE NOTICE '  + default "altaviz-demo" organization created';
END $$;
