import type { Instrumentation } from "next";

/**
 * Server observability bootstrap (Next native instrumentation). Sentry is loaded
 * and initialized ONLY when SENTRY_DSN is set, so the app runs unchanged until
 * you configure it. Deliberately does NOT wrap next.config, to keep the
 * customized Next 16 build intact.
 */
export async function register(): Promise<void> {
  if (!process.env.SENTRY_DSN) return;
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
}

/** Forward server request errors to Sentry (only when configured). */
export const onRequestError: Instrumentation.onRequestError = async (
  err,
  request,
  context
) => {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(err, request, context);
};
