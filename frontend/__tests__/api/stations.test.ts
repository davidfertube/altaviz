/**
 * Tests for GET /api/stations route.
 */

jest.mock('../../src/lib/session', () => ({
  getAppSession: jest.fn(),
}));

jest.mock('../../src/lib/queries', () => ({
  getStations: jest.fn(),
}));

jest.mock('../../src/lib/errors', () => ({
  handleApiError: jest.fn().mockImplementation(() => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }),
}));

import { getAppSession } from '../../src/lib/session';
import { getStations } from '../../src/lib/queries';
import { GET } from '../../src/app/api/stations/route';

const mockGetAppSession = getAppSession as jest.MockedFunction<typeof getAppSession>;
const mockGetStations = getStations as jest.MockedFunction<typeof getStations>;

const session = {
  userId: 'u1',
  email: 'a@b.com',
  name: 'Admin',
  organizationId: 'org-1',
  organizationName: 'Test',
  role: 'owner',
  subscriptionTier: 'pro',
};

describe('GET /api/stations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetAppSession.mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it('returns station data when authenticated', async () => {
    mockGetAppSession.mockResolvedValue(session);
    const mockData = [{ station_id: 'STN-001', station_name: 'Alpha', compressor_count: 3 }];
    mockGetStations.mockResolvedValue(mockData as any);

    const response = await GET();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toEqual(mockData);
    expect(mockGetStations).toHaveBeenCalledWith('org-1');
  });

  it('returns 500 when query throws', async () => {
    mockGetAppSession.mockResolvedValue(session);
    mockGetStations.mockRejectedValue(new Error('DB error'));

    const response = await GET();
    expect(response.status).toBe(500);
  });
});
