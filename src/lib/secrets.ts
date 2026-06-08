import { randomBytes, timingSafeEqual } from "crypto";

let devFallback: string | null = null;

/**
 * Returns the secret used to sign/verify session JWTs and to derive encryption
 * keys. In production it MUST be provided via the SESSION_SECRET env var — we
 * fail fast rather than silently signing with a known, committed constant. In
 * development, when unset, a random per-process secret is generated so dev keeps
 * working without ever using a guessable hardcoded value (sessions reset on
 * restart, which is acceptable locally).
 */
export function getSessionSecret(): string {
  const fromEnv = process.env.SESSION_SECRET;
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is not set. Refusing to use an insecure default in production.");
  }
  if (!devFallback) {
    devFallback = randomBytes(32).toString("hex");
    // eslint-disable-next-line no-console
    console.warn("[secrets] SESSION_SECRET not set — using a random per-process dev secret.");
  }
  return devFallback;
}

/** Constant-time string comparison — avoids leaking a secret/token via timing. */
export function timingSafeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
