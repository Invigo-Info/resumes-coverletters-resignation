"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { analyticsEnabled, capturePageview, identify } from "@/utilities/analytics";
import { useConsent } from "@/utilities/consent";

/**
 * Sends a PostHog pageview on route change, and associates events with the
 * signed-in account once there is one. Renders nothing, and does nothing at all
 * until analytics is both configured and consented to.
 *
 * `analytics` from the consent store is a real dependency, not a guard read
 * once: without it, a visitor who accepts on the banner would record nothing
 * until their next navigation, losing the entry page of every consenting
 * session - which is the one you most want for attribution.
 *
 * Uses `usePathname` only (no `useSearchParams`) so it needs no Suspense
 * boundary.
 */
export function AnalyticsTracker() {
  const pathname = usePathname();
  const consent = useConsent((s) => s.analytics);
  const { data: session } = useSession();
  const email = session?.user?.email;

  useEffect(() => {
    if (!analyticsEnabled()) return;
    void capturePageview(window.location.href);
  }, [pathname, consent]);

  useEffect(() => {
    if (!email) return;
    // The id is a hash of the email, never the address itself: a PostHog person
    // list would otherwise be a directory of who is job hunting, which is
    // exactly the inference users would least like exported to a third party.
    // The hash is stable, so funnels across sessions still work.
    void (async () => {
      const id = await hashEmail(email);

      // Sentry gets the SAME hashed id, and gets it regardless of analytics
      // consent - error monitoring runs on service-stability grounds, and this
      // is what answers "is one customer affected or everyone?" at the start of
      // an incident. It is a pseudonymous id only; `beforeSend` strips email,
      // username and IP from every event.
      if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
        void import("@sentry/nextjs").then((Sentry) => {
          Sentry.setUser({ id });
        });
      }

      if (analyticsEnabled()) await identify(id);
    })();
  }, [email, consent]);

  // Clear the Sentry identity on sign-out, so a later error on a shared machine
  // is not attributed to whoever used it last.
  useEffect(() => {
    if (email || !process.env.NEXT_PUBLIC_SENTRY_DSN) return;
    void import("@sentry/nextjs").then((Sentry) => {
      Sentry.setUser(null);
    });
  }, [email]);

  return null;
}

/**
 * Stable, non-reversible id for an account.
 *
 * SHA-256 over the lowercased address. Not a secret-grade construction - an
 * attacker holding the digest and a guess can confirm it - but it keeps plain
 * addresses out of a third-party analytics store, which is the point.
 */
async function hashEmail(email: string): Promise<string> {
  const data = new TextEncoder().encode(email.trim().toLowerCase());
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
