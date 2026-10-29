/**
 * Fixed-window rate limiter with two backends behind one async API.
 *
 * Prevents cost-abuse / denial-of-wallet on expensive routes (`/api/ai`) and
 * spam on `/api/register` + brute-force on login. By default it uses a
 * per-instance in-memory Map (fine for a single instance / local dev). When
 * `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` are set (Upstash Redis
 * or Vercel KV), it uses that shared store instead, so the limit is enforced
 * GLOBALLY across all serverless instances - the hard cap the plan calls for.
 *
 * Routes call the async `limit()` / `peek()` / `reset()`; the pure sync
 * `rateLimit()` / `peekLimited()` / `clearRateLimit()` remain the in-memory
 * implementation (and are used directly in unit tests).
 */

import { Redis } from "@upstash/redis";

interface Bucket {
  count: number;
  resetAt: number; // epoch ms when the window rolls over
}

interface RateResult {
  ok: boolean;
  remaining: number;
  /** Milliseconds until the current window resets. */
  resetMs: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Record a hit for `key` and report whether it is within `limit` per `windowMs`.
 * Fixed window: the first hit starts the window; it resets once the window ends.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now()
): RateResult {
  const bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, resetMs: windowMs };
  }
  bucket.count += 1;
  return {
    ok: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    resetMs: bucket.resetAt - now,
  };
}

/**
 * Report whether `key` is already at/over `limit` WITHOUT recording a hit.
 * Used for login throttling, where only failed attempts should count: peek
 * before verifying, record a hit only on failure, and clear on success.
 */
export function peekLimited(
  key: string,
  limit: number,
  now: number = Date.now()
): boolean {
  const bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) return false;
  return bucket.count >= limit;
}

/** Drop a single key's window (e.g. reset a user's failed-login count on success). */
export function clearRateLimit(key: string): void {
  buckets.delete(key);
}

/* ----------------------- shared (Upstash) backend ----------------------- */

let redis: Redis | null = null;

/** The Upstash/Vercel-KV client when configured, else null (in-memory mode). */
function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

/** True when a shared rate-limit store is configured. */
export function isSharedRateLimit(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

/**
 * Record a hit for `key` against a shared store (global across instances) when
 * Upstash/KV is configured, otherwise fall back to the in-memory `rateLimit`.
 * Same fixed-window semantics either way. If the shared store errors, it fails
 * OPEN (allows the request) rather than breaking the route.
 */
export async function limit(
  key: string,
  max: number,
  windowMs: number,
  now: number = Date.now()
): Promise<RateResult> {
  const r = getRedis();
  if (!r) return rateLimit(key, max, windowMs, now);
  try {
    const count = await r.incr(key);
    if (count === 1) await r.pexpire(key, windowMs);
    const ttl = await r.pttl(key);
    return {
      ok: count <= max,
      remaining: Math.max(0, max - count),
      resetMs: ttl > 0 ? ttl : windowMs,
    };
  } catch {
    return { ok: true, remaining: max, resetMs: windowMs };
  }
}

/** Shared-store peek (no increment); falls back to in-memory `peekLimited`. */
export async function peek(
  key: string,
  max: number,
  now: number = Date.now()
): Promise<boolean> {
  const r = getRedis();
  if (!r) return peekLimited(key, max, now);
  try {
    const count = await r.get<number>(key);
    return (count ?? 0) >= max;
  } catch {
    return false;
  }
}

/** Shared-store reset for a key; falls back to in-memory `clearRateLimit`. */
export async function reset(key: string): Promise<void> {
  const r = getRedis();
  if (!r) {
    clearRateLimit(key);
    return;
  }
  try {
    await r.del(key);
  } catch {
    /* best-effort */
  }
}

/**
 * How many proxies sit in front of the app and append to `x-forwarded-for`.
 * 1 for a normal Vercel/Netlify/Cloudflare deployment. Raise it only if you
 * genuinely add another trusted proxy in front - each extra hop you claim is
 * one more entry an attacker is allowed to forge.
 */
const TRUSTED_PROXY_HOPS = Math.max(
  1,
  Number(process.env.TRUSTED_PROXY_HOPS ?? 1)
);

/**
 * The client IP to rate-limit on.
 *
 * Reading the FIRST entry of `x-forwarded-for` - the obvious implementation,
 * and the one this replaces - defeats the rate limiter completely. That header
 * is just a request header: anyone can send `X-Forwarded-For: 1.2.3.4`, and
 * proxies APPEND rather than overwrite, so the leftmost entry is whatever the
 * client typed. A script that varies it per request gets a brand-new bucket
 * every time and is never limited. On `/api/ai` that is an uncapped bill with
 * someone else's Gemini key; on `/api/register`, unlimited account creation.
 *
 * The only entries that can be trusted are the ones a proxy we control added,
 * which are at the RIGHT-hand end. So:
 *
 *   1. Platform headers first. Vercel sets `x-vercel-forwarded-for` and
 *      `x-real-ip` itself, overwriting anything the client sent, which makes
 *      them authoritative where they exist.
 *   2. Otherwise count in from the right of `x-forwarded-for` by the number of
 *      proxies we actually have, never from the left.
 *
 * When nothing trustworthy is available the caller is bucketed as "unknown".
 * That is a deliberately blunt shared bucket - it can let one abuser use up the
 * anonymous allowance - but the alternative, a unique key per forged header, is
 * no limit at all. Routes that can identify the user key on the account instead,
 * which is why this is only ever the fallback.
 */
export function clientIp(req: Request): string {
  // Platform-set and not client-spoofable.
  const platform =
    req.headers.get("x-vercel-forwarded-for") ?? req.headers.get("x-real-ip");
  if (platform) {
    const ip = platform.split(",").pop()?.trim();
    if (ip) return ip;
  }

  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const hops = xff
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean);
    // The rightmost entry was added by the proxy nearest to us; with N trusted
    // proxies, ours is the Nth from the right. Anything further left is forgeable.
    const ip = hops[hops.length - TRUSTED_PROXY_HOPS];
    if (ip) return ip;
  }

  return "unknown";
}

/** Test-only: clear all windows so cases don't bleed into each other. */
export function _resetRateLimitStore(): void {
  buckets.clear();
}
