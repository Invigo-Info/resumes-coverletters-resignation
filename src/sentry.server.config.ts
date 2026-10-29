import * as Sentry from "@sentry/nextjs";

/**
 * Sentry server init. Imported by instrumentation.ts ONLY when SENTRY_DSN is
 * set, so it never runs (or affects the app) until you configure it. No
 * next.config wrapping is used, keeping the customized Next build untouched -
 * see docs/observability.md for how to upload source maps without it.
 *

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

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN),
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  release: process.env.SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA,
  // Conservative default sampling; raise once you have volume budget.
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
  // Server events are the ones most likely to carry a request body - which on
  // this app can be a whole resume, or a password-reset token.
  beforeSend: (event) => scrub(event),
});
