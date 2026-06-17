"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  useResignationLetterStore,
  newResignationLetterId,
  type ResignationLetterState,
} from "./resignation-letter-store";

/** The resignation-letter fields persisted in a saved draft (no UI state). */
export type ResignationLetterDocData = Pick<
  ResignationLetterState,
  | "fullName"
  | "employer"
  | "salutation"
  | "salutationTouched"
  | "position"
  | "submissionDate"
  | "lastWorkingDay"
  | "reason"
  | "otherReasonText"
  | "reasonText"
  | "reasonTextTouched"
  | "gratitude"
  | "gratitudeText"
  | "gratitudeTextTouched"
  | "assistance"
  | "assistanceText"
  | "assistanceTextTouched"
  | "contacts"
  | "letter"
  | "design"
>;

export interface ResignationLetterRecord {
  id: string;
  title: string;
  updatedAt: number; // epoch ms
  data: ResignationLetterDocData;
}

interface ResignationLetterDocumentsState {
  letters: ResignationLetterRecord[];
  upsertLetter: (record: ResignationLetterRecord) => void;
  removeLetter: (id: string) => void;
  getLetter: (id: string) => ResignationLetterRecord | undefined;
}

export const useResignationLetterDocumentsStore =
  create<ResignationLetterDocumentsState>()(
    persist(
      (set, get) => ({
        letters: [],
        upsertLetter: (record) =>
          set((s) => {
            const i = s.letters.findIndex((r) => r.id === record.id);
            if (i >= 0) {
              const next = [...s.letters];
              next[i] = record;
              return { letters: next };
            }
            return { letters: [record, ...s.letters] };
          }),
        removeLetter: (id) =>
          set((s) => ({ letters: s.letters.filter((r) => r.id !== id) })),
        getLetter: (id) => get().letters.find((r) => r.id === id),
      }),
      {
        name: "resume-co:resignation-letter-documents",
        storage: createJSONStorage(() => localStorage),
      }
    )
  );

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, "").trim();

/** Human title for a draft: "Full name at Company" (falls back gracefully). */
export function resignationLetterTitle(s: ResignationLetterState): string {
  const name = s.fullName.trim();
  const company = s.employer.companyName.trim();
  if (name && company) return `${name} at ${company}`;
  if (name) return name;
  if (company) return `Resignation letter, ${company}`;
  return "Untitled resignation letter";
}

/**
 * Has the user entered anything worth saving as a draft? The builder prefills a
 * placeholder name/email/dates, so those don't count — we only save once the
 * user supplies recipient, role, reason, gratitude or a generated body.
 */
function hasContent(s: ResignationLetterState): boolean {
  return Boolean(
    s.employer.managerName.trim() ||
      s.employer.companyName.trim() ||
      s.position.trim() ||
      s.reason ||
      s.gratitude.length ||
      stripHtml(s.reasonText) ||
      stripHtml(s.gratitudeText) ||
      stripHtml(s.letter.body)
  );
}

function snapshot(s: ResignationLetterState): ResignationLetterRecord {
  return {
    id: s.id,
    title: resignationLetterTitle(s),
    updatedAt: Date.now(),
    data: {
      fullName: s.fullName,
      employer: s.employer,
      salutation: s.salutation,
      salutationTouched: s.salutationTouched,
      position: s.position,
      submissionDate: s.submissionDate,
      lastWorkingDay: s.lastWorkingDay,
      reason: s.reason,
      otherReasonText: s.otherReasonText,
      reasonText: s.reasonText,
      reasonTextTouched: s.reasonTextTouched,
      gratitude: s.gratitude,
      gratitudeText: s.gratitudeText,
      gratitudeTextTouched: s.gratitudeTextTouched,
      assistance: s.assistance,
      assistanceText: s.assistanceText,
      assistanceTextTouched: s.assistanceTextTouched,
      contacts: s.contacts,
      letter: s.letter,
      design: s.design,
    },
  };
}

/**
 * Snapshot the active resignation letter into the dashboard's drafts list if it
 * has real content (assigning an id the first time). Safe to call repeatedly —
 * upserts by id. Returns the record id, or null when there's nothing to save.
 */
export function saveActiveResignationLetter(): string | null {
  const s = useResignationLetterStore.getState();
  if (!hasContent(s)) return null;
  let id = s.id;
  if (!id) {
    id = newResignationLetterId();
    useResignationLetterStore.setState({ id });
  }
  useResignationLetterDocumentsStore
    .getState()
    .upsertLetter({ ...snapshot(useResignationLetterStore.getState()), id });
  return id;
}

/**
 * Auto-save the active resignation letter into the dashboard's drafts list.
 * Mount once in the builder/preview; it debounces store changes and upserts.
 */
export function useResignationLetterAutosave() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const save = () => saveActiveResignationLetter();

    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(save, 700);
    };

    const unsub = useResignationLetterStore.subscribe(schedule);
    schedule(); // capture the current state on mount too
    return () => {
      if (timer) clearTimeout(timer);
      unsub();
    };
  }, []);
}
