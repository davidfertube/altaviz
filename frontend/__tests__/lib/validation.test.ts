import { validateInt, validateEnum, validateUUID } from '@/lib/validation';

describe('validateInt', () => {
  it('returns fallback for null', () => {
    expect(validateInt(null, { min: 1, max: 100, fallback: 50 })).toBe(50);
  });

  it('returns fallback for empty string', () => {
    expect(validateInt('', { min: 1, max: 100, fallback: 50 })).toBe(50);
  });

  it('returns fallback for NaN', () => {
    expect(validateInt('abc', { min: 1, max: 100, fallback: 50 })).toBe(50);
  });

  it('returns fallback when below min', () => {
    expect(validateInt('0', { min: 1, max: 100, fallback: 50 })).toBe(50);
  });

  it('returns fallback when above max', () => {
    expect(validateInt('999999', { min: 1, max: 200, fallback: 50 })).toBe(50);
  });

  it('returns parsed value within bounds', () => {
    expect(validateInt('25', { min: 1, max: 100, fallback: 50 })).toBe(25);
  });

  it('returns min boundary value', () => {
    expect(validateInt('1', { min: 1, max: 100, fallback: 50 })).toBe(1);
  });

  it('returns max boundary value', () => {
    expect(validateInt('100', { min: 1, max: 100, fallback: 50 })).toBe(100);
  });
});

describe('validateEnum', () => {
  it('returns fallback for null', () => {
    expect(validateEnum(null, ['a', 'b'], 'a')).toBe('a');
  });

  it('returns fallback for invalid value', () => {
    expect(validateEnum('c', ['a', 'b'], 'a')).toBe('a');
  });

  it('returns valid value', () => {
    expect(validateEnum('b', ['a', 'b'], 'a')).toBe('b');
  });

  it('works with WindowType values', () => {
    expect(validateEnum('4hr', ['1hr', '4hr', '24hr'], '1hr')).toBe('4hr');
  });

  it('rejects SQL injection attempt', () => {
    expect(validateEnum("'; DROP TABLE--", ['1hr', '4hr', '24hr'], '1hr')).toBe('1hr');
  });
});

describe('validateUUID', () => {
  it('returns false for null', () => {
    expect(validateUUID(null)).toBe(false);
  });

  it('returns false for non-UUID string', () => {
    expect(validateUUID('not-a-uuid')).toBe(false);
  });

  it('returns true for valid UUID', () => {
    expect(validateUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('returns true for uppercase UUID', () => {
    expect(validateUUID('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
  });
});
