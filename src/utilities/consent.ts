"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { safeLocalStorage } from "@/utilities/safe-storage";

/**
 * Cookie / tracking consent.
 *
 * Why this has to exist before any analytics or tag key is set in production:
 * PostHog, GTM and GA all set identifiers the moment their key is present.
 * Under GDPR and the ePrivacy Directive that storage needs consent BEFORE it is
 * set, not a notice afterwards - so turning a key on without this would track
 * the first visitor unlawfully.
 *
 * `null` means not yet decided. It is deliberately distinct from `false`:
 * undecided shows the banner and permits nothing, whereas a recorded `false` is
 * a choice to respect silently. Defaulting undecided to "allowed" is the exact
 * mistake this module exists to prevent.
 *
 * TWO categories, not one. They are genuinely different purposes and the law
 * treats them differently, so a single "accept cookies" switch covering both
 * would be invalid consent for whichever the user did not actually want:
 *
 *   analytics - understanding how the product is used (PostHog, GA4, Web Vitals)
 *   marketing - advertising and remarketing tags, which is what a tag manager
 *               is usually there to carry
 *
 * Google Tag Manager sits under `marketing` because that is the worst case of
 * what it can load. It is a container: whatever is configured inside it can
 * change without a deploy and without review, so it has to be consented to at
 * the broadest purpose it could serve, not the narrowest one it happens to
 * serve today.
 */

/**
 * Bump when a category is added or its meaning changes, so visitors are asked
 * again rather than inheriting consent they never gave for the new thing.
 *
 * v2 added `marketing` when GTM/GA4 were wired.
 */
export const CONSENT_VERSION = 2;

/** The optional purposes a visitor can allow or refuse. */
export type ConsentCategory = "analytics" | "marketing";

export interface ConsentState {
  version: number;
  /** Product analytics (PostHog, GA4, Web Vitals). null = undecided. */
  analytics: boolean | null;
  /** Advertising / tag manager (GTM and anything it loads). null = undecided. */
  marketing: boolean | null;
  /** Epoch ms the choice was recorded, for the audit trail. */
  decidedAt: number | null;
  /** Allow everything. */
  acceptAll: () => void;
  /** Refuse everything optional. */
  rejectAll: () => void;
  /** Record an explicit per-category choice (the granular panel). */
  setChoices: (choices: Record<ConsentCategory, boolean>) => void;
  /** Re-open the choice (the footer's "Cookie preferences"). */
  reopen: () => void;
}

export const useConsent = create<ConsentState>()(
  persist(
    (set) => ({
      version: CONSENT_VERSION,
      analytics: null,
      marketing: null,
      decidedAt: null,
      acceptAll: () =>
        set({
          analytics: true,
          marketing: true,
          decidedAt: Date.now(),
          version: CONSENT_VERSION,
        }),
      rejectAll: () =>
        set({
          analytics: false,
          marketing: false,
          decidedAt: Date.now(),
          version: CONSENT_VERSION,
        }),
      setChoices: (choices) =>
        set({
          analytics: choices.analytics,
          marketing: choices.marketing,
          decidedAt: Date.now(),
          version: CONSENT_VERSION,
        }),
      reopen: () =>
        set({ analytics: null, marketing: null, decidedAt: null }),
    }),
    {
      name: "resume-co:consent",
      storage: createJSONStorage(() => safeLocalStorage),
      /**
       * A stored decision from an older version is discarded, so adding a
       * category cannot silently inherit consent that was never given for it.
       * The v1 store had only `analytics`; a v1 "accept" must not be read as
       * permission for the marketing tags v2 introduced.
       */
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<ConsentState>;
        if (p.version !== CONSENT_VERSION) return current;
        return { ...current, ...p };
      },
    }
  )
);

/** True only when the visitor has actively allowed this category. */
export function consentGranted(category: ConsentCategory): boolean {
  return useConsent.getState()[category] === true;
}

/**
 * True only when the visitor has actively allowed analytics.
 *
 * Synchronous, so non-React modules can check it on every call rather than
 * caching a value that a later rejection would not clear.
 */
export function analyticsConsentGranted(): boolean {
  return consentGranted("analytics");
}

/** True only when the visitor has actively allowed marketing / ad tags. */
export function marketingConsentGranted(): boolean {
  return consentGranted("marketing");
}

/**
 * Whether a decision is still outstanding (drives the banner).
 *
 * Any undecided category counts: a visitor who has answered one purpose but not
 * a newly added one has not finished deciding.
 */
export function consentUndecided(): boolean {
  const s = useConsent.getState();
  return s.analytics === null || s.marketing === null;
}
