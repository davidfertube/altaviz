import { canAccessWindowType, canAccessFeature, getCompressorLimit, getPlan, PLANS } from '@/lib/plans';

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
