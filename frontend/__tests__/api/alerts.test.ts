/**
 * Tests for GET /api/alerts route.
 */

import { NextRequest } from 'next/server';
import { GET } from '../../src/app/api/alerts/route';

jest.mock('../../src/lib/session', () => ({
  getAppSession: jest.fn(),
}));

jest.mock('../../src/lib/queries', () => ({
  getAlerts: jest.fn(),
  getActiveAlerts: jest.fn(),
}));

jest.mock('../../src/lib/errors', () => ({
  handleApiError: jest.fn().mockImplementation(() => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }),
}));

import { getAppSession } from '../../src/lib/session';
import { getAlerts, getActiveAlerts } from '../../src/lib/queries';

const mockGetAppSession = getAppSession as jest.MockedFunction<typeof getAppSession>;
const mockGetAlerts = getAlerts as jest.MockedFunction<typeof getAlerts>;
const mockGetActiveAlerts = getActiveAlerts as jest.MockedFunction<typeof getActiveAlerts>;

const session = {
  userId: 'u1',
  email: 'a@b.com',
  name: 'Admin',
  organizationId: 'org-1',
  organizationName: 'Test',
  role: 'owner',
  subscriptionTier: 'pro',
};

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost:3000/api/alerts');
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

describe('GET /api/alerts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetAppSession.mockResolvedValue(null);
    const response = await GET(makeRequest());
    expect(response.status).toBe(401);
  });

  it('uses getActiveAlerts for status=active with no other filters', async () => {
    mockGetAppSession.mockResolvedValue(session);
    mockGetActiveAlerts.mockResolvedValue([{ id: 1 }] as any);

    const response = await GET(makeRequest({ status: 'active' }));
    expect(response.status).toBe(200);
    expect(mockGetActiveAlerts).toHaveBeenCalledWith('org-1');
    expect(mockGetAlerts).not.toHaveBeenCalled();
  });

  it('uses getAlerts for filtered queries', async () => {
    mockGetAppSession.mockResolvedValue(session);
    mockGetAlerts.mockResolvedValue([]);

    const response = await GET(makeRequest({ severity: 'critical', limit: '10' }));
    expect(response.status).toBe(200);
    expect(mockGetAlerts).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        severity: 'critical',
        limit: 10,
      })
    );
  });

  it('validates limit parameter bounds', async () => {
    mockGetAppSession.mockResolvedValue(session);
    mockGetAlerts.mockResolvedValue([]);

    // limit over max should clamp to fallback (50)
    await GET(makeRequest({ limit: '999999' }));
    expect(mockGetAlerts).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 50 })
    );
  });

  it('ignores invalid severity values', async () => {
    mockGetAppSession.mockResolvedValue(session);
    mockGetAlerts.mockResolvedValue([]);

    await GET(makeRequest({ severity: 'invalid_value' }));
    expect(mockGetAlerts).toHaveBeenCalledWith(
      expect.objectContaining({ severity: undefined })
    );
  });
});
