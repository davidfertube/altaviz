import { canAccessWindowType, canAccessFeature, getCompressorLimit, getPlan, getStripePriceId, PLANS } from '@/lib/plans';

describe('canAccessWindowType', () => {
  it('free tier can access 1hr', () => {
    expect(canAccessWindowType('free', '1hr')).toBe(true);
  });

  it('free tier cannot access 4hr', () => {
    expect(canAccessWindowType('free', '4hr')).toBe(false);
  });

  it('free tier cannot access 24hr', () => {
    expect(canAccessWindowType('free', '24hr')).toBe(false);
  });

  it('pro tier can access all windows', () => {
    expect(canAccessWindowType('pro', '1hr')).toBe(true);
    expect(canAccessWindowType('pro', '4hr')).toBe(true);
    expect(canAccessWindowType('pro', '24hr')).toBe(true);
  });

  it('enterprise tier can access all windows', () => {
    expect(canAccessWindowType('enterprise', '1hr')).toBe(true);
    expect(canAccessWindowType('enterprise', '4hr')).toBe(true);
    expect(canAccessWindowType('enterprise', '24hr')).toBe(true);
  });

  it('unknown tier defaults to free behavior', () => {
    expect(canAccessWindowType('invalid' as never, '4hr')).toBe(false);
  });
});

describe('getCompressorLimit', () => {
  it('free tier gets 2 compressors', () => {
    expect(getCompressorLimit('free')).toBe(2);
  });

  it('pro tier gets 20 compressors', () => {
    expect(getCompressorLimit('pro')).toBe(20);
  });

  it('enterprise tier gets unlimited', () => {
    expect(getCompressorLimit('enterprise')).toBe(Infinity);
  });
});

describe('getPlan', () => {
  it('returns free plan for unknown tier', () => {
    expect(getPlan('unknown' as never)).toEqual(PLANS.free);
  });

  it('returns correct plan for each tier', () => {
    expect(getPlan('free').price).toBe(0);
    expect(getPlan('pro').price).toBe(49);
    expect(getPlan('enterprise').price).toBe(199);
  });
});

describe('canAccessFeature', () => {
  it('free tier cannot access api feature', () => {
    expect(canAccessFeature('free', 'api')).toBe(false);
  });

  it('pro tier can access api feature', () => {
    expect(canAccessFeature('pro', 'api')).toBe(true);
  });

  it('enterprise tier can access api feature', () => {
    expect(canAccessFeature('enterprise', 'api')).toBe(true);
  });

  it('only enterprise can access ml_predictions', () => {
    expect(canAccessFeature('free', 'ml_predictions')).toBe(false);
    expect(canAccessFeature('pro', 'ml_predictions')).toBe(false);
    expect(canAccessFeature('enterprise', 'ml_predictions')).toBe(true);
  });

  it('only enterprise can access bulk_export', () => {
    expect(canAccessFeature('free', 'bulk_export')).toBe(false);
    expect(canAccessFeature('pro', 'bulk_export')).toBe(false);
    expect(canAccessFeature('enterprise', 'bulk_export')).toBe(true);
  });

  it('only enterprise can access webhook_alerts', () => {
    expect(canAccessFeature('free', 'webhook_alerts')).toBe(false);
    expect(canAccessFeature('pro', 'webhook_alerts')).toBe(false);
    expect(canAccessFeature('enterprise', 'webhook_alerts')).toBe(true);
  });

  it('returns false for unknown feature', () => {
    expect(canAccessFeature('enterprise', 'unknown' as any)).toBe(false);
  });
});

describe('getStripePriceId', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      STRIPE_PRICE_ID_PRO: 'price_pro_test',
      STRIPE_PRICE_ID_ENTERPRISE: 'price_ent_test',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns null for free tier', () => {
    expect(getStripePriceId('free')).toBeNull();
  });

  it('returns pro price ID from env', () => {
    expect(getStripePriceId('pro')).toBe('price_pro_test');
  });

  it('returns enterprise price ID from env', () => {
    expect(getStripePriceId('enterprise')).toBe('price_ent_test');
  });

  it('returns null when env var not set for pro', () => {
    delete process.env.STRIPE_PRICE_ID_PRO;
    expect(getStripePriceId('pro')).toBeNull();
  });

  it('returns null when env var not set for enterprise', () => {
    delete process.env.STRIPE_PRICE_ID_ENTERPRISE;
    expect(getStripePriceId('enterprise')).toBeNull();
  });
});
