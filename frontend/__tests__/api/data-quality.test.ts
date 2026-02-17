/**
 * Tests for GET /api/data-quality route.
 */

import { NextRequest } from 'next/server';

jest.mock('../../src/lib/session', () => ({
  getAppSession: jest.fn(),
}));

jest.mock('../../src/lib/queries', () => ({
  getDataQualityMetrics: jest.fn(),
}));

jest.mock('../../src/lib/errors', () => ({
  handleApiError: jest.fn().mockImplementation(() => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }),
}));

import { getAppSession } from '../../src/lib/session';
import { getDataQualityMetrics } from '../../src/lib/queries';
import { GET } from '../../src/app/api/data-quality/route';

const mockGetAppSession = getAppSession as jest.MockedFunction<typeof getAppSession>;
const mockGetDataQualityMetrics = getDataQualityMetrics as jest.MockedFunction<typeof getDataQualityMetrics>;

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
  const url = new URL('http://localhost:3000/api/data-quality');
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

describe('GET /api/data-quality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetAppSession.mockResolvedValue(null);
    const response = await GET(makeRequest());
    expect(response.status).toBe(401);
  });

  it('returns data quality metrics with default params', async () => {
    mockGetAppSession.mockResolvedValue(session);
    const mockData = [{ compressor_id: 'COMP-001', completeness: 0.98 }];
    mockGetDataQualityMetrics.mockResolvedValue(mockData as any);

    const response = await GET(makeRequest());
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toEqual(mockData);
    expect(mockGetDataQualityMetrics).toHaveBeenCalledWith({
      organizationId: 'org-1',
      compressor: undefined,
      hours: 24,
    });
  });

  it('passes compressor and hours params', async () => {
    mockGetAppSession.mockResolvedValue(session);
    mockGetDataQualityMetrics.mockResolvedValue([]);

    await GET(makeRequest({ compressor: 'COMP-002', hours: '48' }));
    expect(mockGetDataQualityMetrics).toHaveBeenCalledWith({
      organizationId: 'org-1',
      compressor: 'COMP-002',
      hours: 48,
    });
  });

  it('uses fallback for invalid hours value', async () => {
    mockGetAppSession.mockResolvedValue(session);
    mockGetDataQualityMetrics.mockResolvedValue([]);

    await GET(makeRequest({ hours: 'invalid' }));
    expect(mockGetDataQualityMetrics).toHaveBeenCalledWith(
      expect.objectContaining({ hours: 24 })
    );
  });

  it('returns 500 when query throws', async () => {
    mockGetAppSession.mockResolvedValue(session);
    mockGetDataQualityMetrics.mockRejectedValue(new Error('DB error'));

    const response = await GET(makeRequest());
    expect(response.status).toBe(500);
  });
});
