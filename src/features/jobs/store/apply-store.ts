"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { safeLocalStorage } from "@/utilities/safe-storage";
import type { JobPosting } from "@/features/jobs/lib/job-search";

/**
 * Holds the "active apply" job context - the job the user clicked Apply now on.
 * Shared by the application-strengthening gateway (`/apply`) and the downstream
 * flows (tailor / cover letter / interview prep) so the selected job survives
 * navigation, popups, and reloads. Persisted to localStorage.
 */
interface ApplyState {
  job: JobPosting | null;
  /** Id of the resume the job was matched against, so downstream flows (cover
   *  letter, interview prep) ground their output in the SAME resume. */
  resumeId: string | null;
  /** True when the user chose "Just practicing" in interview prep: the RESULTS
   *  render in the compact questions-only layout, even though generation still
   *  uses the real job + selected resume for grounding. */
  practice: boolean;
  setJob: (job: JobPosting) => void;
  setResumeId: (resumeId: string | null) => void;
  setPractice: (practice: boolean) => void;
  clear: () => void;
}

export const useApplyStore = create<ApplyState>()(
  persist(
    (set) => ({
      job: null,
      resumeId: null,
      practice: false,
      setJob: (job) => set({ job }),
      setResumeId: (resumeId) => set({ resumeId }),
      setPractice: (practice) => set({ practice }),
      clear: () => set({ job: null, resumeId: null, practice: false }),
    }),
    {
      name: "resume-co:apply",
      storage: createJSONStorage(() => safeLocalStorage),
    }
  )
);
