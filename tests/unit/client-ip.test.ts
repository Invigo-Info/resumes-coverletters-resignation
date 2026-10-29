// @vitest-environment node
import { describe, it, expect } from "vitest";
import { clientIp } from "@/permissions/rate-limit";

/**
 * The rate limiter is only as good as the identity it keys on, and the previous
 * identity was whatever the caller asked for.
 *
 * `x-forwarded-for` is an ordinary request header. Proxies APPEND to it, so the
 * leftmost entry is the value the client sent. Keying on that entry meant a
 * script varying the header per request got a fresh bucket every time and was
 * never limited at all - uncapped Gemini spend on /api/ai, and unlimited signups
 * on /api/register. Only the right-hand entries, added by a proxy we control,
 * can be trusted.
 */
function req(headers: Record<string, string>): Request {
  return new Request("https://example.com/api/ai", { headers });
}

describe("clientIp", () => {
  it("prefers the platform header over anything the client sent", () => {
    // Vercel sets x-vercel-forwarded-for itself, overwriting client input.
    expect(
      clientIp(
        req({
          "x-forwarded-for": "1.1.1.1",
          "x-vercel-forwarded-for": "9.9.9.9",
        })
      )
    ).toBe("9.9.9.9");
  });

  it("uses x-real-ip when no vercel header is present", () => {
    expect(
      clientIp(req({ "x-forwarded-for": "1.1.1.1", "x-real-ip": "8.8.8.8" }))
    ).toBe("8.8.8.8");
  });

  it("takes the RIGHTMOST forwarded-for entry, not the leftmost", () => {
    // The spoofing case: the client prepended two fake hops. The real address
    // is the one our proxy appended, at the end.
    expect(
      clientIp(req({ "x-forwarded-for": "evil-1, evil-2, 203.0.113.7" }))
    ).toBe("203.0.113.7");
  });

  it("gives a forged header NO fresh bucket", () => {
    // The property that actually matters: whatever a caller invents on the
    // left, the identity it is limited on does not change.
    const real = "203.0.113.7";
    const a = clientIp(req({ "x-forwarded-for": "1.1.1.1, " + real }));
    const b = clientIp(req({ "x-forwarded-for": "2.2.2.2, " + real }));
    const c = clientIp(req({ "x-forwarded-for": "3.3.3.3, 4.4.4.4, " + real }));
    expect(a).toBe(real);
    expect(b).toBe(real);
    expect(c).toBe(real);
    expect(new Set([a, b, c]).size).toBe(1);
  });

  it("handles a single-entry forwarded-for", () => {
    expect(clientIp(req({ "x-forwarded-for": "203.0.113.7" }))).toBe(
      "203.0.113.7"
    );
  });

  it("tolerates whitespace and empty entries", () => {
    expect(clientIp(req({ "x-forwarded-for": "1.1.1.1 , , 203.0.113.7 " }))).toBe(
      "203.0.113.7"
    );
  });

  it("falls back to a shared bucket when nothing is trustworthy", () => {
    // Deliberately blunt: one shared bucket can be exhausted by a single
    // abuser, but a unique key per forged header is no limit whatsoever.
    expect(clientIp(req({}))).toBe("unknown");
    expect(clientIp(req({ "x-forwarded-for": "" }))).toBe("unknown");
  });
});
