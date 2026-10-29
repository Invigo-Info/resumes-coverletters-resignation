"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { safeLocalStorage } from "@/utilities/safe-storage";

/**
 * Cookie / tracking consent.
 *
 * Why this has to exist before analytics keys are set in production: PostHog
 * initialises and starts sending pageviews the moment
 * NEXT_PUBLIC_POSTHOG_KEY is present. Under GDPR and the ePrivacy Directive,
 * analytics storage needs consent BEFORE it is set, not a notice afterwards -
 * so turning the key on without this would have tracked the first visitor
 * unlawfully. Everything optional now waits on `analytics === true`.
 *
 * `null` means not yet decided. It is deliberately distinct from `false`:
 * undecided shows the banner and permits nothing, whereas a recorded `false` is
 * a choice to respect silently. Defaulting undecided to "allowed" is the exact
 * mistake this module prevents.
 */

/** Bump when a new optional category is added, so visitors are asked again. */
export const CONSENT_VERSION = 1;

export interface ConsentState {
  version: number;
  /** Product analytics (PostHog). null = undecided. */
  analytics: boolean | null;
  /** Epoch ms the choice was recorded, for the audit trail. */
  decidedAt: number | null;
  acceptAll: () => void;
  rejectAll: () => void;
  /** Re-open the choice (the footer's "Cookie preferences"). */
  reopen: () => void;
}

export const useConsent = create<ConsentState>()(
  persist(
    (set) => ({
      version: CONSENT_VERSION,
      analytics: null,
      decidedAt: null,
      acceptAll: () =>
        set({
          analytics: true,
          decidedAt: Date.now(),
          version: CONSENT_VERSION,
        }),
      rejectAll: () =>
        set({
          analytics: false,
          decidedAt: Date.now(),
          version: CONSENT_VERSION,
        }),
      reopen: () => set({ analytics: null, decidedAt: null }),
    }),
    {
      name: "resume-co:consent",
      storage: createJSONStorage(() => safeLocalStorage),
      /**
       * A stored decision from an older version is treated as undecided, so
       * adding a category cannot silently inherit consent that was never given
       * for it.
       */
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<ConsentState>;
        if (p.version !== CONSENT_VERSION) return current;
        return { ...current, ...p };
      },
    }
  )
);

/**
 * True only when the visitor has actively allowed analytics.
 *
 * Synchronous, so non-React modules can check it on every call rather than
 * caching a value that a later rejection would not clear.
 */
export function analyticsConsentGranted(): boolean {
  return useConsent.getState().analytics === true;
}

/** Whether a decision is still outstanding (drives the banner). */
export function consentUndecided(): boolean {
  return useConsent.getState().analytics === null;
}
