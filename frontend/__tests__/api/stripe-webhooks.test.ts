/**
 * Tests for POST /api/stripe/webhooks route.
 */

import { NextRequest } from 'next/server';

const mockQuery = jest.fn();
const mockConstructEvent = jest.fn();
const mockSubscriptionsRetrieve = jest.fn();

jest.mock('../../src/lib/db', () => ({
  query: (...args: any[]) => mockQuery(...args),
}));

jest.mock('../../src/lib/stripe', () => ({
  getStripe: () => ({
    webhooks: { constructEvent: mockConstructEvent },
    subscriptions: { retrieve: mockSubscriptionsRetrieve },
  }),
}));

describe('POST /api/stripe/webhooks', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    process.env = {
      ...originalEnv,
      STRIPE_WEBHOOK_SECRET: 'whsec_test',
      STRIPE_PRICE_ID_PRO: 'price_pro_123',
      STRIPE_PRICE_ID_ENTERPRISE: 'price_ent_456',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  function makeRequest(body: string, signature?: string) {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (signature) headers['stripe-signature'] = signature;
    return new NextRequest('http://localhost:3000/api/stripe/webhooks', {
      method: 'POST',
      headers,
      body,
    });
  }

  it('returns 400 when signature is missing', async () => {
    const { POST } = require('../../src/app/api/stripe/webhooks/route');
    const response = await POST(makeRequest('{}'));
    expect(response.status).toBe(400);
  });

  it('returns 400 when signature verification fails', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    const { POST } = require('../../src/app/api/stripe/webhooks/route');
    const response = await POST(makeRequest('{}', 'sig_invalid'));
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe('Invalid signature');
  });

  it('handles checkout.session.completed with valid price', async () => {
    mockConstructEvent.mockReturnValue({
      id: 'evt_1',
      type: 'checkout.session.completed',
      data: {
        object: {
          mode: 'subscription',
          subscription: 'sub_123',
          customer: 'cus_123',
          amount_total: 4900,
        },
      },
    });
    mockSubscriptionsRetrieve.mockResolvedValue({
      items: { data: [{ price: { id: 'price_pro_123' } }] },
    });
    mockQuery.mockResolvedValue([{ id: 'org-1' }]);

    const { POST } = require('../../src/app/api/stripe/webhooks/route');
    const response = await POST(makeRequest('{}', 'sig_valid'));
    expect(response.status).toBe(200);

    // Should update org subscription
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE organizations'),
      expect.arrayContaining(['pro', 'active', 20, 'cus_123'])
    );
  });

  it('handles invoice.payment_failed without overwriting tier', async () => {
    mockConstructEvent.mockReturnValue({
      id: 'evt_2',
      type: 'invoice.payment_failed',
      data: {
        object: {
          customer: 'cus_456',
          amount_due: 19900,
        },
      },
    });
    mockQuery.mockResolvedValue([{ id: 'org-2' }]);

    const { POST } = require('../../src/app/api/stripe/webhooks/route');
    const response = await POST(makeRequest('{}', 'sig_valid'));
    expect(response.status).toBe(200);

    // Should only update status, NOT tier or max_compressors
    const updateCall = mockQuery.mock.calls.find(
      (c: any[]) => typeof c[0] === 'string' && c[0].includes('past_due')
    );
    expect(updateCall).toBeDefined();
    expect(updateCall![0]).not.toContain('subscription_tier');
  });

  it('handles subscription.deleted by downgrading to free', async () => {
    mockConstructEvent.mockReturnValue({
      id: 'evt_3',
      type: 'customer.subscription.deleted',
      data: {
        object: { customer: 'cus_789' },
      },
    });
    mockQuery.mockResolvedValue([{ id: 'org-3' }]);

    const { POST } = require('../../src/app/api/stripe/webhooks/route');
    const response = await POST(makeRequest('{}', 'sig_valid'));
    expect(response.status).toBe(200);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE organizations'),
      expect.arrayContaining(['free', 'canceled', 2, 'cus_789'])
    );
  });
});
