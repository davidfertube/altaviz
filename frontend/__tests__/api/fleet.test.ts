/**
 * Tests for GET /api/fleet route.
 */

import { GET } from '../../src/app/api/fleet/route';

jest.mock('../../src/lib/session', () => ({
  getAppSession: jest.fn(),
}));

jest.mock('../../src/lib/queries', () => ({
  getFleetHealth: jest.fn(),
}));

jest.mock('../../src/lib/errors', () => ({
  handleApiError: jest.fn().mockImplementation((error, context) => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }),
}));

import { getAppSession } from '../../src/lib/session';
import { getFleetHealth } from '../../src/lib/queries';

const mockGetAppSession = getAppSession as jest.MockedFunction<typeof getAppSession>;
const mockGetFleetHealth = getFleetHealth as jest.MockedFunction<typeof getFleetHealth>;

describe('GET /api/fleet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetAppSession.mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns fleet health data when authenticated', async () => {
    mockGetAppSession.mockResolvedValue({
      userId: 'u1',
      email: 'a@b.com',
      name: 'Admin',
      organizationId: 'org-1',
      organizationName: 'Test',
      role: 'owner',
      subscriptionTier: 'pro',
    });

    const mockData = [
      { compressor_id: 'COMP-001', status: 'healthy' },
      { compressor_id: 'COMP-002', status: 'warning' },
    ];
    mockGetFleetHealth.mockResolvedValue(mockData as any);

    const response = await GET();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toEqual(mockData);
    expect(mockGetFleetHealth).toHaveBeenCalledWith('org-1');
  });

  it('returns 500 when query throws', async () => {
    mockGetAppSession.mockResolvedValue({
      userId: 'u1',
      email: 'a@b.com',
      name: 'Admin',
      organizationId: 'org-1',
      organizationName: 'Test',
      role: 'owner',
      subscriptionTier: 'pro',
    });

    mockGetFleetHealth.mockRejectedValue(new Error('DB connection failed'));

    const response = await GET();
    expect(response.status).toBe(500);
  });
});
