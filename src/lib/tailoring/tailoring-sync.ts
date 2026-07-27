"use client";

/**
 * Server sync for the tailoring session workflow, mirroring documents-sync.ts.
 *
 * "Tailor your resume" is a durable SESSION (see tailoring-session-store.ts) so a
 * user's progress survives payment redirects, share popups and page reloads - and
 * follows the account across devices. The store is the source of truth for instant
 * UI; these helpers mirror the whole session to `/api/tailoring/sessions`
 * (best-effort, fire-and-forget) on each discrete change, and hydrate it back on
 * load. When logged out the requests 401 and are ignored, so local-only behavior
 * is unchanged.
 */

import type { TailoringSession } from "@/lib/store/tailoring-session-store";

/** Persist the full session snapshot to the account (best-effort). */
export function pushTailoringSession(session: TailoringSession): void {
  try {
    void fetch("/api/tailoring/sessions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session }),
    }).catch(() => {});
  } catch {
    /* ignore - the local store already has it */
  }
}

/** Remove a session from the account (best-effort). */
export function deleteTailoringSession(id: string): void {
  try {
    void fetch(`/api/tailoring/sessions?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}

/**
 * Fetch one saved session by id. Returns null when logged out / offline / absent,
 * so callers keep using local state.
 */
export async function fetchTailoringSession(
  id: string
): Promise<TailoringSession | null> {
  try {
    const res = await fetch(
      `/api/tailoring/sessions?id=${encodeURIComponent(id)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null; // 401 when not signed in
    const body = (await res.json()) as { session?: TailoringSession | null };
    return body.session ?? null;
  } catch {
    return null;
  }
}
