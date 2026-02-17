/**
 * Tests for utility functions.
 */

import { formatNumber, formatInteger, formatTimestamp, formatTimeAgo, timeRangeToHours } from '@/lib/utils';

describe('formatNumber', () => {
  it('returns -- for null', () => {
    expect(formatNumber(null)).toBe('--');
  });

  it('returns -- for undefined', () => {
    expect(formatNumber(undefined)).toBe('--');
  });

  it('returns -- for NaN string', () => {
    expect(formatNumber('abc')).toBe('--');
  });

  it('formats number with default 2 decimals', () => {
    expect(formatNumber(185.567)).toBe('185.57');
  });

  it('formats number with custom decimals', () => {
    expect(formatNumber(185.567, 1)).toBe('185.6');
  });

  it('parses string input', () => {
    expect(formatNumber('42.5')).toBe('42.50');
  });

  it('handles zero', () => {
    expect(formatNumber(0)).toBe('0.00');
  });
});

describe('formatInteger', () => {
  it('returns -- for null', () => {
    expect(formatInteger(null)).toBe('--');
  });

  it('returns -- for undefined', () => {
    expect(formatInteger(undefined)).toBe('--');
  });

  it('returns -- for NaN string', () => {
    expect(formatInteger('not-a-number')).toBe('--');
  });

  it('rounds and formats with locale separators', () => {
    expect(formatInteger(1234.7)).toBe('1,235');
  });

  it('parses string input', () => {
    expect(formatInteger('42')).toBe('42');
  });
});

describe('formatTimestamp', () => {
  it('returns -- for null', () => {
    expect(formatTimestamp(null)).toBe('--');
  });

  it('returns -- for undefined', () => {
    expect(formatTimestamp(undefined)).toBe('--');
  });

  it('formats a valid timestamp', () => {
    const result = formatTimestamp('2026-02-15T14:30:00Z');
    expect(result).toBeTruthy();
    expect(result).not.toBe('--');
  });
});

describe('formatTimeAgo', () => {
  it('returns -- for null', () => {
    expect(formatTimeAgo(null)).toBe('--');
  });

  it('returns -- for undefined', () => {
    expect(formatTimeAgo(undefined)).toBe('--');
  });

  it('returns "just now" for recent timestamp', () => {
    const result = formatTimeAgo(new Date().toISOString());
    expect(result).toBe('just now');
  });

  it('returns minutes ago', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const result = formatTimeAgo(fiveMinAgo);
    expect(result).toBe('5m ago');
  });

  it('returns hours ago', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const result = formatTimeAgo(twoHoursAgo);
    expect(result).toBe('2h ago');
  });

  it('returns days ago', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const result = formatTimeAgo(threeDaysAgo);
    expect(result).toBe('3d ago');
  });
});

describe('timeRangeToHours', () => {
  it('returns 1 for 1h', () => {
    expect(timeRangeToHours('1h')).toBe(1);
  });

  it('returns 4 for 4h', () => {
    expect(timeRangeToHours('4h')).toBe(4);
  });

  it('returns 24 for 24h', () => {
    expect(timeRangeToHours('24h')).toBe(24);
  });

  it('returns 168 for 7d', () => {
    expect(timeRangeToHours('7d')).toBe(168);
  });

  it('returns 24 for unknown range', () => {
    expect(timeRangeToHours('invalid')).toBe(24);
  });
});
