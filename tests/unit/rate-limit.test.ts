import { describe, it, expect, beforeEach } from "vitest";
import {
  rateLimit,
  clientIp,
  peekLimited,
  clearRateLimit,
  limit,
  peek,
  reset,
  isSharedRateLimit,
  _resetRateLimitStore,
} from "@/permissions/rate-limit";

beforeEach(() => _resetRateLimitStore());

describe("rateLimit", () => {
  it("allows hits up to the limit, then blocks", () => {
    const t0 = 1_000_000;
    expect(rateLimit("k", 3, 1000, t0).ok).toBe(true); // 1
    expect(rateLimit("k", 3, 1000, t0).ok).toBe(true); // 2
    expect(rateLimit("k", 3, 1000, t0).ok).toBe(true); // 3
    const blocked = rateLimit("k", 3, 1000, t0); // 4
    expect(blocked.ok).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("resets after the window elapses", () => {
    const t0 = 2_000_000;
    rateLimit("k", 1, 1000, t0);
    expect(rateLimit("k", 1, 1000, t0).ok).toBe(false); // same window
    expect(rateLimit("k", 1, 1000, t0 + 1000).ok).toBe(true); // window rolled over
  });

  it("tracks separate keys independently", () => {
    const t0 = 3_000_000;
    expect(rateLimit("a", 1, 1000, t0).ok).toBe(true);
    expect(rateLimit("b", 1, 1000, t0).ok).toBe(true); // different key, not blocked
    expect(rateLimit("a", 1, 1000, t0).ok).toBe(false);
  });

  it("reports remaining correctly", () => {
    const t0 = 4_000_000;
    expect(rateLimit("k", 5, 1000, t0).remaining).toBe(4);
    expect(rateLimit("k", 5, 1000, t0).remaining).toBe(3);
  });
});

describe("peekLimited / clearRateLimit (login throttle)", () => {
  it("peek does not itself count a hit", () => {
    const t0 = 5_000_000;
    // Peeking many times never trips the limit on its own.
    for (let i = 0; i < 10; i++) {
      expect(peekLimited("login:a", 3, t0)).toBe(false);
    }
  });

  it("blocks only after limit failures are recorded", () => {
    const t0 = 6_000_000;
    const key = "login:brute";
    // Simulate the authorize flow: peek, then record a failure each round.
    for (let i = 0; i < 3; i++) {
      expect(peekLimited(key, 3, t0)).toBe(false); // still allowed
      rateLimit(key, 3, 5000, t0); // failed attempt
    }
    // 3 failures recorded -> the next attempt is refused.
    expect(peekLimited(key, 3, t0)).toBe(true);
  });

  it("a success clears the counter so the user isn't locked out", () => {
    const t0 = 7_000_000;
    const key = "login:recover";
    rateLimit(key, 3, 5000, t0);
    rateLimit(key, 3, 5000, t0); // 2 failures
    clearRateLimit(key); // successful login
    expect(peekLimited(key, 3, t0)).toBe(false);
  });

  it("the lock lifts after the window elapses", () => {
    const t0 = 8_000_000;
    const key = "login:window";
    for (let i = 0; i < 3; i++) rateLimit(key, 3, 5000, t0);
    expect(peekLimited(key, 3, t0)).toBe(true);
    expect(peekLimited(key, 3, t0 + 5000)).toBe(false); // window rolled over
  });
});

describe("async limiter (in-memory fallback when Upstash is not configured)", () => {
  it("isSharedRateLimit is false without Upstash env", () => {
    expect(isSharedRateLimit()).toBe(false);
  });

  it("limit() mirrors rateLimit() and blocks past the max", async () => {
    const t0 = 9_000_000;
    expect((await limit("al", 2, 1000, t0)).ok).toBe(true);
    expect((await limit("al", 2, 1000, t0)).ok).toBe(true);
    expect((await limit("al", 2, 1000, t0)).ok).toBe(false);
  });

  it("peek() + limit() + reset() drive the login-throttle flow", async () => {
    const t0 = 9_100_000;
    const key = "login:async";
    expect(await peek(key, 2, t0)).toBe(false);
    await limit(key, 2, 1000, t0); // failure 1
    await limit(key, 2, 1000, t0); // failure 2
    expect(await peek(key, 2, t0)).toBe(true); // locked
    await reset(key); // successful login clears it
    expect(await peek(key, 2, t0)).toBe(false);
  });
});

describe("clientIp", () => {
  const make = (headers: Record<string, string>) =>
    new Request("http://x/", { headers });

  it("takes the first x-forwarded-for entry", () => {
    expect(clientIp(make({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }))).toBe(
      "1.2.3.4"
    );
  });

  it("falls back to x-real-ip, then unknown", () => {
    expect(clientIp(make({ "x-real-ip": "9.9.9.9" }))).toBe("9.9.9.9");
    expect(clientIp(make({}))).toBe("unknown");
  });
});
