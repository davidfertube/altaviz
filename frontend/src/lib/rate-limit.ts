const requestCounts = new Map<string, { count: number; resetTime: number }>();

const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of requestCounts) {
    if (now > entry.resetTime) {
      requestCounts.delete(key);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
}

export function rateLimit(identifier: string, maxRequests = 60, windowMs = 60_000): boolean {
  const result = rateLimitWithInfo(identifier, maxRequests, windowMs);
  return result.allowed;
}

export function rateLimitWithInfo(identifier: string, maxRequests = 60, windowMs = 60_000): RateLimitResult {
  cleanup();
  const now = Date.now();
  const entry = requestCounts.get(identifier);

  if (!entry || now > entry.resetTime) {
    requestCounts.set(identifier, { count: 1, resetTime: now + windowMs });
    return { allowed: true, limit: maxRequests, remaining: maxRequests - 1, resetTime: now + windowMs };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, limit: maxRequests, remaining: 0, resetTime: entry.resetTime };
  }

  entry.count++;
  return { allowed: true, limit: maxRequests, remaining: maxRequests - entry.count, resetTime: entry.resetTime };
}
