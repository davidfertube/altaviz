/**
 * Tests for GET /api/readings/latest route.
 */

jest.mock('../../src/lib/session', () => ({
  getAppSession: jest.fn(),
}));

jest.mock('../../src/lib/queries', () => ({
  getLatestReadings: jest.fn(),
}));

jest.mock('../../src/lib/errors', () => ({
  handleApiError: jest.fn().mockImplementation(() => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }),
}));

import { getAppSession } from '../../src/lib/session';
import { getLatestReadings } from '../../src/lib/queries';
import { GET } from '../../src/app/api/readings/latest/route';

const mockGetAppSession = getAppSession as jest.MockedFunction<typeof getAppSession>;
const mockGetLatestReadings = getLatestReadings as jest.MockedFunction<typeof getLatestReadings>;

const session = {
  userId: 'u1',
  email: 'a@b.com',
  name: 'Admin',
  organizationId: 'org-1',
  organizationName: 'Test',
  role: 'owner',
  subscriptionTier: 'pro',
};

describe('GET /api/readings/latest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetAppSession.mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it('returns latest readings when authenticated', async () => {
    mockGetAppSession.mockResolvedValue(session);
    const mockData = [{ compressor_id: 'COMP-001', avg_temperature: 185.5 }];
    mockGetLatestReadings.mockResolvedValue(mockData as any);

    const response = await GET();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toEqual(mockData);
    expect(mockGetLatestReadings).toHaveBeenCalledWith('org-1');
  });

  it('returns 500 when query throws', async () => {
    mockGetAppSession.mockResolvedValue(session);
    mockGetLatestReadings.mockRejectedValue(new Error('DB error'));

    const response = await GET();
    expect(response.status).toBe(500);
  });
});
