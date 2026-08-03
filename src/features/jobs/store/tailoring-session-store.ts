"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { safeLocalStorage } from "@/utilities/safe-storage";
import type { SuggestionKind } from "@/features/jobs/lib/tailor-plan";
import { pushTailoringSession } from "@/features/jobs/tailoring/tailoring-sync";

/**
 * Durable tailoring session store.
 *
 * The backend architecture spec requires "Tailor your resume" to be a
 * session-based workflow that does NOT rely only on transient browser state,
 * because the user may go through payment, sharing popups, or reloads mid-flow.
 * This store is that session: it holds the section-by-section suggestions, each
 * suggestion's status (pending/applied/skipped) and any user edit, and the live
 * baseline/current/final/max scores. It is persisted to localStorage (the source
 * of truth for instant UI) and mirrored to the server via tailoring-sync.ts when
 * a backend exists. Shapes mirror the spec's TailoringSession / TailoringKeyword
 * / TailoringSuggestion models and the documented suggestion response.
 */

/** Suggestion section (matches the spec's `section` field). */
export type SuggestionSection =
  | "job_title"
  | "professional_summary"
  | "work_experience"
  | "skills";

export type SuggestionStatus = "pending" | "applied" | "skipped";
export type SessionStatus = "in_progress" | "finalized";

/** One durable suggestion row (mirrors the TailoringSuggestion model). */
export interface SessionSuggestion {
  id: string;
  section: SuggestionSection;
  /** Render / mutation kind (title | summary | experience | skills). */
  kind: SuggestionKind;
  label: string;
  /** Resume field the suggestion targets, e.g. "personal.jobTitle". */
  targetResumeField: string;
  scoreDelta: number;
  rationale: string;
  beforeText: string;
  /** The generated proposal (before any user edit). */
  suggestedText: string;
  /** The user's edit, or null when untouched. */
  editedText: string | null;
  status: SuggestionStatus;
  /** Skills to append (skills suggestions only). */
  skillsToAdd?: string[];
  /** Employment entry id (work_experience suggestions only). */
  entryId?: string;
}

/** A durable tailoring session (mirrors the TailoringSession model). */
export interface TailoringSession {
  id: string;
  resumeId: string;
  jobId: string;
  jobTitle: string;
  company: string;
  status: SessionStatus;
  baselineScore: number;
  currentScore: number;
  finalScore: number | null;
  maxScore: number;
  selectedKeywords: string[];
  userNote: string;
  suggestions: SessionSuggestion[];
  /** Currently expanded suggestion, or null when none/all resolved. */
  activeId: string | null;
  createdAt: number;
  updatedAt: number;
}

/** Everything needed to open (or resume) a session for a resume+job. */
export interface CreateSessionInput {
  resumeId: string;
  jobId: string;
  jobTitle: string;
  company: string;
  baselineScore: number;
  selectedKeywords: string[];
  userNote: string;
  suggestions: SessionSuggestion[];
}

/** The effective text of a suggestion (a user edit wins over the generated text). */
export function suggestionValue(s: SessionSuggestion): string {
  return s.editedText ?? s.suggestedText;
}

const now = () => Date.now();

/** Max reachable score = baseline + every suggestion's delta (capped at 99). */
function computeMax(baseline: number, suggestions: SessionSuggestion[]): number {
  const total = suggestions.reduce((sum, s) => sum + s.scoreDelta, 0);
  return Math.min(99, baseline + total);
}

/** Current score = baseline + the deltas of applied suggestions (capped at max). */
function computeCurrent(session: TailoringSession): number {
  const gained = session.suggestions
    .filter((s) => s.status === "applied")
    .reduce((sum, s) => sum + s.scoreDelta, 0);
  return Math.min(session.maxScore, session.baselineScore + gained);
}

/** The next still-pending suggestion to auto-expand, or null. */
function nextPending(suggestions: SessionSuggestion[]): string | null {
  const n = suggestions.find((s) => s.status === "pending");
  return n ? n.id : null;
}

