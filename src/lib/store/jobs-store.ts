"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { JobPosting } from "@/lib/jobs/job-search";

interface JobsState {
  /** Saved postings keyed by job id (full snapshot so the Saved tab survives
   *  role switches and regeneration). */
  saved: Record<string, JobPosting>;
  /** Ids the user dismissed (the X on a card) — hidden from Recommended. */
  dismissed: string[];
  /** Save or un-save a posting. */
  toggleSave: (job: JobPosting) => void;
  /** Hide a posting from the recommended list. */
  dismiss: (id: string) => void;
  /** Restore every dismissed posting. */
  clearDismissed: () => void;
  isSaved: (id: string) => boolean;
}

/**
 * Persisted store for the Jobs page: which postings the user saved and which
 * they dismissed. Kept in localStorage so the choices survive reloads.
 */
export const useJobsStore = create<JobsState>()(
  persist(
    (set, get) => ({
      saved: {},
      dismissed: [],
      toggleSave: (job) =>
        set((s) => {
          const next = { ...s.saved };
          if (next[job.id]) delete next[job.id];
          else next[job.id] = job;
          return { saved: next };
        }),
      dismiss: (id) =>
        set((s) =>
          s.dismissed.includes(id)
            ? {}
            : { dismissed: [...s.dismissed, id] }
        ),
      clearDismissed: () => set({ dismissed: [] }),
      isSaved: (id) => Boolean(get().saved[id]),
    }),
    {
      name: "resume-co:jobs",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
