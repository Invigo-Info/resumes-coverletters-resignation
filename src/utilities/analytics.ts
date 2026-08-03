"use client";

/**
 * Product analytics via PostHog. INERT until configured: with no
 * NEXT_PUBLIC_POSTHOG_KEY, `analyticsEnabled()` is false and every helper is a
 * no-op. When the key is set, posthog-js is lazy-imported (its own chunk) so it
 * never weighs down the bundle for users until analytics is actually turned on.
 *
 * Usage: `capture("resume_downloaded", { templateId })` from any client code;
 * pageviews are sent automatically by <AnalyticsTracker/>.
 */

import type posthog from "posthog-js";

type PostHog = typeof posthog;

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

let loading: Promise<PostHog | null> | null = null;

/** True when a PostHog key is configured. */
export function analyticsEnabled(): boolean {
  return Boolean(KEY);
}

/** Lazy-load + init PostHog once. Returns null when analytics is disabled. */
async function getClient(): Promise<PostHog | null> {
  if (!KEY) return null;
  if (!loading) {
    loading = import("posthog-js").then(({ default: ph }) => {
      ph.init(KEY, {
        api_host: HOST,
        capture_pageview: false, // sent manually on route change
        capture_pageleave: true,
        person_profiles: "identified_only",
      });
      return ph;
    });
  }
  return loading;
}

/** Track a product event (no-op when analytics is disabled). */
export async function capture(
  event: string,
  properties?: Record<string, unknown>
): Promise<void> {
  const ph = await getClient();
  ph?.capture(event, properties);
}

/** Record a pageview for `url` (called by the route tracker). */
export async function capturePageview(url: string): Promise<void> {
  const ph = await getClient();
  ph?.capture("$pageview", { $current_url: url });
}

/** Associate events with a signed-in user (call after login). */
export async function identify(
  id: string,
  properties?: Record<string, unknown>
): Promise<void> {
  const ph = await getClient();
  ph?.identify(id, properties);
}

/** Clear identity on sign-out. */
export async function resetAnalytics(): Promise<void> {
  const ph = await getClient();
  ph?.reset();
}
