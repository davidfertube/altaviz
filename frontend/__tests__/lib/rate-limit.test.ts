/**
 * Tests for rate limiting utility.
 */

import { rateLimit, rateLimitWithInfo } from '@/lib/rate-limit';

describe('rateLimit', () => {
  it('allows first request', () => {
    expect(rateLimit('test-rl-1')).toBe(true);
  });

  it('allows requests within limit', () => {
    const key = 'test-rl-within-' + Date.now();
    for (let i = 0; i < 5; i++) {
      expect(rateLimit(key, 5)).toBe(true);
    }
  });

  it('blocks requests over limit', () => {
    const key = 'test-rl-over-' + Date.now();
    for (let i = 0; i < 3; i++) {
      rateLimit(key, 3);
    }
    expect(rateLimit(key, 3)).toBe(false);
  });
});

describe('rateLimitWithInfo', () => {
  it('returns full info on first request', () => {
    const key = 'test-rli-first-' + Date.now();
    const result = rateLimitWithInfo(key, 10);
    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(10);
    expect(result.remaining).toBe(9);
    expect(result.resetTime).toBeGreaterThan(Date.now());
  });

  it('decrements remaining count', () => {
    const key = 'test-rli-decr-' + Date.now();
    rateLimitWithInfo(key, 5);
    const result = rateLimitWithInfo(key, 5);
    expect(result.remaining).toBe(3);
  });

  it('returns remaining=0 and allowed=false when exhausted', () => {
    const key = 'test-rli-exhaust-' + Date.now();
    for (let i = 0; i < 2; i++) {
      rateLimitWithInfo(key, 2);
    }
    const result = rateLimitWithInfo(key, 2);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });
});
