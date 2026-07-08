"use client";

/**
 * Server sync for the tailoring session workflow - THIN STUB for now.
 *
 * "Tailor your resume" is modelled as a durable SESSION (see
 * tailoring-session-store.ts) so a user's progress survives payment redirects,
 * share popups and page reloads - not just transient React state, as the backend
 * architecture spec requires. That store is the source of truth for instant UI;
 * this module isolates the future move to account-level persistence, mirroring
 * the documents-sync.ts pattern (fire-and-forget, best-effort).
 *
 * When a real backend exists, fill these in against the documented endpoints:
 *   POST /api/tailoring/sessions                    -> createTailoringSession
 *   GET  /api/tailoring/sessions/{id}/analysis-status
 *   GET  /api/tailoring/sessions/{id}/keywords
 *   POST /api/tailoring/sessions/{id}/keywords       -> saveTailoringKeywords
 *   GET  /api/tailoring/sessions/{id}/suggestions
 *   POST /api/tailoring/suggestions/{id}/apply       -> pushSuggestionStatus(id,"applied")
 *   POST /api/tailoring/suggestions/{id}/skip        -> pushSuggestionStatus(id,"skipped")
 *   POST /api/tailoring/sessions/{id}/apply-all      -> pushApplyAll
 *   POST /api/tailoring/sessions/{id}/finalize       -> finalizeTailoringSession
 *   POST /api/resumes/{versionId}/download
 *   POST /api/resumes/{versionId}/share-link
 * Keeping the call sites here means the store never changes when the backend
 * arrives.
 */

import type {
  SuggestionStatus,
  TailoringSession,
} from "@/lib/store/tailoring-session-store";

/** Persist a newly created tailoring session (no-op until a backend exists). */
export function createTailoringSession(_session: TailoringSession): void {
  // TODO(db): void fetch("/api/tailoring/sessions", { method: "POST", body: ... }).catch(() => {});
}

/** Save the user's selected keywords + optional note (no-op for now). */
export function saveTailoringKeywords(
  _sessionId: string,
  _keywords: string[],
  _note: string
): void {
  // TODO(db): POST /api/tailoring/sessions/{id}/keywords
}

/** Record one suggestion's apply/skip transition (no-op for now). */
export function pushSuggestionStatus(
  _suggestionId: string,
  _status: SuggestionStatus
): void {
  // TODO(db): POST /api/tailoring/suggestions/{id}/apply | /skip
}

/** Record an "apply all remaining" transition (no-op for now). */
export function pushApplyAll(_sessionId: string): void {
  // TODO(db): POST /api/tailoring/sessions/{id}/apply-all
}

/** Finalize the session into a final tailored resume version (no-op for now). */
export function finalizeTailoringSession(
  _sessionId: string,
  _finalScore: number
): void {
  // TODO(db): POST /api/tailoring/sessions/{id}/finalize
}
