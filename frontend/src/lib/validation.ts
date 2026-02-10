export function validateInt(
  value: string | null,
  opts: { min: number; max: number; fallback: number }
): number {
  if (!value) return opts.fallback;
  const n = parseInt(value, 10);
  if (isNaN(n) || n < opts.min || n > opts.max) return opts.fallback;
  return n;
}

export function validateEnum<T extends string>(
  value: string | null,
  allowed: T[],
  fallback: T
): T {
  if (!value || !allowed.includes(value as T)) return fallback;
  return value as T;
}

export function validateUUID(value: string | null): boolean {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
