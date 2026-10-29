// @vitest-environment node
import { describe, it, expect, beforeAll } from "vitest";

/**
 * The route gate must let the account-recovery pages through.
 *
 * This is the trap the gate walked straight into: someone who has forgotten
 * their password is signed OUT by definition, so a gate that treats
 * /forgot-password as protected redirects them to the login page they cannot
 * get past. The recovery flow would have shipped completely unreachable, and
 * nothing in a type check or a build would have said so.
 *
 * The mirror case matters too. A confirmation link is routinely opened in a
 * browser where the user IS signed in. If these counted as sign-in entries,
 * the gate would bounce the link to "/" before the token was ever consumed.
 */

// AUTH_SECRET must exist before the proxy module reads it.
beforeAll(() => {
  process.env.AUTH_SECRET ||= "test-secret-for-route-gate-only";
});

const { NextRequest } = await import("next/server");
const { proxy, config } = await import("@/proxy");

/**
 * A signed-OUT request for a path (no session cookie at all). NextRequest, not
 * a bare Request: the gate reads `nextUrl`, which only the former provides.
 */
function anonRequest(pathname: string) {
  return new NextRequest(new URL(`https://example.com${pathname}`));
}

/** Where the gate sends this request, or null when it lets it through. */
async function destinationOf(pathname: string): Promise<string | null> {
  const res = await proxy(anonRequest(pathname));
  const location = res.headers.get("location");
  return location ? new URL(location).pathname : null;
}

describe("route gate: account recovery", () => {
  for (const path of ["/forgot-password", "/reset-password", "/verify-email"]) {
    it(`lets a signed-out visitor reach ${path}`, async () => {
      expect(await destinationOf(path)).toBeNull();
    });
  }

  it("still protects an ordinary authenticated route", async () => {
    // Proves the test is actually exercising the gate rather than passing
    // because every path happens to be allowed.
    expect(await destinationOf("/dashboard")).toBe("/login");
  });

  it("still allows the public marketing and legal pages", async () => {
    expect(await destinationOf("/")).toBeNull();
    expect(await destinationOf("/privacy")).toBeNull();
    expect(await destinationOf("/terms")).toBeNull();
  });

});

/**
 * The MATCHER, not the handler.
 *
 * These paths are protected by never reaching `proxy()` at all - Next applies
 * `config.matcher` first. Asserting against `proxy()` would be testing the
 * wrong layer and would fail for paths that are in fact served correctly, so
 * the regex itself is the subject here.
 */
describe("route gate: matcher exclusions", () => {
  /** Does the gate RUN for this path? */
  function matches(pathname: string): boolean {
    const patterns = (config.matcher as string[]).map((p) => new RegExp(`^${p}$`));
    return patterns.some((re) => re.test(pathname));
  }

  it("skips the web manifest", () => {
    // /manifest.webmanifest used to be matched, so the gate redirected it to
    // /login: a signed-out browser - and every crawler - got an HTML redirect
    // instead of the manifest. Nothing errored; the install prompt and the
    // home-screen icon just silently never worked. A browser reads this BEFORE
    // anyone signs in.
    expect(matches("/manifest.webmanifest")).toBe(false);
  });

  it("skips the SEO files", () => {
    expect(matches("/robots.txt")).toBe(false);
    expect(matches("/sitemap.xml")).toBe(false);
  });

  it("skips the icons and the share image", () => {
    expect(matches("/icon.svg")).toBe(false);
    expect(matches("/icon.png")).toBe(false);
    expect(matches("/apple-icon.png")).toBe(false);
    expect(matches("/opengraph-image.png")).toBe(false);
    expect(matches("/favicon.ico")).toBe(false);
  });

  it("still RUNS for ordinary pages", () => {
    // Proves the exclusions are narrow rather than swallowing everything.
    expect(matches("/dashboard")).toBe(true);
    expect(matches("/account")).toBe(true);
    expect(matches("/resumes/write/contact")).toBe(true);
    expect(matches("/forgot-password")).toBe(true);
  });
});
