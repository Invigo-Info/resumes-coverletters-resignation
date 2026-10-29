"use client";

import { useEffect, useState } from "react";
import { ErrorState } from "@/components/common/error-state";
import "./globals.css";

/**
 * Last-resort boundary: catches errors thrown by the ROOT layout itself, which
 * no other boundary can see. Because the layout has failed, this file must
 * render its own <html> and <body> - there is no layout left to provide them,
 * and no providers, session or fonts to rely on.
 *
 * Without this file such a crash produced an unstyled framework page, and - more
 * importantly - was never reported to Sentry at all, so the most serious class
 * of failure was the one we had no telemetry for.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [incidentId, setIncidentId] = useState<string | undefined>(error.digest);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
    void import("@sentry/nextjs").then((Sentry) => {
      setIncidentId(Sentry.captureException(error));
    });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <ErrorState
          title="Something went wrong"
          message="We hit an unexpected problem loading the app. Your saved work is safe - please try again."
          incidentId={incidentId}
          onRetry={reset}
        />
      </body>
    </html>
  );
}
