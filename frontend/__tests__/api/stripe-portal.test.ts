/**
 * Tests for POST /api/stripe/portal route.
 */

import { NextRequest } from 'next/server';

jest.mock('../../src/lib/session', () => ({
  getAppSession: jest.fn(),
}));

jest.mock('../../src/lib/stripe', () => ({
  createPortalSession: jest.fn(),
}));

jest.mock('../../src/lib/errors', () => ({
  handleApiError: jest.fn().mockImplementation(() => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }),
}));

import { getAppSession } from '../../src/lib/session';
import { createPortalSession } from '../../src/lib/stripe';
import { POST } from '../../src/app/api/stripe/portal/route';

const mockGetAppSession = getAppSession as jest.MockedFunction<typeof getAppSession>;
const mockCreatePortalSession = createPortalSession as jest.MockedFunction<typeof createPortalSession>;

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
  return new NextRequest('http://localhost:3000/api/stripe/portal', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
  });
}

describe('POST /api/stripe/portal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetAppSession.mockResolvedValue(null);
    const response = await POST(makeRequest());
    expect(response.status).toBe(401);
  });

  it('returns portal URL when authenticated', async () => {
    mockGetAppSession.mockResolvedValue(session);
    mockCreatePortalSession.mockResolvedValue('https://billing.stripe.com/session_123');

    const response = await POST(makeRequest());
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.url).toBe('https://billing.stripe.com/session_123');
    expect(mockCreatePortalSession).toHaveBeenCalledWith(
      'org-1',
      'a@b.com',
      'Test',
      expect.stringContaining('/dashboard/settings/billing')
    );
  });

  it('returns 500 when Stripe throws', async () => {
    mockGetAppSession.mockResolvedValue(session);
    mockCreatePortalSession.mockRejectedValue(new Error('Stripe error'));

    const response = await POST(makeRequest());
    expect(response.status).toBe(500);
  });
});
