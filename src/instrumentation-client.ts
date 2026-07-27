/**
 * Client observability (Next native instrumentation-client). Sentry's browser
 * SDK is initialized ONLY when NEXT_PUBLIC_SENTRY_DSN is set. Because that value
 * is inlined at build time, the whole block (and the @sentry/nextjs import) is
 * dead-code-eliminated when it is empty - so NO Sentry code ships to users until
 * you configure it.
 */
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  void import("@sentry/nextjs").then((Sentry) => {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 0.1,
      // Session Replay is opt-in; keep it off until you decide to enable it.
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
    });
  });
}
