// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * GTM and GA4 must never both load.
 *
 * If a GA4 tag is configured inside the GTM container - which is the normal way
 * to set GA4 up - and GA4 is ALSO loaded directly, every pageview and every
 * event is recorded twice. Nothing errors, nothing looks wrong, and the numbers
 * are quietly worthless. It is exactly the class of bug that is discovered a
 * quarter later when someone compares two dashboards.
 */

async function load(env: Record<string, string>) {
  vi.resetModules();
  vi.unstubAllEnvs();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  return import("@/utilities/google-tags");
}

beforeEach(() => {
  vi.unstubAllEnvs();
});

describe("google tag routing", () => {
  it("loads nothing when neither id is set", async () => {
    const g = await load({ NEXT_PUBLIC_GTM_ID: "", NEXT_PUBLIC_GA_ID: "" });
    expect(g.gtmConfigured()).toBe(false);
    expect(g.gaDirectConfigured()).toBe(false);
    expect(g.googleTagsConfigured()).toBe(false);
  });

  it("loads GA4 directly when only a GA id is set", async () => {
    const g = await load({ NEXT_PUBLIC_GTM_ID: "", NEXT_PUBLIC_GA_ID: "G-123" });
    expect(g.gaDirectConfigured()).toBe(true);
    expect(g.gtmConfigured()).toBe(false);
  });

  it("loads GTM when only a GTM id is set", async () => {
    const g = await load({ NEXT_PUBLIC_GTM_ID: "GTM-ABC", NEXT_PUBLIC_GA_ID: "" });
    expect(g.gtmConfigured()).toBe(true);
    expect(g.gaDirectConfigured()).toBe(false);
  });

  it("does NOT also load GA4 directly when BOTH ids are set", async () => {
    // The double-counting case. GTM wins; GA4 belongs inside the container.
    const g = await load({
      NEXT_PUBLIC_GTM_ID: "GTM-ABC",
      NEXT_PUBLIC_GA_ID: "G-123",
    });
    expect(g.gtmConfigured()).toBe(true);
    expect(g.gaDirectConfigured()).toBe(false);
  });
});

describe("consent mode signals", () => {
  it("denies ads and analytics by default, before any tag loads", async () => {
    const g = await load({ NEXT_PUBLIC_GTM_ID: "GTM-ABC", NEXT_PUBLIC_GA_ID: "" });
    // The bootstrap is what a tag reads before we have an answer, so every
    // optional signal in it must be denied.
    expect(g.CONSENT_BOOTSTRAP).toContain("ad_storage:'denied'");
    expect(g.CONSENT_BOOTSTRAP).toContain("analytics_storage:'denied'");
    // Consent Mode v2 added these two and Google requires them for the EEA.
    expect(g.CONSENT_BOOTSTRAP).toContain("ad_user_data:'denied'");
    expect(g.CONSENT_BOOTSTRAP).toContain("ad_personalization:'denied'");
  });

  it("maps a partial choice onto the right Google signals", async () => {
    const g = await load({ NEXT_PUBLIC_GTM_ID: "GTM-ABC", NEXT_PUBLIC_GA_ID: "" });
    const layer: unknown[] = [];
    vi.stubGlobal("window", { dataLayer: layer });

    g.pushConsentUpdate({ analytics: true, marketing: false });
    const update = layer[0] as unknown[];

    expect(update[0]).toBe("consent");
    expect(update[1]).toBe("update");
    expect(update[2]).toMatchObject({
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    vi.unstubAllGlobals();
  });
});
