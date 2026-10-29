"use client";

import { useEffect, useState } from "react";
import { ErrorState } from "@/components/common/error-state";

/**
 * Recoverable error boundary for the signed-in app. One failing route now shows
 * a branded screen with a retry instead of taking the whole product down with a
 * framework error page.
 *
 * `reset()` re-renders the segment, which is genuinely enough for the common
 * causes here - a transient fetch failure or a database blip.
 */
export default function AuthenticatedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [incidentId, setIncidentId] = useState<string | undefined>(error.digest);

  useEffect(() => {
    // Report to Sentry only when it is configured; the import is inside the
    // check so nothing ships to users until a DSN exists.
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
    void import("@sentry/nextjs").then((Sentry) => {
      setIncidentId(Sentry.captureException(error));
    });
  }, [error]);

  return (
    <ErrorState
      title="Something went wrong on this page"
      message="This one's on us, not you. Try again - and if it keeps happening, let us know with the reference below."
      incidentId={incidentId}
      onRetry={reset}
    />
  );
}
