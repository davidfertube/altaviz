/**
 * In-memory token bucket per client IP. Per-instance only — good enough to
 * protect the demo's API key from drain; production would use a shared store
 * (Upstash/Redis) instead. Documented in the README.
 */

interface Bucket {
  tokens: number;
  lastRefill: number;
}

const CAPACITY = 10; // requests
const REFILL_WINDOW_MS = 5 * 60 * 1000; // full refill every 5 minutes

const buckets = new Map<string, Bucket>();

export function checkRateLimit(ip: string): { ok: boolean; retryAfterSec?: number } {
  const now = Date.now();
  let bucket = buckets.get(ip);
  if (!bucket) {
    bucket = { tokens: CAPACITY, lastRefill: now };
    buckets.set(ip, bucket);
  }
  // linear refill
  const refill = ((now - bucket.lastRefill) / REFILL_WINDOW_MS) * CAPACITY;
  bucket.tokens = Math.min(CAPACITY, bucket.tokens + refill);
  bucket.lastRefill = now;

  if (bucket.tokens < 1) {
    const deficit = 1 - bucket.tokens;
    return { ok: false, retryAfterSec: Math.ceil((deficit / CAPACITY) * (REFILL_WINDOW_MS / 1000)) };
  }
  bucket.tokens -= 1;

  // keep the map from growing unboundedly
  if (buckets.size > 5000) {
    const cutoff = now - REFILL_WINDOW_MS * 2;
    for (const [k, v] of buckets) if (v.lastRefill < cutoff) buckets.delete(k);
  }
  return { ok: true };
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : "local";
}
