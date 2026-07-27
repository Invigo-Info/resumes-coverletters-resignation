import * as Sentry from "@sentry/nextjs";

/**
 * Sentry server init. Imported by instrumentation.ts ONLY when SENTRY_DSN is
 * set, so it never runs (or affects the app) until you configure it. No
 * next.config wrapping is used, keeping the customized Next build untouched -
 * source-map upload / tunneling can be added later via withSentryConfig if
 * wanted.
 */
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  // Conservative default sampling; raise once you have volume budget.
  tracesSampleRate: 0.1,
  enabled: Boolean(process.env.SENTRY_DSN),
});
