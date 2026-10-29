"use client";

import { useReportWebVitals } from "next/web-vitals";
import { analyticsEnabled, capture } from "@/utilities/analytics";

/**
 * Reports Core Web Vitals (LCP, CLS, INP, FCP, TTFB) into PostHog.
 *
 * Field data, not lab data: this is what real users on real devices and real
 * networks experienced, which is also what Google ranks on. A Lighthouse score
 * from a developer laptop says very little about either.
 *
 * Gated on the same analytics consent as everything else - a performance metric
 * is still a measurement tied to a visitor, so it does not get a free pass.
 * Renders nothing.
 */
export function WebVitals() {
  useReportWebVitals((metric) => {
    if (!analyticsEnabled()) return;
    void capture("web_vitals", {
      metric: metric.name,
      // Rounded: sub-millisecond precision is noise, and CLS is unitless so it
      // keeps three decimals instead.
      value:
        metric.name === "CLS"
          ? Math.round(metric.value * 1000) / 1000
          : Math.round(metric.value),
      rating: metric.rating,
      navigationType: metric.navigationType,
    });
  });

  return null;
}
