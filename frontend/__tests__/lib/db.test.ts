/**
 * Tests for database pool configuration and query helper.
 */

// Mock pg before importing db module
const mockQuery = jest.fn().mockResolvedValue({ rows: [] });
const mockOn = jest.fn();
const mockEnd = jest.fn();

jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
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
    mockQuery.mockReset().mockResolvedValue({ rows: [] });
    mockOn.mockReset();
    mockEnd.mockReset();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('creates pool with connectionString and default config', async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@myhost:5432/mydb';

    const { Pool } = require('pg');
    const { query } = require('../../src/lib/db');

    // Trigger lazy pool creation
    await query('SELECT 1');

    expect(Pool).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionString: 'postgresql://user:pass@myhost:5432/mydb',
        max: 10,
      })
    );
  });

  it('uses env vars for pool config', async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@myhost:5432/mydb';
    process.env.DB_POOL_MAX = '50';
    process.env.DB_IDLE_TIMEOUT = '60000';

    const { Pool } = require('pg');
    const { query } = require('../../src/lib/db');
    await query('SELECT 1');

    expect(Pool).toHaveBeenCalledWith(
      expect.objectContaining({
        max: 50,
        idleTimeoutMillis: 60000,
      })
    );
  });

  it('enables SSL by default with rejectUnauthorized: false', async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@myhost:5432/mydb';

    const { Pool } = require('pg');
    const { query } = require('../../src/lib/db');
    await query('SELECT 1');

    expect(Pool).toHaveBeenCalledWith(
      expect.objectContaining({
        ssl: { rejectUnauthorized: false },
      })
    );
  });

  it('disables SSL when DATABASE_SSL=false', async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@myhost:5432/mydb';
    process.env.DATABASE_SSL = 'false';

    const { Pool } = require('pg');
    const { query } = require('../../src/lib/db');
    await query('SELECT 1');

    expect(Pool).toHaveBeenCalledWith(
      expect.objectContaining({
        ssl: false,
      })
    );
  });

  it('query function returns rows', async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: 1 }] });

    const { query } = require('../../src/lib/db');
    const result = await query('SELECT 1');

    expect(result).toEqual([{ id: 1 }]);
  });

  it('query function propagates errors', async () => {
    mockQuery.mockRejectedValue(new Error('DB error'));

    const { query } = require('../../src/lib/db');
    await expect(query('BAD SQL')).rejects.toThrow('DB error');
  });
});