interface TailoringSessionState {
  session: TailoringSession | null;
  /** Reuse the durable session for the same resume+job, else create a fresh one. */
  ensureSession: (input: CreateSessionInput) => TailoringSession;
  setActive: (id: string | null) => void;
  editSuggestion: (id: string, text: string) => void;
  applySuggestion: (id: string) => void;
  skipSuggestion: (id: string) => void;
  applyAllPending: () => void;
  finalize: () => void;
  reset: () => void;
}

export const useTailoringSessionStore = create<TailoringSessionState>()(
  persist(
    (set, get) => ({
      session: null,

      ensureSession: (input) => {
        const existing = get().session;
        // The same resume+job keeps its durable session (survives reloads, the
        // /payment round-trip, and share popups) - only its stored progress is
        // authoritative, so we never rebuild over applied/edited suggestions.
        if (
          existing &&
          existing.resumeId === input.resumeId &&
          existing.jobId === input.jobId
        ) {
          return existing;
        }
        const maxScore = computeMax(input.baselineScore, input.suggestions);
        const session: TailoringSession = {
          id: `tailor_${input.jobId}`,
          resumeId: input.resumeId,
          jobId: input.jobId,
          jobTitle: input.jobTitle,
          company: input.company,
          status: "in_progress",
          baselineScore: input.baselineScore,
          currentScore: input.baselineScore,
          finalScore: null,
          maxScore,
          selectedKeywords: input.selectedKeywords,
          userNote: input.userNote,
          suggestions: input.suggestions,
          activeId: nextPending(input.suggestions),
          createdAt: now(),
          updatedAt: now(),
        };
        pushTailoringSession(session);
        set({ session });
        return session;
      },

      setActive: (id) =>
        set((s) => (s.session ? { session: { ...s.session, activeId: id } } : s)),

      editSuggestion: (id, text) =>
        set((s) => {
          if (!s.session) return s;
          const suggestions = s.session.suggestions.map((sug) =>
            sug.id === id ? { ...sug, editedText: text } : sug
          );
          return { session: { ...s.session, suggestions, updatedAt: now() } };
        }),

      applySuggestion: (id) =>
        set((s) => {
          if (!s.session) return s;
          const suggestions = s.session.suggestions.map((sug) =>
            sug.id === id ? { ...sug, status: "applied" as SuggestionStatus } : sug
          );
          const session: TailoringSession = { ...s.session, suggestions, updatedAt: now() };
          session.currentScore = computeCurrent(session);
          session.activeId = nextPending(suggestions);
          pushTailoringSession(session);
          return { session };
        }),

      skipSuggestion: (id) =>
        set((s) => {
          if (!s.session) return s;
          const suggestions = s.session.suggestions.map((sug) =>
            sug.id === id ? { ...sug, status: "skipped" as SuggestionStatus } : sug
          );
          const session: TailoringSession = {
            ...s.session,
            suggestions,
            activeId: nextPending(suggestions),
            updatedAt: now(),
          };
          pushTailoringSession(session);
          return { session };
        }),

      applyAllPending: () =>
        set((s) => {
          if (!s.session) return s;
          const suggestions = s.session.suggestions.map((sug) =>
            sug.status === "pending"
              ? { ...sug, status: "applied" as SuggestionStatus }
              : sug
          );
          const session: TailoringSession = {
            ...s.session,
            suggestions,
            activeId: null,
            updatedAt: now(),
          };
          session.currentScore = computeCurrent(session);
          pushTailoringSession(session);
          return { session };
        }),

      finalize: () =>
        set((s) => {
          if (!s.session) return s;
          const session: TailoringSession = {
            ...s.session,
            status: "finalized",
            finalScore: s.session.currentScore,
            updatedAt: now(),
          };
          pushTailoringSession(session);
          return { session };
        }),

      reset: () => set({ session: null }),
    }),
    {
      name: "resume-co:tailoring-session",
      storage: createJSONStorage(() => safeLocalStorage),
      version: 0,
    }
  )
);
