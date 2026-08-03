"use client";

/**
 * Server sync for saved jobs, mirroring `documents-sync.ts`. Saved jobs live in
 * localStorage (see jobs-store.ts) for instant UI; these helpers mirror every
 * change to `/api/jobs/saved` so a signed-in user's saved postings follow their
 * account across browsers/devices.
 *
 * Writes are best-effort and fire-and-forget - the local store stays the source
 * of truth; the server is the durable, cross-device backup that the Jobs page
 * pulls from on load. When logged out the requests 401 and are ignored, so the
 * local-only behavior is unchanged.
 */

import type { JobPosting } from "@/features/jobs/lib/job-search";

/** Persist a saved job to the user's account (best-effort). */
export function pushSavedJob(job: JobPosting): void {
  try {
    void fetch("/api/jobs/saved", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job }),
    }).catch(() => {});
  } catch {
    /* ignore - local store already has it */
  }
}

/** Remove a saved job from the user's account (best-effort). */
export function deleteSavedJob(jobId: string): void {
  try {
    void fetch(`/api/jobs/saved?id=${encodeURIComponent(jobId)}`, {
      method: "DELETE",
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}

/** One saved posting as returned by the server. */
interface ServerSavedJob {
  job: JobPosting;
  savedAt: number;
}

/** Fetch the signed-in user's saved jobs. Returns null when logged out/offline. */
export async function fetchSavedJobs(): Promise<ServerSavedJob[] | null> {
  try {
    const res = await fetch("/api/jobs/saved", { cache: "no-store" });
    if (!res.ok) return null; // 401 when not signed in
    const body = (await res.json()) as { jobs?: ServerSavedJob[] };
    return body.jobs ?? [];
  } catch {
    return null;
  }
}

/* --------------------------- dismissed jobs -------------------------- */

/** Dismiss ("Not interested") one job on the account (best-effort). */
export function pushDismissedJob(jobId: string, reason?: string): void {
  try {
    void fetch("/api/jobs/dismissed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, reason }),
    }).catch(() => {});
  } catch {
    /* ignore - local store already has it */
  }
}

/** Clear all dismissed jobs on the account (best-effort). */
export function clearDismissedJobs(): void {
  try {
    void fetch("/api/jobs/dismissed", { method: "DELETE" }).catch(() => {});
  } catch {
    /* ignore */
  }
}

/** One dismissed posting as returned by the server. */
interface ServerDismissedJob {
  jobId: string;
  reason: string | null;
}

/** Fetch the signed-in user's dismissed jobs. Null when logged out/offline. */
export async function fetchDismissedJobs(): Promise<
  ServerDismissedJob[] | null
> {
  try {
    const res = await fetch("/api/jobs/dismissed", { cache: "no-store" });
    if (!res.ok) return null; // 401 when not signed in
    const body = (await res.json()) as { dismissed?: ServerDismissedJob[] };
    return body.dismissed ?? [];
  } catch {
    return null;
  }
}
