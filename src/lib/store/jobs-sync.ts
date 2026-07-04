"use client";

/**
 * Server sync for saved jobs - THIN STUB for now.
 *
 * Saved jobs currently live only in localStorage (see jobs-store.ts). This
 * module isolates the future move to account-level persistence: when a real
 * backend exists, fill these in to call `/api/jobs/saved` (POST/DELETE), the
 * same way `documents-sync.ts` mirrors resume drafts to the server. Keeping the
 * call sites here means the store never changes when the backend arrives.
 */

import type { JobPosting } from "@/lib/jobs/job-search";

/** Persist a saved job to the user's account (no-op until a backend exists). */
export function pushSavedJob(_job: JobPosting): void {
  // TODO(db): await fetch("/api/jobs/saved", { method: "POST", body: ... })
}

/** Remove a saved job from the user's account (no-op until a backend exists). */
export function deleteSavedJob(_jobId: string): void {
  // TODO(db): await fetch(`/api/jobs/saved?id=${jobId}`, { method: "DELETE" })
}
