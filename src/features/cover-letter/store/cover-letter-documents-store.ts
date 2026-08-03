"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { safeLocalStorage } from "@/utilities/safe-storage";
import {
  useCoverLetterStore,
  newCoverLetterId,
  type CoverLetterState,
} from "./cover-letter-store";
import { pushServerDocument, deleteServerDocument } from "@/features/resume-builder/store/documents-sync";

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

/** A saved cover-letter draft as listed on the dashboard. */
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

/**
 * The dashboard's list of saved cover-letter drafts, persisted to localStorage
 * and mirrored to the server so drafts follow the user across devices.
 */
export const useCoverLetterDocumentsStore = create<CoverLetterDocumentsState>()(
  persist(
    (set, get) => ({
      letters: [],
      upsertLetter: (record) => {
        // Mirror the write to the server (best-effort) before updating local state.
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
      storage: createJSONStorage(() => safeLocalStorage),
    }
  )
);

/* ------------------------------------------------------------------ */
/* Save status (drives the "Saving… / Saved" indicator)               */
/* ------------------------------------------------------------------ */

export type CoverLetterSaveStatus = "idle" | "saving" | "saved";

/** Live autosave status so the editor can show real "Saving… / Saved" feedback. */
export const useCoverLetterSaveStatus = create<{
  status: CoverLetterSaveStatus;
  setStatus: (status: CoverLetterSaveStatus) => void;
}>((set) => ({
  status: "idle",
  setStatus: (status) => set({ status }),
}));

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

// Strip HTML tags to test whether the letter body has real text.
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

/**
 * Is there a real cover letter worth listing on the dashboard? Only an actual
 * generated/edited letter body counts - filling personal details or a job title
 * (e.g. while reviewing an imported resume) must NOT create a phantom draft card.
 * In-progress wizard state is resumed separately via "Continue your draft".
 */
function hasContent(s: CoverLetterState): boolean {
  return Boolean(stripHtml(s.letter.body));
}

/** Build a savable draft record from the live cover-letter state. */
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
 * real content (assigning an id the first time). Safe to call repeatedly - it
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
 * in the builder/preview; it debounces store changes, upserts the record, and
 * publishes a live "saving -> saved" status for the editor's Saved indicator.
 */
export function useCoverLetterAutosave() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let mounted = true;
    const { setStatus } = useCoverLetterSaveStatus.getState();

    const save = () => {
      const id = saveActiveCoverLetter();
      if (mounted) setStatus(id ? "saved" : "idle");
    };

    const schedule = (initial: boolean) => {
      if (timer) clearTimeout(timer);
      // An edit is now in flight: show "Saving…" (but not for the mount capture,
      // which just re-persists already-saved state).
      if (!initial && hasContent(useCoverLetterStore.getState())) {
        setStatus("saving");
      }
      timer = setTimeout(save, 700);
    };

    const unsub = useCoverLetterStore.subscribe(() => schedule(false));
    schedule(true); // capture the current state on mount too
    return () => {
      mounted = false;
      if (timer) clearTimeout(timer);
      unsub();
    };
  }, []);
}
