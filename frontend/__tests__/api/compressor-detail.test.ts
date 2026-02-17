/**
 * Tests for GET /api/compressors/[compressorId] route.
 */

import { NextRequest } from 'next/server';

jest.mock('../../src/lib/session', () => ({
  getAppSession: jest.fn(),
}));

jest.mock('../../src/lib/queries', () => ({
  getCompressor: jest.fn(),
  getLatestPrediction: jest.fn(),
}));

jest.mock('../../src/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('../../src/lib/errors', () => ({
  handleApiError: jest.fn().mockImplementation(() => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }),
}));

import { getAppSession } from '../../src/lib/session';
import { getCompressor, getLatestPrediction } from '../../src/lib/queries';
import { query } from '../../src/lib/db';
import { GET } from '../../src/app/api/compressors/[compressorId]/route';

const mockGetAppSession = getAppSession as jest.MockedFunction<typeof getAppSession>;
const mockGetCompressor = getCompressor as jest.MockedFunction<typeof getCompressor>;
const mockGetLatestPrediction = getLatestPrediction as jest.MockedFunction<typeof getLatestPrediction>;
const mockQuery = query as jest.MockedFunction<typeof query>;

const session = {
  userId: 'u1',
  email: 'a@b.com',
  name: 'Admin',
  organizationId: 'org-1',
  organizationName: 'Test',
  role: 'owner',
  subscriptionTier: 'pro',
};

function makeRequest() {
  return new NextRequest('http://localhost:3000/api/compressors/COMP-001');
}

const makeParams = (compressorId = 'COMP-001') => Promise.resolve({ compressorId });

describe('GET /api/compressors/[compressorId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetAppSession.mockResolvedValue(null);
    const response = await GET(makeRequest(), { params: makeParams() });
    expect(response.status).toBe(401);
  });

  it('returns 400 for invalid compressor ID format', async () => {
    mockGetAppSession.mockResolvedValue(session);

    const response = await GET(makeRequest(), { params: makeParams('INVALID') });
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe('Invalid pipeline ID format');
  });

  it('returns 404 when compressor not found', async () => {
    mockGetAppSession.mockResolvedValue(session);
    mockGetCompressor.mockResolvedValue([] as any);

    const response = await GET(makeRequest(), { params: makeParams() });
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.error).toBe('Pipeline not found');
  });

  it('returns compressor detail with latest reading and prediction', async () => {
    mockGetAppSession.mockResolvedValue(session);
    const metadata = { compressor_id: 'COMP-001', model: 'CAT 3512', station_name: 'Alpha' };
    const latestReading = { compressor_id: 'COMP-001', avg_temperature: 185.5 };
    const prediction = { compressor_id: 'COMP-001', anomaly_score: 0.2 };

    mockGetCompressor.mockResolvedValue([metadata] as any);
    mockQuery.mockResolvedValue([latestReading] as any);
    mockGetLatestPrediction.mockResolvedValue([prediction] as any);

    const response = await GET(makeRequest(), { params: makeParams() });
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.metadata).toEqual(metadata);
    expect(body.latestReading).toEqual(latestReading);
    expect(body.prediction).toEqual(prediction);
  });

  it('returns null for latestReading and prediction when empty', async () => {
    mockGetAppSession.mockResolvedValue(session);
    const metadata = { compressor_id: 'COMP-001', model: 'CAT 3512', station_name: 'Alpha' };

    mockGetCompressor.mockResolvedValue([metadata] as any);
    mockQuery.mockResolvedValue([]);
    mockGetLatestPrediction.mockResolvedValue([]);

    const response = await GET(makeRequest(), { params: makeParams() });
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.latestReading).toBeNull();
    expect(body.prediction).toBeNull();
  });

  it('accepts PL- prefix format', async () => {
    mockGetAppSession.mockResolvedValue(session);
    const metadata = { compressor_id: 'PL-001', model: 'Model X', station_name: 'Beta' };

    mockGetCompressor.mockResolvedValue([metadata] as any);
    mockQuery.mockResolvedValue([]);
    mockGetLatestPrediction.mockResolvedValue([]);

    const response = await GET(makeRequest(), { params: makeParams('PL-001') });
    expect(response.status).toBe(200);
  });

  it('returns 500 when query throws', async () => {
    mockGetAppSession.mockResolvedValue(session);
    mockGetCompressor.mockRejectedValue(new Error('DB error'));

    const response = await GET(makeRequest(), { params: makeParams() });
    expect(response.status).toBe(500);
  });
});
