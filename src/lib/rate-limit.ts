import { ApiError } from "@/lib/api";

/**
 * Lightweight in-memory rate limiter (fixed window). Suitable for the current
 * single-instance (PM2 fork) deployment. Counters reset on restart and are not
 * shared across instances — if the app is ever scaled out, move this to Redis
 * or a DB-backed store. Still far better than no limiting against brute force
 * and spam.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
let lastSweep = 0;

export type RateLimitRule = { limit: number; windowMs: number };

// Common windows.
export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;

function hit(key: string, rule: RateLimitRule, now: number): boolean {
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + rule.windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  return bucket.count <= rule.limit;
}

/**
 * Counts a request against each provided key and throws ApiError(429) if any of
 * them exceeds its rule. Increments every key so independent dimensions (per-IP,
 * per-email, per-phone) are all tracked.
 */
export const RATE_LIMIT_MESSAGE = "Слишком много запросов. Пожалуйста, попробуйте позже.";

type Check = { key: string; rule: RateLimitRule };

function evaluate(checks: Check[]): boolean {
  const now = Date.now();
  // Opportunistic cleanup so the map cannot grow unbounded.
  if (now - lastSweep > MINUTE) {
    lastSweep = now;
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }
  let exceeded = false;
  for (const check of checks) {
    if (!hit(check.key, check.rule, now)) exceeded = true;
  }
  return exceeded;
}

/** Counts the request and returns true if any key is over its limit (non-throwing). */
export function isRateLimited(checks: Check[]): boolean {
  return evaluate(checks);
}

/** Counts the request and throws ApiError(429) if any key is over its limit. */
export function enforceRateLimit(checks: Check[], message = RATE_LIMIT_MESSAGE) {
  if (evaluate(checks)) throw new ApiError(429, message);
}

/**
 * Best-effort client IP. Behind a single trusted reverse proxy (nginx),
 * `x-real-ip` (set by the proxy to the connecting address) or the LAST
 * `x-forwarded-for` entry is the hardest to spoof — a client can only prepend
 * entries to `x-forwarded-for`, not control what the proxy appends.
 */
export function getClientIp(request: Request): string {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((part) => part.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return "unknown";
}
