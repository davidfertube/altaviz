-- ===============================================
-- COMPRESSOR HEALTH MONITORING - SEED DATA
-- ===============================================
-- Initial data for station locations and reference data

-- Insert station locations (Texas natural gas basins)
INSERT INTO station_locations (station_id, station_name, latitude, longitude, region, city, state) VALUES
    ('STATION-A', 'Eagle Ford Station A', 28.9144, -98.5242, 'South Texas', 'Karnes City', 'TX'),
    ('STATION-B', 'Permian Basin Station B', 31.9973, -102.0779, 'West Texas', 'Midland', 'TX'),
    ('STATION-C', 'Haynesville Station C', 32.5007, -93.7465, 'East Texas', 'Carthage', 'TX'),
    ('STATION-D', 'Barnett Shale Station D', 32.7555, -97.3308, 'North Texas', 'Fort Worth', 'TX')
ON CONFLICT (station_id) DO NOTHING;

-- Summary message
DO $$
BEGIN
    RAISE NOTICE '✓ Seed data loaded successfully';
    RAISE NOTICE '  Station locations: 4 (STATION-A through STATION-D)';
    RAISE NOTICE '  Geographic coverage: Texas natural gas basins';
    RAISE NOTICE '';
    RAISE NOTICE 'Database is ready for compressor metadata and sensor data ingestion';
END $$;
