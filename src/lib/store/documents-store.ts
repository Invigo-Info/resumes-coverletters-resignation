"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  useResumeStore,
  newResumeId,
  type ResumeState,
} from "./resume-store";
import { pushServerDocument, deleteServerDocument } from "./documents-sync";

/** The resume fields persisted in a saved draft (no transient UI state). */
export type ResumeDocData = Pick<
  ResumeState,
  | "templateId"
  | "personal"
  | "contact"
  | "summary"
  | "employment"
  | "skills"
  | "skillsTitle"
  | "education"
  | "additional"
  | "design"
  | "sectionOrder"
>;

export interface ResumeRecord {
  id: string;
  title: string;
  updatedAt: number; // epoch ms
  templateId: string;
  data: ResumeDocData;
}

interface DocumentsState {
  resumes: ResumeRecord[];
  upsertResume: (record: ResumeRecord) => void;
  removeResume: (id: string) => void;
  getResume: (id: string) => ResumeRecord | undefined;
}

export const useDocumentsStore = create<DocumentsState>()(
  persist(
    (set, get) => ({
      resumes: [],
      upsertResume: (record) => {
        pushServerDocument("resumes", record);
        set((s) => {
          const i = s.resumes.findIndex((r) => r.id === record.id);
          if (i >= 0) {
            const next = [...s.resumes];
            next[i] = record;
            return { resumes: next };
          }
          return { resumes: [record, ...s.resumes] };
        });
      },
      removeResume: (id) => {
        deleteServerDocument("resumes", id);
        set((s) => ({ resumes: s.resumes.filter((r) => r.id !== id) }));
      },
      getResume: (id) => get().resumes.find((r) => r.id === id),
    }),
    {
      name: "resume-co:documents",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

/* ------------------------------------------------------------------ */
/* Save status (for the "Saving… / Saved" pill on the preview)        */
/* ------------------------------------------------------------------ */

export type SaveStatus = "saving" | "saved";

interface SaveStatusState {
  status: SaveStatus;
  setStatus: (status: SaveStatus) => void;
}

export const useSaveStatusStore = create<SaveStatusState>((set) => ({
  status: "saved",
  setStatus: (status) => set({ status }),
}));

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, "").trim();

/** A signature of the resume's CONTENT only — excludes transient UI cursor
 *  state (active section/entry/block) so moving the caret isn't seen as an edit. */
function contentSignature(s: ResumeState): string {
  return JSON.stringify({
    templateId: s.templateId,
    personal: s.personal,
    contact: s.contact,
    summary: s.summary,
    employment: s.employment,
    skills: s.skills,
    skillsTitle: s.skillsTitle,
    education: s.education,
    additional: s.additional,
    design: s.design,
    sectionOrder: s.sectionOrder,
  });
}

/** Human title for a draft: "First Last, Job title" (falls back gracefully). */
export function resumeTitle(s: ResumeState): string {
  const name = [s.personal.firstName, s.personal.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const parts = [name, s.personal.jobTitle.trim()].filter(Boolean);
  return parts.join(", ") || "Untitled resume";
}

/** Has the user entered anything worth saving as a draft? */
function hasContent(s: ResumeState): boolean {
  return Boolean(
    s.personal.firstName.trim() ||
      s.personal.lastName.trim() ||
      s.personal.jobTitle.trim() ||
      s.contact.email.trim() ||
      stripHtml(s.summary) ||
      s.employment.some((e) => e.jobTitle.trim() || e.company.trim()) ||
      s.education.some((e) => e.institution.trim()) ||
      s.skills.some((sk) => sk.name.trim())
  );
}

function snapshot(s: ResumeState): ResumeRecord {
  return {
    id: s.id,
    title: resumeTitle(s),
    updatedAt: Date.now(),
    templateId: s.templateId,
    data: {
      templateId: s.templateId,
      personal: s.personal,
      contact: s.contact,
      summary: s.summary,
      employment: s.employment,
      skills: s.skills,
      skillsTitle: s.skillsTitle,
      education: s.education,
      additional: s.additional,
      design: s.design,
      sectionOrder: s.sectionOrder,
    },
  };
}

/**
 * Snapshot the active resume into the dashboard's drafts list if it has real
 * content (assigning an id the first time). Safe to call any number of times —
 * it upserts by id. Returns the record id, or null when there's nothing to save.
 *
 * Used by both the editor autosave and the dashboard (to backfill a draft that
 * was created/edited before it ever reached the documents list).
 */
export function saveActiveResume(): string | null {
  const s = useResumeStore.getState();
  if (!hasContent(s)) return null;
  let id = s.id;
  if (!id) {
    id = newResumeId();
    useResumeStore.setState({ id });
  }
  useDocumentsStore.getState().upsertResume({ ...snapshot(useResumeStore.getState()), id });
  return id;
}

/**
 * Auto-save the active resume into the dashboard's drafts list. Mount once in
 * the editor; it debounces store changes and upserts the matching record.
 */
export function useResumeAutosave() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastSig = contentSignature(useResumeStore.getState());

    const save = () => {
      saveActiveResume();
      useSaveStatusStore.getState().setStatus("saved");
    };

    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(save, 700);
    };

    saveActiveResume(); // capture the current state on mount (no "saving" flash)

    const unsub = useResumeStore.subscribe((state) => {
      const sig = contentSignature(state);
      if (sig === lastSig) return; // caret / section change, not a content edit
      lastSig = sig;
      useSaveStatusStore.getState().setStatus("saving");
      schedule();
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsub();
    };
  }, []);
}
