"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  type JobPosting,
  type JobFilters,
  defaultFilters,
} from "@/lib/jobs/job-search";
import { pushSavedJob, deleteSavedJob } from "./jobs-sync";

/** A saved job pending removal, shown as a grey "Undo" card in the Saved tab. */
export interface PendingRemoval {
  jobId: string;
  job: JobPosting;
  removedAt: number; // epoch ms - drives the expiry timer
}

interface JobsState {
  /** Saved postings keyed by job id (full snapshot so the Saved tab survives
   *  role switches and regeneration). */
  saved: Record<string, JobPosting>;
  /** Ids the user dismissed (the X / Not interested) - hidden from Recommended. */
  dismissed: string[];
  /** Why each dismissed job was hidden (for future recommendation tuning). */
  dismissedReasons: Record<string, string>;
  /** Filters currently applied to the Recommended list. */
  filters: JobFilters;
  /** Saved jobs just removed in the Saved tab, awaiting Undo/expiry (transient). */
  pendingRemovals: PendingRemoval[];

  /** Save or un-save a posting (used on cards + detail in Recommended). */
  toggleSave: (job: JobPosting) => void;
  /** Hide a posting from the recommended list, with an optional reason. */
  dismiss: (id: string, reason?: string) => void;
  /** Restore every dismissed posting. */
  clearDismissed: () => void;
  isSaved: (id: string) => boolean;

  /** Replace the active filter set. */
  setFilters: (filters: JobFilters) => void;
  /** Reset filters to the product default for a role (keeps the role title). */
  resetFilters: (role: string) => void;

  /** Remove a saved job in the Saved tab -> moves it to pendingRemovals (undoable). */
  removeSaved: (id: string) => void;
  /** Undo a pending removal -> moves the job back into saved. */
  restoreSaved: (id: string) => void;
  /** Finalize a pending removal after its undo window expires. */
  expirePending: (id: string) => void;
}

/**
 * Persisted store for the Jobs page: saved postings, dismissed (Not interested)
 * postings + reasons, the active filter set, and the transient undo stack.
 * Persisted to localStorage; the undo stack is intentionally NOT persisted.
 */
export const useJobsStore = create<JobsState>()(
  persist(
    (set, get) => ({
      saved: {},
      dismissed: [],
      dismissedReasons: {},
      filters: defaultFilters(""),
      pendingRemovals: [],

      toggleSave: (job) =>
        set((s) => {
          const next = { ...s.saved };
          if (next[job.id]) {
            delete next[job.id];
            deleteSavedJob(job.id);
          } else {
            next[job.id] = job;
            pushSavedJob(job);
          }
          return { saved: next };
        }),

      dismiss: (id, reason) =>
        set((s) =>
          s.dismissed.includes(id)
            ? {}
            : {
                dismissed: [...s.dismissed, id],
                dismissedReasons: reason
                  ? { ...s.dismissedReasons, [id]: reason }
                  : s.dismissedReasons,
              }
        ),

      clearDismissed: () => set({ dismissed: [], dismissedReasons: {} }),
      isSaved: (id) => Boolean(get().saved[id]),

      setFilters: (filters) => set({ filters }),
      resetFilters: (role) => set({ filters: defaultFilters(role) }),

      removeSaved: (id) =>
        set((s) => {
          const job = s.saved[id];
          if (!job) return {};
          const next = { ...s.saved };
          delete next[id];
          deleteSavedJob(id);
          return {
            saved: next,
            pendingRemovals: [
              { jobId: id, job, removedAt: Date.now() },
              ...s.pendingRemovals,
            ],
          };
        }),

      restoreSaved: (id) =>
        set((s) => {
          const pending = s.pendingRemovals.find((p) => p.jobId === id);
          if (!pending) return {};
          pushSavedJob(pending.job);
          return {
            saved: { ...s.saved, [id]: pending.job },
            pendingRemovals: s.pendingRemovals.filter((p) => p.jobId !== id),
          };
        }),

      expirePending: (id) =>
        set((s) => ({
          pendingRemovals: s.pendingRemovals.filter((p) => p.jobId !== id),
        })),
    }),
    {
      name: "resume-co:jobs",
      storage: createJSONStorage(() => localStorage),
      // Don't persist the transient undo stack - a reload should start clean.
      partialize: ({ pendingRemovals: _pending, ...rest }) => rest,
    }
  )
);
