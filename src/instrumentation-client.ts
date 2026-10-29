/**
 * Client observability (Next native instrumentation-client). Sentry's browser
 * SDK is initialized ONLY when NEXT_PUBLIC_SENTRY_DSN is set. Because that value
 * is inlined at build time, the whole block (and the @sentry/nextjs import) is
 * dead-code-eliminated when it is empty - so NO Sentry code ships to users until
 * you configure it.
 */
/**
 * What is deliberately NOT sent to Sentry.
 *
 * This is a resume product: the content users type IS the sensitive data, and
 * a job search is something people have a strong interest in keeping private
 * from their current employer. An error report that happens to carry a resume
 * body, a cover letter, or the email of the person writing it turns a crash
 * tracker into a disclosure.
 *
 *   - `sendDefaultPii: false` keeps IP addresses, cookies and request bodies
 *     out of events. It is the default, but it is set explicitly because the
 *     consequence of it flipping is not something to leave implicit.
 *   - Query strings are stripped from URLs: `?token=` on the password-reset and
 *     email-verification pages would otherwise put a LIVE single-use credential
 *     into an error report.
 *   - The only user field kept is a HASHED id (the same SHA-256 of the email
 *     used for analytics). No email, no username, no IP. That is enough to
 *     answer "one customer or everyone?" during an incident without Sentry
 *     holding an address. The error pages still surface only an event id.
 *
 * Error reporting itself runs without consent, as service security and
 * stability (legitimate interest), which is only defensible BECAUSE of the
 * scrubbing above. Analytics, which is not necessary to run the service, waits
 * for consent - see `utilities/consent.ts`.
 */

/** Remove query strings and fragments from anything URL-shaped. */
function stripUrl(value: string): string {
  const cut = value.search(/[?#]/);
  return cut === -1 ? value : value.slice(0, cut);
}

/**
 * Strip credentials and PII that must never leave the app in a crash report.
 *
 * The user object is REDUCED rather than deleted. Deleting it outright - which
 * is what this did first - also destroyed the ability to answer "is this one
 * customer or everyone?", which is the first question asked in an incident and
 * the difference between a support reply and a rollback. So the hashed id is
 * kept and every directly identifying field is dropped: no email, no username,
 * no IP address. The id is the same SHA-256 of the email used for analytics, so
 * a report can be correlated without Sentry ever holding an address.
 */
function scrub<
  T extends {
    request?: {
      url?: string;
      query_string?: unknown;
      data?: unknown;
      cookies?: unknown;
    };
    user?: Record<string, unknown>;
  },
>(event: T): T {
  if (event.request) {
    if (typeof event.request.url === "string") {
      event.request.url = stripUrl(event.request.url);
    }
    // A reset token in a query string is a password equivalent.
    delete event.request.query_string;
    delete event.request.data;
    delete event.request.cookies;
  }
  if (event.user) {
    const id = event.user.id;
    event.user = typeof id === "string" ? { id } : {};
  }
  return event;
}

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  void import("@sentry/nextjs").then((Sentry) => {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
      // Ties an error to the deploy that caused it. Without a release, every
      // stack trace is against "unknown" and a regression cannot be dated.
      release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
      tracesSampleRate: 0.1,
      sendDefaultPii: false,
      // Session Replay stays OFF. It records the DOM, which on this product
      // means recording the resume being typed - it would need its own consent
      // category and heavy masking before it could be justified.
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
      beforeSend: (event) => scrub(event),
    });
  });
}
