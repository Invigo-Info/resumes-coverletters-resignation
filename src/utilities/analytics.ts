"use client";

/**
 * Product analytics via PostHog.
 *
 * Two independent switches, both of which must be on before anything is sent:
 *
 *   1. CONFIGURED - NEXT_PUBLIC_POSTHOG_KEY is set. Without it posthog-js is
 *      never even imported, so no analytics code ships to users.
 *   2. CONSENTED - the visitor has actively allowed analytics. Checked on every
 *      call, not cached, so a later withdrawal takes effect immediately.
 *
 * The second switch is the one that was missing. PostHog used to initialise and
 * start sending pageviews as soon as the key existed, which would have set
 * analytics storage before any consent was given.
 *
 * Usage: `capture(EVENTS.resumeDownloaded, { templateId })` from client code;
 * pageviews are sent automatically by <AnalyticsTracker/>.
 */

import type posthog from "posthog-js";
import { analyticsConsentGranted } from "@/utilities/consent";

type PostHog = typeof posthog;

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

let loading: Promise<PostHog | null> | null = null;

/** True when a PostHog key is configured (says nothing about consent). */
export function analyticsConfigured(): boolean {
  return Boolean(KEY);
}

/**
 * True when analytics may actually run: configured AND consented.
 *
 * Callers should use this rather than `analyticsConfigured`, which only
 * describes the deployment.
 */
export function analyticsEnabled(): boolean {
  return Boolean(KEY) && analyticsConsentGranted();
}

/**
 * Lazy-load + init PostHog once. Returns null whenever analytics must not run,
 * which includes the case where consent was granted and then withdrawn.
 */
async function getClient(): Promise<PostHog | null> {
  if (!KEY) return null;
  // Re-checked on every call. The first call after a rejection must not reuse
  // an already-resolved client, and nothing may initialise before consent.
  if (!analyticsConsentGranted()) return null;
  if (!loading) {
    loading = import("posthog-js").then(({ default: ph }) => {
      ph.init(KEY, {
        api_host: HOST,
        capture_pageview: false, // sent manually on route change
        capture_pageleave: true,
        person_profiles: "identified_only",
        // Belt and braces: even if something calls in before the consent check
        // above, posthog itself starts opted out and is opted in explicitly.
        opt_out_capturing_by_default: true,
      });
      ph.opt_in_capturing();
      return ph;
    });
  }
  return loading;
}

/**
 * Stop collecting and clear what PostHog has stored for this visitor.
 *
 * Called when consent is withdrawn. Opting out is not enough on its own - the
 * distinct id and any stored properties were set under a consent that no longer
 * applies, so they are reset too.
 */
export async function revokeAnalytics(): Promise<void> {
  if (!KEY || !loading) return;
  const ph = await loading;
  if (!ph) return;
  try {
    ph.opt_out_capturing();
    ph.reset();
  } catch {
    /* best-effort */
  }
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
