/**
 * Tests for database pool configuration and query helper.
 */

// Mock pg before importing db module
const mockQuery = jest.fn();
const mockRelease = jest.fn();
const mockConnect = jest.fn().mockResolvedValue({
  query: mockQuery,
  release: mockRelease,
});
const mockOn = jest.fn();
const mockEnd = jest.fn();

jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    connect: mockConnect,
    on: mockOn,
    end: mockEnd,
    query: mockQuery,
  })),
}));

describe('db module', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    mockQuery.mockReset();
    mockRelease.mockReset();
    mockConnect.mockReset().mockResolvedValue({
      query: mockQuery,
      release: mockRelease,
    });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('creates pool with default config values', () => {
    const { Pool } = require('pg');
    require('../../src/lib/db');

    expect(Pool).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'localhost',
        port: 5432,
        database: 'compressor_health',
        user: 'postgres',
        max: 20,
        application_name: 'altaviz-frontend',
      })
    );
  });

  it('uses env vars for pool config', () => {
    process.env.DB_HOST = 'custom-host';
    process.env.DB_PORT = '5433';
    process.env.DB_POOL_MAX = '50';
    process.env.DB_STATEMENT_TIMEOUT = '60000';

    const { Pool } = require('pg');
    require('../../src/lib/db');

    expect(Pool).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'custom-host',
        port: 5433,
        max: 50,
        statement_timeout: 60000,
      })
    );
  });

  it('enables SSL when DB_SSL=true', () => {
    process.env.DB_SSL = 'true';

    const { Pool } = require('pg');
    require('../../src/lib/db');

    expect(Pool).toHaveBeenCalledWith(
      expect.objectContaining({
        ssl: { rejectUnauthorized: true },
      })
    );
  });

  it('query function releases client after success', async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: 1 }] });

    const { query } = require('../../src/lib/db');
    const result = await query('SELECT 1');

    expect(result).toEqual([{ id: 1 }]);
    expect(mockRelease).toHaveBeenCalled();
  });

  it('query function releases client after error', async () => {
    mockQuery.mockRejectedValue(new Error('DB error'));

    const { query } = require('../../src/lib/db');
    await expect(query('BAD SQL')).rejects.toThrow('DB error');
    expect(mockRelease).toHaveBeenCalled();
  });
});
