/**
 * Tests for POST /api/stripe/checkout route.
 */

import { NextRequest } from 'next/server';

jest.mock('../../src/lib/session', () => ({
  getAppSession: jest.fn(),
}));

jest.mock('../../src/lib/stripe', () => ({
  createCheckoutSession: jest.fn(),
}));

jest.mock('../../src/lib/plans', () => ({
  getStripePriceId: jest.fn(),
}));

jest.mock('../../src/lib/errors', () => ({
  handleApiError: jest.fn().mockImplementation(() => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }),
}));

import { getAppSession } from '../../src/lib/session';
import { createCheckoutSession } from '../../src/lib/stripe';
import { getStripePriceId } from '../../src/lib/plans';
import { POST } from '../../src/app/api/stripe/checkout/route';

const mockGetAppSession = getAppSession as jest.MockedFunction<typeof getAppSession>;
const mockCreateCheckoutSession = createCheckoutSession as jest.MockedFunction<typeof createCheckoutSession>;
const mockGetStripePriceId = getStripePriceId as jest.MockedFunction<typeof getStripePriceId>;

const session = {
  userId: 'u1',
  email: 'a@b.com',
  name: 'Admin',
  organizationId: 'org-1',
  organizationName: 'Test',
  role: 'owner',
  subscriptionTier: 'free',
};

function makeRequest(body: object) {
  return new NextRequest('http://localhost:3000/api/stripe/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/stripe/checkout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetAppSession.mockResolvedValue(null);
    const response = await POST(makeRequest({ tier: 'pro' }));
    expect(response.status).toBe(401);
  });

  it('returns 400 for invalid tier', async () => {
    mockGetAppSession.mockResolvedValue(session);
    mockGetStripePriceId.mockReturnValue(null);

    const response = await POST(makeRequest({ tier: 'invalid' }));
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe('Invalid plan');
  });

  it('returns checkout URL for valid pro tier', async () => {
    mockGetAppSession.mockResolvedValue(session);
    mockGetStripePriceId.mockReturnValue('price_pro_123');
    mockCreateCheckoutSession.mockResolvedValue('https://checkout.stripe.com/session_123');

    const response = await POST(makeRequest({ tier: 'pro' }));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.url).toBe('https://checkout.stripe.com/session_123');
    expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        email: 'a@b.com',
        priceId: 'price_pro_123',
      })
    );
  });
});
