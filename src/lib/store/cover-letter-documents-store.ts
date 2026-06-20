"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  useCoverLetterStore,
  newCoverLetterId,
  type CoverLetterState,
} from "./cover-letter-store";
import { pushServerDocument, deleteServerDocument } from "./documents-sync";

/** The cover-letter fields persisted in a saved draft (no transient UI state). */
export type CoverLetterDocData = Pick<
  CoverLetterState,
  | "flow"
  | "sourceResumeId"
  | "uploadedFileName"
  | "jobIntent"
  | "jobDetails"
  | "skills"
  | "experience"
  | "recentJob"
  | "education"
  | "strengths"
  | "personal"
  | "letter"
  | "design"
>;

export interface CoverLetterRecord {
  id: string;
  title: string;
  updatedAt: number; // epoch ms
  templateId: string;
  data: CoverLetterDocData;
}

interface CoverLetterDocumentsState {
  letters: CoverLetterRecord[];
  upsertLetter: (record: CoverLetterRecord) => void;
  removeLetter: (id: string) => void;
  getLetter: (id: string) => CoverLetterRecord | undefined;
}

export const useCoverLetterDocumentsStore = create<CoverLetterDocumentsState>()(
  persist(
    (set, get) => ({
      letters: [],
      upsertLetter: (record) => {
        pushServerDocument("coverLetters", record);
        set((s) => {
          const i = s.letters.findIndex((r) => r.id === record.id);
          if (i >= 0) {
            const next = [...s.letters];
            next[i] = record;
            return { letters: next };
          }
          return { letters: [record, ...s.letters] };
        });
      },
      removeLetter: (id) => {
        deleteServerDocument("coverLetters", id);
        set((s) => ({ letters: s.letters.filter((r) => r.id !== id) }));
      },
      getLetter: (id) => get().letters.find((r) => r.id === id),
    }),
    {
      name: "resume-co:cover-letter-documents",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, "").trim();

/** Human title for a draft: "First Last, Desired title" (falls back gracefully). */
export function coverLetterTitle(s: CoverLetterState): string {
  const name = [s.personal.firstName, s.personal.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const role = s.jobDetails.desiredJobTitle.trim();
  const parts = [name, role].filter(Boolean);
  if (parts.length) return parts.join(", ");
  const company = s.jobDetails.companyName.trim();
  return company ? `Cover letter for ${company}` : "Untitled cover letter";
}

/** Has the user entered anything worth saving as a draft? */
function hasContent(s: CoverLetterState): boolean {
  return Boolean(
    s.personal.firstName.trim() ||
      s.personal.lastName.trim() ||
      s.jobDetails.desiredJobTitle.trim() ||
      s.jobDetails.companyName.trim() ||
      stripHtml(s.letter.body)
  );
}

function snapshot(s: CoverLetterState): CoverLetterRecord {
  return {
    id: s.id,
    title: coverLetterTitle(s),
    updatedAt: Date.now(),
    templateId: s.design.template,
    data: {
      flow: s.flow,
      sourceResumeId: s.sourceResumeId,
      uploadedFileName: s.uploadedFileName,
      jobIntent: s.jobIntent,
      jobDetails: s.jobDetails,
      skills: s.skills,
      experience: s.experience,
      recentJob: s.recentJob,
      education: s.education,
      strengths: s.strengths,
      personal: s.personal,
      letter: s.letter,
      design: s.design,
    },
  };
}

/**
 * Snapshot the active cover letter into the dashboard's drafts list if it has
 * real content (assigning an id the first time). Safe to call repeatedly — it
 * upserts by id. Returns the record id, or null when there's nothing to save.
 */
export function saveActiveCoverLetter(): string | null {
  const s = useCoverLetterStore.getState();
  if (!hasContent(s)) return null;
  let id = s.id;
  if (!id) {
    id = newCoverLetterId();
    useCoverLetterStore.setState({ id });
  }
  useCoverLetterDocumentsStore
    .getState()
    .upsertLetter({ ...snapshot(useCoverLetterStore.getState()), id });
  return id;
}

/**
 * Auto-save the active cover letter into the dashboard's drafts list. Mount once
 * in the builder/preview; it debounces store changes and upserts the record.
 */
export function useCoverLetterAutosave() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const save = () => saveActiveCoverLetter();

    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(save, 700);
    };

    const unsub = useCoverLetterStore.subscribe(schedule);
    schedule(); // capture the current state on mount too
    return () => {
      if (timer) clearTimeout(timer);
      unsub();
    };
  }, []);
}
