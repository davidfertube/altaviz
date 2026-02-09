-- ===============================================
-- COMPRESSOR HEALTH MONITORING - SEED DATA
-- Azure SQL Database Compatible
-- ===============================================

-- Insert station locations (Texas natural gas basins)
-- Uses MERGE instead of ON CONFLICT (Azure SQL syntax)
MERGE INTO station_locations AS target
USING (VALUES
    ('STATION-A', 'Eagle Ford Station A', 28.9144, -98.5242, 'South Texas', 'Karnes City', 'TX'),
    ('STATION-B', 'Permian Basin Station B', 31.9973, -102.0779, 'West Texas', 'Midland', 'TX'),
    ('STATION-C', 'Haynesville Station C', 32.5007, -93.7465, 'East Texas', 'Carthage', 'TX'),
    ('STATION-D', 'Barnett Shale Station D', 32.7555, -97.3308, 'North Texas', 'Fort Worth', 'TX')
) AS source (station_id, station_name, latitude, longitude, region, city, state)
ON target.station_id = source.station_id
WHEN NOT MATCHED THEN
    INSERT (station_id, station_name, latitude, longitude, region, city, state)
    VALUES (source.station_id, source.station_name, source.latitude, source.longitude, source.region, source.city, source.state);
GO

PRINT 'Seed data loaded successfully';
PRINT '  Station locations: 4 (STATION-A through STATION-D)';
PRINT '  Geographic coverage: Texas natural gas basins';
GO
