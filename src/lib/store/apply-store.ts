"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { safeLocalStorage } from "./safe-storage";
import type { JobPosting } from "@/lib/jobs/job-search";

/**
 * Holds the "active apply" job context - the job the user clicked Apply now on.
 * Shared by the application-strengthening gateway (`/apply`) and the downstream
 * flows (tailor / cover letter / interview prep) so the selected job survives
 * navigation, popups, and reloads. Persisted to localStorage.
 */
interface ApplyState {
  job: JobPosting | null;
  setJob: (job: JobPosting) => void;
  clear: () => void;
}

export const useApplyStore = create<ApplyState>()(
  persist(
    (set) => ({
      job: null,
      setJob: (job) => set({ job }),
      clear: () => set({ job: null }),
    }),
    {
      name: "resume-co:apply",
      storage: createJSONStorage(() => safeLocalStorage),
    }
  )
);
