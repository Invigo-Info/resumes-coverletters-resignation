import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { siteUrl } from "@/config/site";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";

const ORIGINAL = process.env.NEXT_PUBLIC_SITE_URL;

beforeEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://example.test";
});
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL;
});

describe("siteUrl", () => {
  it("uses NEXT_PUBLIC_SITE_URL and strips a trailing slash", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.test/";
    expect(siteUrl()).toBe("https://example.test");
  });

  it("falls back to localhost when nothing is configured", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    // 3001, not 3000: that is the port the dev server runs on, and this
    // fallback now also builds the links in password-reset and verification
    // emails, where a wrong port means a dead link rather than a cosmetic one.
    expect(siteUrl()).toBe("http://localhost:3001");
  });
});

describe("sitemap", () => {
  it("lists only the public routes as absolute URLs under the site origin", () => {
    const urls = sitemap().map((e) => e.url);
    expect(urls).toContain("https://example.test");
    expect(urls).toContain("https://example.test/privacy");
    expect(urls).toContain("https://example.test/terms");
    // No per-account app surface leaks into the sitemap.
    expect(urls.some((u) => u.includes("/jobs") || u.includes("/dashboard"))).toBe(
      false
    );
  });
});

describe("robots", () => {
  it("allows public pages and disallows the API + private app areas", () => {
    const r = robots();
    const rules = Array.isArray(r.rules) ? r.rules[0] : r.rules;
    const disallow = ([] as string[]).concat(rules?.disallow ?? []);
    expect(disallow).toContain("/api/");
    expect(disallow).toContain("/jobs");
    expect(disallow).toContain("/account");
    expect(r.sitemap).toBe("https://example.test/sitemap.xml");
  });
});
