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
 *   - No user email or name is attached. The analytics id is a hash, and Sentry
 *     gets nothing at all - an event id is enough for support to correlate,
 *     which is why the error pages surface that and nothing else.
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

/** Strip credentials and PII that must never leave the app in a crash report. */
function scrub<T extends { request?: { url?: string; query_string?: unknown; data?: unknown; cookies?: unknown }; user?: unknown }>(
  event: T
): T {
  if (event.request) {
    if (typeof event.request.url === "string") {
      event.request.url = stripUrl(event.request.url);
    }
    // A reset token in a query string is a password equivalent.
    delete event.request.query_string;
    delete event.request.data;
    delete event.request.cookies;
  }
  delete event.user;
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
