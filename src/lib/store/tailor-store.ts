"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { safeLocalStorage } from "./safe-storage";

/**
 * Holds the "tailoring" context handed from the Improve-keywords flow on /jobs to
 * the /tailoring results page: the target job title, the keywords the user chose
 * to highlight, an optional note steering the AI, and the base keyword-match score
 * the tailoring starts from. Persisted to localStorage so the page survives the
 * navigation and a reload.
 */
interface TailorState {
  jobTitle: string;
  company: string;
  keywords: string[];
  note: string;
  baseScore: number;
  /** Id of the resume being tailored, so the editor loads the right draft. */
  resumeId: string;
  setTailor: (t: {
    jobTitle: string;
    company: string;
    keywords: string[];
    note: string;
    baseScore: number;
    resumeId: string;
  }) => void;
  clear: () => void;
}

export const useTailorStore = create<TailorState>()(
  persist(
    (set) => ({
      jobTitle: "",
      company: "",
      keywords: [],
      note: "",
      baseScore: 0,
      resumeId: "",
      setTailor: (t) => set(t),
      clear: () =>
        set({
          jobTitle: "",
          company: "",
          keywords: [],
          note: "",
          baseScore: 0,
          resumeId: "",
        }),
    }),
    {
      name: "resume-co:tailor",
      storage: createJSONStorage(() => safeLocalStorage),
    }
  )
);
