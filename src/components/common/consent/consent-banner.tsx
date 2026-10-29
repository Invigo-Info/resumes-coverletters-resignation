"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useConsent } from "@/utilities/consent";
import { analyticsConfigured, revokeAnalytics } from "@/utilities/analytics";

/**
 * Cookie / analytics consent banner.
 *
 * Shown only when there is actually something optional to decide about: if no
 * PostHog key is configured, the app sets nothing beyond what it needs to run,
 * and a cookie banner would be both pointless and misleading. So the banner is
 * driven by `analyticsConfigured()`, not shown unconditionally.
 *
 * Both buttons carry equal visual weight. A reject option that is hidden, greyed
 * out, or buried a click deeper is specifically called out as non-compliant by
 * EU regulators, and it is also just a dark pattern.
 *
 * Nothing optional runs until a choice is made - see `utilities/consent.ts` for
 * why undecided is treated as "no" rather than "yes".
 */
export function ConsentBanner() {
  const analytics = useConsent((s) => s.analytics);
  const acceptAll = useConsent((s) => s.acceptAll);
  const rejectAll = useConsent((s) => s.rejectAll);

  // The persisted store rehydrates after the first client render, so rendering
  // the banner on the server (or before rehydration) would flash it at visitors
  // who already decided, and would be a hydration mismatch.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  if (!ready) return null;
  // No optional storage in this deployment, so nothing to ask about.
  if (!analyticsConfigured()) return null;
  // A decision exists; respect it silently.
  if (analytics !== null) return null;

  return (
    <div
      // `role="region"` rather than a dialog: it must not trap focus or block
      // the page. Someone who wants to read the privacy policy before deciding
      // has to be able to navigate there.
      role="region"
      aria-label="Cookie choices"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 px-4 py-4 shadow-lg backdrop-blur print:hidden sm:px-6"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">
            We use cookies to understand how the app is used.
          </span>{" "}
          Analytics is optional and off until you allow it. What we need to sign
          you in, keep your work, and process payments stays on either way.{" "}
          <Link
            href="/privacy"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            Privacy policy
          </Link>
        </p>

        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            onClick={() => {
              rejectAll();
              // Clears anything PostHog stored if consent was previously given
              // in this session. No-op when it was never loaded.
              void revokeAnalytics();
            }}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-[6px] px-5 text-sm font-semibold text-foreground ring-1 ring-border transition-colors hover:bg-secondary sm:flex-none"
          >
            Reject optional
          </button>
          <button
            type="button"
            onClick={acceptAll}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-[6px] bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-strong sm:flex-none"
          >
            Allow analytics
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Footer control that re-opens the choice.
 *
 * Consent has to be as easy to withdraw as it was to give, so this is a
 * permanent entry point rather than a one-time banner. Renders nothing when
 * there is no optional storage to manage.
 */
export function ConsentPreferencesLink({
  className,
}: {
  className?: string;
}) {
  const reopen = useConsent((s) => s.reopen);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  if (!ready || !analyticsConfigured()) return null;

  // The separator is part of this component rather than the footer's list, so
  // that hiding the link (no analytics configured) does not leave a stray
  // bullet behind in the footer.
  return (
    <span className="inline-flex items-center gap-x-2">
      <span aria-hidden>&middot;</span>
      <button
        type="button"
        onClick={() => {
          reopen();
          // Stop collecting straight away. Re-opening the choice means the old
          // permission no longer stands, so waiting for the new answer would
          // keep collecting under consent the user has just rescinded.
          void revokeAnalytics();
        }}
        className={className}
      >
        Cookie preferences
      </button>
    </span>
  );
}
