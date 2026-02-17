/**
 * Tests for GET /api/maintenance route.
 */

import { NextRequest } from 'next/server';

jest.mock('../../src/lib/session', () => ({
  getAppSession: jest.fn(),
}));

jest.mock('../../src/lib/queries', () => ({
  getMaintenanceEvents: jest.fn(),
}));

jest.mock('../../src/lib/errors', () => ({
  handleApiError: jest.fn().mockImplementation(() => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }),
}));

import { getAppSession } from '../../src/lib/session';
import { getMaintenanceEvents } from '../../src/lib/queries';
import { GET } from '../../src/app/api/maintenance/route';

const mockGetAppSession = getAppSession as jest.MockedFunction<typeof getAppSession>;
const mockGetMaintenanceEvents = getMaintenanceEvents as jest.MockedFunction<typeof getMaintenanceEvents>;

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
  const url = new URL('http://localhost:3000/api/maintenance');
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

describe('GET /api/maintenance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetAppSession.mockResolvedValue(null);
    const response = await GET(makeRequest());
    expect(response.status).toBe(401);
  });

  it('returns all maintenance events when no compressor filter', async () => {
    mockGetAppSession.mockResolvedValue(session);
    const mockData = [{ id: 1, compressor_id: 'COMP-001', event_type: 'oil_change' }];
    mockGetMaintenanceEvents.mockResolvedValue(mockData as any);

    const response = await GET(makeRequest());
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toEqual(mockData);
    expect(mockGetMaintenanceEvents).toHaveBeenCalledWith('org-1', undefined);
  });

  it('passes compressor filter to query', async () => {
    mockGetAppSession.mockResolvedValue(session);
    mockGetMaintenanceEvents.mockResolvedValue([]);

    await GET(makeRequest({ compressor: 'COMP-003' }));
    expect(mockGetMaintenanceEvents).toHaveBeenCalledWith('org-1', 'COMP-003');
  });

  it('returns 500 when query throws', async () => {
    mockGetAppSession.mockResolvedValue(session);
    mockGetMaintenanceEvents.mockRejectedValue(new Error('DB error'));

    const response = await GET(makeRequest());
    expect(response.status).toBe(500);
  });
});
