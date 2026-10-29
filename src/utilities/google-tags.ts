"use client";

/**
 * Google Tag Manager / GA4 plumbing.
 *
 * Built on `next/script` rather than `@next/third-parties`, deliberately: that
 * package would be a new dependency, and its `GoogleTagManager` component loads
 * the container as soon as it renders, which is precisely what must not happen
 * before consent. Doing it here is a dozen lines and keeps the consent gate in
 * one place.
 *
 * GTM and GA4 are MUTUALLY EXCLUSIVE at runtime. Running both means two
 * scripts, two consent surfaces and double-counted pageviews - and if GA4 is
 * configured inside the GTM container as well, every event is recorded twice,
 * which is the kind of error that quietly invalidates months of numbers. So:
 * if a GTM id is set, GA4 is left to GTM; GA4 loads directly only when there is
 * no GTM id.
 *
 * Both stay OFF until the matching consent is granted - see `consent.ts` for
 * why GTM is gated on `marketing` rather than `analytics`.
 */

export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || "";
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "";

/** True when a tag manager container is configured. */
export function gtmConfigured(): boolean {
  return Boolean(GTM_ID);
}

/**
 * True when GA4 should be loaded DIRECTLY.
 *
 * False when GTM is configured, even if a GA id is also set: in that case GA
 * belongs inside the container, and loading it here too would double-count.
 */
export function gaDirectConfigured(): boolean {
  return Boolean(GA_ID) && !GTM_ID;
}

/** True when either Google tag is configured at all. */
export function googleTagsConfigured(): boolean {
  return gtmConfigured() || gaDirectConfigured();
}

type DataLayerValue = unknown[];

interface GoogleWindow extends Window {
  dataLayer?: DataLayerValue;
}

/** Push onto the GTM/GA dataLayer, creating it if the tag has not loaded yet. */
function push(...args: unknown[]): void {
  if (typeof window === "undefined") return;
  const w = window as GoogleWindow;
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push(args.length === 1 ? args[0] : args);
}

/**
 * Google Consent Mode v2 signals.
 *
 * This is belt-and-braces. The primary gate is that we do not load the tag at
 * all before consent, which is stricter than Consent Mode on its own. But a
 * container can be edited in the GTM dashboard by someone who never sees this
 * code, so the tags inside it are also told, in Google's own vocabulary, what
 * they may do. Both layers are cheap; relying on either alone is not.
 *
 * `ad_user_data` and `ad_personalization` are the two signals Consent Mode v2
 * added and that Google requires for EEA traffic.
 */
export function pushConsentDefaults(): void {
  // Must be queued BEFORE any tag loads, which is why this is called from the
  // bootstrap script rather than after the container.
  push("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
    functionality_storage: "granted",
    security_storage: "granted",
    wait_for_update: 500,
  });
}

/** Tell Google tags what the visitor has actually allowed. */
export function pushConsentUpdate(granted: {
  analytics: boolean;
  marketing: boolean;
}): void {
  push("consent", "update", {
    ad_storage: granted.marketing ? "granted" : "denied",
    ad_user_data: granted.marketing ? "granted" : "denied",
    ad_personalization: granted.marketing ? "granted" : "denied",
    analytics_storage: granted.analytics ? "granted" : "denied",
    functionality_storage: "granted",
    security_storage: "granted",
  });
}

/**
 * The inline bootstrap that must run before the container.
 *
 * Declares `gtag` and queues the denied-by-default consent state, so a tag that
 * loads later cannot act before it has been told what is allowed.
 */
export const CONSENT_BOOTSTRAP = `
window.dataLayer = window.dataLayer || [];
function gtag(){window.dataLayer.push(arguments);}
gtag('consent','default',{
  ad_storage:'denied',
  ad_user_data:'denied',
  ad_personalization:'denied',
  analytics_storage:'denied',
  functionality_storage:'granted',
  security_storage:'granted',
  wait_for_update:500
});
`.trim();

/**
 * Push a conversion / custom event into the dataLayer.
 *
 * Separate from PostHog's `capture` on purpose: these are different systems
 * with different retention and different consent, so an event meant for ad
 * attribution should be sent here explicitly rather than mirrored
 * automatically. Same property rule applies - no resume content, no employer
 * names, no email addresses, ever.
 */
export function pushDataLayerEvent(
  event: string,
  properties?: Record<string, unknown>
): void {
  if (!googleTagsConfigured()) return;
  push({ event, ...properties });
}
