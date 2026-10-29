"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useConsent, consentUndecided } from "@/utilities/consent";
import { analyticsConfigured, revokeAnalytics } from "@/utilities/analytics";
import { googleTagsConfigured } from "@/utilities/google-tags";

/**
 * True when this deployment actually has something optional to ask about.
 *
 * If no analytics or tag key is configured, the app sets nothing beyond what it
 * needs to run, and a cookie banner would be both pointless and misleading -
 * it would claim tracking that does not exist. So the banner is driven by
 * configuration, not shown unconditionally.
 */
function hasOptionalStorage(): boolean {
  return analyticsConfigured() || googleTagsConfigured();
}

/** Shared copy, so the banner and the preferences panel cannot drift apart. */
const CATEGORIES = [
  {
    key: "analytics" as const,
    label: "Analytics",
    detail:
      "How the app is used - which pages are visited and which features help. Never the contents of your documents.",
  },
  {
    key: "marketing" as const,
    label: "Advertising",
    detail:
      "Lets us measure which ads bring people here, and show relevant ads elsewhere.",
  },
];

/**
 * Cookie / tracking consent banner.
 *
 * Both top-level buttons carry equal visual weight. A reject option that is
 * hidden, greyed out, or buried a click deeper is specifically called out as
 * non-compliant by EU regulators, and it is a dark pattern regardless.
 *
 * "Choose" opens per-category toggles rather than offering one lump switch:
 * analytics and advertising are different purposes, and a single "accept
 * cookies" covering both is invalid consent for whichever the visitor did not
 * actually want.
 *
 * Nothing optional runs until a choice is made - see `utilities/consent.ts` for
 * why undecided is treated as "no" rather than "yes".
 */
export function ConsentBanner() {
  const analytics = useConsent((s) => s.analytics);
  const marketing = useConsent((s) => s.marketing);
  const acceptAll = useConsent((s) => s.acceptAll);
  const rejectAll = useConsent((s) => s.rejectAll);
  const setChoices = useConsent((s) => s.setChoices);

  const [expanded, setExpanded] = useState(false);
  // Draft toggles default to OFF, so simply opening the panel and saving grants
  // nothing the visitor did not actively switch on.
  const [draft, setDraft] = useState({ analytics: false, marketing: false });

  // The persisted store rehydrates after the first client render, so rendering
  // on the server (or before rehydration) would flash the banner at visitors
  // who already decided, and would be a hydration mismatch.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  if (!ready) return null;
  if (!hasOptionalStorage()) return null;
  // Every category answered; respect the decision silently.
  if (!consentUndecided()) return null;

  /** Record the panel's toggles, and stop anything the visitor switched off. */
  function saveChoices() {
    setChoices(draft);
    if (!draft.analytics) void revokeAnalytics();
  }

  return (
    <div
      // `role="region"`, not a dialog: it must not trap focus or block the page.
      // Someone who wants to read the privacy policy before deciding has to be
      // able to navigate there.
      role="region"
      aria-label="Cookie choices"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 px-4 py-4 shadow-lg backdrop-blur print:hidden sm:px-6"
    >
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">
              We use cookies to understand how the app is used.
            </span>{" "}
            These are optional and off until you allow them. What we need to sign
            you in, keep your work, and process payments stays on either way.{" "}
            <Link
              href="/privacy"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              Privacy policy
            </Link>
          </p>

          <div className="flex shrink-0 flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="inline-flex h-11 items-center justify-center rounded-[6px] px-4 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              {expanded ? "Hide options" : "Choose"}
            </button>
            <button
              type="button"
              onClick={() => {
                rejectAll();
                // Clears anything already stored if consent was granted earlier
                // in this session. No-op when nothing was ever loaded.
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
              Allow all
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 space-y-3 border-t border-border pt-4">
            {CATEGORIES.map((c) => (
              <label
                key={c.key}
                className="flex cursor-pointer items-start gap-3 text-sm"
              >
                <input
                  type="checkbox"
                  checked={draft[c.key]}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, [c.key]: e.target.checked }))
                  }
                  className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]"
                />
                <span>
                  <span className="font-semibold text-foreground">
                    {c.label}
                  </span>
                  <span className="block text-muted-foreground">{c.detail}</span>
                </span>
              </label>
            ))}

            <div className="flex items-start gap-3 text-sm">
              <span className="mt-0.5 size-4 shrink-0 text-center text-muted-foreground">
                &#10003;
              </span>
              <span>
                <span className="font-semibold text-foreground">
                  Necessary
                </span>
                <span className="block text-muted-foreground">
                  Signing you in, saving your work, and your cookie choice
                  itself. Always on - the service cannot work without them.
                </span>
              </span>
            </div>

            <button
              type="button"
              onClick={saveChoices}
              className="inline-flex h-11 items-center justify-center rounded-[6px] bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-strong"
            >
              Save my choices
            </button>
          </div>
        )}
      </div>

      {/* Current state of each category, announced for screen readers only. */}
      <span className="sr-only" aria-live="polite">
        {`Analytics ${analytics === true ? "allowed" : "not allowed"}, advertising ${
          marketing === true ? "allowed" : "not allowed"
        }`}
      </span>
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
export function ConsentPreferencesLink({ className }: { className?: string }) {
  const reopen = useConsent((s) => s.reopen);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  if (!ready || !hasOptionalStorage()) return null;

  // The separator is part of this component rather than the footer's list, so
  // that hiding the link leaves no stray bullet behind in the footer.
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
