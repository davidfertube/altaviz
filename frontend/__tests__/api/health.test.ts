import { GET } from '@/app/api/health/route';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {},
  query: jest.fn(),
}));

import { query } from '@/lib/db';
const mockQuery = query as jest.MockedFunction<typeof query>;

describe('GET /api/health', () => {
  it('returns healthy when database is reachable', async () => {
    mockQuery.mockResolvedValueOnce([{ '?column?': 1 }]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('healthy');
    expect(body.checks.database).toBe('ok');
    expect(body.timestamp).toBeDefined();
  });

  it('returns degraded when database is unreachable', async () => {
    mockQuery.mockRejectedValueOnce(new Error('Connection refused'));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe('degraded');
    expect(body.checks.database).toBe('error');
  });
});
