// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * The gate between a configured analytics key and an actual network call.
 *
 * `consent.test.ts` proves the store records choices correctly. This file
 * proves the consequence that matters: that with a PostHog key present and no
 * consent given, posthog-js is never even LOADED, let alone initialised. That
 * is the difference between a compliant deployment and an unlawful one, and it
 * cannot be read off the consent store alone.
 */

const init = vi.fn();
const capture = vi.fn();
const optIn = vi.fn();
const identify = vi.fn();

vi.mock("posthog-js", () => ({
  default: {
    init,
    capture,
    opt_in_capturing: optIn,
    opt_out_capturing: vi.fn(),
    reset: vi.fn(),
    identify,
  },
}));

/**
 * Load a fresh copy of the analytics module with a key configured.
 *
 * The key is read once at module scope, so the env has to be set before import
 * and the module registry reset between cases.
 */
async function loadAnalytics() {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test_key");
  const analytics = await import("@/utilities/analytics");
  const consent = await import("@/utilities/consent");
  return { analytics, consent };
}

beforeEach(() => {
  init.mockClear();
  capture.mockClear();
  optIn.mockClear();
  identify.mockClear();
  vi.unstubAllEnvs();
});

describe("analytics is gated on consent", () => {
  it("does NOT initialise PostHog while consent is undecided", async () => {
    const { analytics } = await loadAnalytics();
    // A key is configured, so the only thing standing between this and a
    // network call is consent.
    expect(analytics.analyticsConfigured()).toBe(true);
    expect(analytics.analyticsEnabled()).toBe(false);

    await analytics.capture("resume_created");
    await analytics.capturePageview("https://example.com/");

    expect(init).not.toHaveBeenCalled();
    expect(capture).not.toHaveBeenCalled();
  });

  it("does NOT initialise PostHog after an explicit rejection", async () => {
    const { analytics, consent } = await loadAnalytics();
    consent.useConsent.getState().rejectAll();

    await analytics.capture("resume_created");

    expect(init).not.toHaveBeenCalled();
    expect(capture).not.toHaveBeenCalled();
  });

  it("initialises and captures once consent is given", async () => {
    const { analytics, consent } = await loadAnalytics();
    consent.useConsent.getState().acceptAll();

    expect(analytics.analyticsEnabled()).toBe(true);
    await analytics.capture("resume_created", { templateId: "modern" });

    expect(init).toHaveBeenCalledTimes(1);
    // Starts opted out and is opted in explicitly, so a race on the consent
    // check cannot result in collection.
    expect(init.mock.calls[0][1]).toMatchObject({
      opt_out_capturing_by_default: true,
    });
    expect(optIn).toHaveBeenCalled();
    expect(capture).toHaveBeenCalledWith("resume_created", {
      templateId: "modern",
    });
  });

  it("stops capturing when consent is withdrawn mid-session", async () => {
    const { analytics, consent } = await loadAnalytics();
    consent.useConsent.getState().acceptAll();
    await analytics.capture("first");
    expect(capture).toHaveBeenCalledTimes(1);

    // Withdrawal must take effect immediately. The client is already loaded and
    // resolved, so a cached "enabled" value would keep sending - which is why
    // consent is re-checked on every call rather than at init.
    consent.useConsent.getState().rejectAll();
    await analytics.capture("second");
    await analytics.capturePageview("https://example.com/x");
    await analytics.identify("hash");

    expect(capture).toHaveBeenCalledTimes(1);
    expect(identify).not.toHaveBeenCalled();
  });

  it("sends nothing at all when no key is configured, even with consent", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
    const analytics = await import("@/utilities/analytics");
    const consent = await import("@/utilities/consent");
    consent.useConsent.getState().acceptAll();

    expect(analytics.analyticsConfigured()).toBe(false);
    expect(analytics.analyticsEnabled()).toBe(false);
    await analytics.capture("resume_created");
    expect(init).not.toHaveBeenCalled();
  });
});
