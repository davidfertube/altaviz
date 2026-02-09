/**
 * Tests for GET /api/compressors/[compressorId]/readings route.
 */

import { NextRequest } from 'next/server';
import { GET } from '../../src/app/api/compressors/[compressorId]/readings/route';

jest.mock('../../src/lib/session', () => ({
  getAppSession: jest.fn(),
}));

jest.mock('../../src/lib/queries', () => ({
  getCompressorReadings: jest.fn(),
}));

jest.mock('../../src/lib/plans', () => ({
  canAccessWindowType: jest.fn(),
}));

jest.mock('../../src/lib/errors', () => ({
  handleApiError: jest.fn().mockImplementation(() => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }),
}));

import { getAppSession } from '../../src/lib/session';
import { getCompressorReadings } from '../../src/lib/queries';
import { canAccessWindowType } from '../../src/lib/plans';

const mockGetAppSession = getAppSession as jest.MockedFunction<typeof getAppSession>;
const mockGetCompressorReadings = getCompressorReadings as jest.MockedFunction<typeof getCompressorReadings>;
const mockCanAccessWindowType = canAccessWindowType as jest.MockedFunction<typeof canAccessWindowType>;

const session = {
  userId: 'u1',
  email: 'a@b.com',
  name: 'Admin',
  organizationId: 'org-1',
  organizationName: 'Test',
  role: 'owner',
  subscriptionTier: 'free',
};

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost:3000/api/compressors/COMP-001/readings');
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

const makeParams = () => Promise.resolve({ compressorId: 'COMP-001' });

describe('GET /api/compressors/[compressorId]/readings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetAppSession.mockResolvedValue(null);
    const response = await GET(makeRequest(), { params: makeParams() });
    expect(response.status).toBe(401);
  });

  it('returns 403 when free tier tries to access 4hr window', async () => {
    mockGetAppSession.mockResolvedValue(session);
    mockCanAccessWindowType.mockReturnValue(false);

    const response = await GET(makeRequest({ window: '4hr' }), { params: makeParams() });
    expect(response.status).toBe(403);

    const body = await response.json();
    expect(body.error).toBe('Upgrade required');
  });

  it('returns readings when plan allows window type', async () => {
    mockGetAppSession.mockResolvedValue({ ...session, subscriptionTier: 'pro' });
    mockCanAccessWindowType.mockReturnValue(true);
    mockGetCompressorReadings.mockResolvedValue([{ id: 1 }] as any);

    const response = await GET(makeRequest({ window: '4hr', hours: '48' }), { params: makeParams() });
    expect(response.status).toBe(200);
    expect(mockGetCompressorReadings).toHaveBeenCalledWith('COMP-001', '4hr', 48, 'org-1');
  });

  it('defaults to 1hr window and 24 hours', async () => {
    mockGetAppSession.mockResolvedValue({ ...session, subscriptionTier: 'pro' });
    mockCanAccessWindowType.mockReturnValue(true);
    mockGetCompressorReadings.mockResolvedValue([]);

    await GET(makeRequest(), { params: makeParams() });
    expect(mockGetCompressorReadings).toHaveBeenCalledWith('COMP-001', '1hr', 24, 'org-1');
  });

  it('clamps hours to valid range', async () => {
    mockGetAppSession.mockResolvedValue({ ...session, subscriptionTier: 'pro' });
    mockCanAccessWindowType.mockReturnValue(true);
    mockGetCompressorReadings.mockResolvedValue([]);

    // hours=500 exceeds max (168), should fallback to 24
    await GET(makeRequest({ hours: '500' }), { params: makeParams() });
    expect(mockGetCompressorReadings).toHaveBeenCalledWith('COMP-001', '1hr', 24, 'org-1');
  });
});
