// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import {
  useConsent,
  analyticsConsentGranted,
  consentUndecided,
  CONSENT_VERSION,
} from "@/utilities/consent";

/**
 * Consent is the one piece here where a regression is a legal problem rather
 * than a bug, so the properties are pinned explicitly.
 *
 * The failure mode being guarded against is specific: PostHog initialises and
 * starts sending pageviews the moment NEXT_PUBLIC_POSTHOG_KEY is set. Under
 * GDPR and the ePrivacy Directive, analytics storage needs consent BEFORE it is
 * set. So "undecided" must behave exactly like "no", and must never be allowed
 * to drift into a default of "yes".
 */

beforeEach(() => {
  useConsent.setState({
    version: CONSENT_VERSION,
    analytics: null,
    decidedAt: null,
  });
});

describe("consent", () => {
  it("starts UNDECIDED, and undecided permits nothing", () => {
    // The single most important assertion in this file. A default of `true`
    // here is an unlawful-tracking bug, not a preference.
    expect(consentUndecided()).toBe(true);
    expect(analyticsConsentGranted()).toBe(false);
  });

  it("grants analytics only on an explicit accept", () => {
    useConsent.getState().acceptAll();
    expect(analyticsConsentGranted()).toBe(true);
    expect(consentUndecided()).toBe(false);
  });

  it("records a rejection as a decision, not as undecided", () => {
    // A recorded "no" must be respected silently - the banner must not keep
    // re-asking until the visitor gives in, which is the nagging dark pattern.
    useConsent.getState().rejectAll();
    expect(analyticsConsentGranted()).toBe(false);
    expect(consentUndecided()).toBe(false);
  });

  it("timestamps the decision either way, for the audit trail", () => {
    useConsent.getState().acceptAll();
    expect(useConsent.getState().decidedAt).toBeTypeOf("number");

    useConsent.setState({ analytics: null, decidedAt: null });
    useConsent.getState().rejectAll();
    expect(useConsent.getState().decidedAt).toBeTypeOf("number");
  });

  it("withdraws consent back to undecided when reopened", () => {
    useConsent.getState().acceptAll();
    expect(analyticsConsentGranted()).toBe(true);

    useConsent.getState().reopen();
    // Crucially this reverts to NOT granted, so re-opening the choice stops
    // collection rather than leaving the old permission standing while the
    // banner is on screen.
    expect(analyticsConsentGranted()).toBe(false);
    expect(consentUndecided()).toBe(true);
  });

  it("can be rejected after having been accepted", () => {
    useConsent.getState().acceptAll();
    useConsent.getState().rejectAll();
    expect(analyticsConsentGranted()).toBe(false);
  });

  it("stamps the current version on a decision", () => {
    // So a stored decision can be matched against the version it was made
    // under; a mismatch is treated as undecided by the store's merge.
    useConsent.setState({ version: 0, analytics: null, decidedAt: null });
    useConsent.getState().acceptAll();
    expect(useConsent.getState().version).toBe(CONSENT_VERSION);
  });
});
