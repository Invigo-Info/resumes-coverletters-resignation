"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { analyticsEnabled, capturePageview } from "@/lib/analytics";

/**
 * Sends a PostHog pageview whenever the route changes. Renders nothing and does
 * nothing at all when analytics is not configured. Uses `usePathname` only (no
 * `useSearchParams`) so it needs no Suspense boundary.
 */
export function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!analyticsEnabled()) return;
    void capturePageview(window.location.href);
  }, [pathname]);

  return null;
}
