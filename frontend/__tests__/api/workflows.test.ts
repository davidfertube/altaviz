/**
 * Tests for POST /api/workflows/run route.
 */

import { NextRequest } from 'next/server';
import { POST } from '../../src/app/api/workflows/run/route';

jest.mock('../../src/lib/session', () => ({
  getAppSession: jest.fn(),
}));

jest.mock('../../src/lib/workflows', () => ({
  runAllWorkflows: jest.fn().mockResolvedValue([]),
  runAlertEscalation: jest.fn().mockResolvedValue([]),
  runAlertAutoResolve: jest.fn().mockResolvedValue([]),
  runDataFreshnessCheck: jest.fn().mockResolvedValue([]),
  runStaleAlertCleanup: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../src/lib/crypto', () => ({
  safeCompare: jest.fn().mockImplementation((a: string, b: string) => a === b),
}));

jest.mock('../../src/lib/telemetry', () => ({
  trackEvent: jest.fn(),
}));

import { getAppSession } from '../../src/lib/session';
import { safeCompare } from '../../src/lib/crypto';
import { runAllWorkflows } from '../../src/lib/workflows';

const mockGetAppSession = getAppSession as jest.MockedFunction<typeof getAppSession>;
const mockSafeCompare = safeCompare as jest.MockedFunction<typeof safeCompare>;
const mockRunAllWorkflows = runAllWorkflows as jest.MockedFunction<typeof runAllWorkflows>;

const adminSession = {
  userId: 'u1',
  email: 'a@b.com',
  name: 'Admin',
  organizationId: 'org-1',
  organizationName: 'Test',
  role: 'admin',
  subscriptionTier: 'pro',
};

function makeRequest(options: { apiKey?: string; body?: object; workflow?: string } = {}) {
  const url = new URL('http://localhost:3000/api/workflows/run');
  if (options.workflow) url.searchParams.set('workflow', options.workflow);

  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (options.apiKey) headers['x-api-key'] = options.apiKey;

  return new NextRequest(url, {
    method: 'POST',
    headers,
    body: options.body ? JSON.stringify(options.body) : '{}',
  });
}

describe('POST /api/workflows/run', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, WORKFLOW_API_KEY: 'test-api-key-123' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns 401 when no auth', async () => {
    mockGetAppSession.mockResolvedValue(null);
    mockSafeCompare.mockReturnValue(false);

    const response = await POST(makeRequest());
    expect(response.status).toBe(401);
  });

  it('returns 403 when user is not admin/owner', async () => {
    mockGetAppSession.mockResolvedValue({ ...adminSession, role: 'viewer' });
    mockSafeCompare.mockReturnValue(false);

    const response = await POST(makeRequest());
    expect(response.status).toBe(403);
  });

  it('allows admin session auth', async () => {
    mockGetAppSession.mockResolvedValue(adminSession);
    mockSafeCompare.mockReturnValue(false);
    mockRunAllWorkflows.mockResolvedValue([]);

    const response = await POST(makeRequest());
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
  });

  it('allows API key auth with valid UUID', async () => {
    mockSafeCompare.mockReturnValue(true);

    const response = await POST(
      makeRequest({
        apiKey: 'test-api-key-123',
        body: { organizationId: '550e8400-e29b-41d4-a716-446655440000' },
      })
    );
    expect(response.status).toBe(200);
  });

  it('rejects API key auth with invalid UUID', async () => {
    mockSafeCompare.mockReturnValue(true);

    const response = await POST(
      makeRequest({
        apiKey: 'test-api-key-123',
        body: { organizationId: 'not-a-uuid' },
      })
    );
    expect(response.status).toBe(400);
  });

  it('returns 400 for invalid workflow name', async () => {
    mockGetAppSession.mockResolvedValue(adminSession);
    mockSafeCompare.mockReturnValue(false);

    const response = await POST(makeRequest({ workflow: 'nonexistent' }));
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe('Invalid workflow');
    expect(body.available).toContain('all');
  });

  it('rejects malformed JSON body for API key auth', async () => {
    mockSafeCompare.mockReturnValue(true);

    const url = new URL('http://localhost:3000/api/workflows/run');
    const request = new NextRequest(url, {
      method: 'POST',
      headers: { 'x-api-key': 'test-api-key-123', 'content-type': 'application/json' },
      body: 'not valid json{{{',
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
