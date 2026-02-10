import { safeCompare } from '@/lib/crypto';

describe('safeCompare', () => {
  it('returns true for equal strings', () => {
    expect(safeCompare('test-api-key', 'test-api-key')).toBe(true);
  });

  it('returns false for unequal strings of same length', () => {
    expect(safeCompare('test-api-key', 'test-api-kez')).toBe(false);
  });

  it('returns false for different length strings', () => {
    expect(safeCompare('short', 'longer-string')).toBe(false);
  });

  it('returns false for empty vs non-empty', () => {
    expect(safeCompare('', 'something')).toBe(false);
  });

  it('returns true for empty vs empty', () => {
    expect(safeCompare('', '')).toBe(true);
  });
});
