"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { safeLocalStorage } from "./safe-storage";
import { pushServerDocument, deleteServerDocument } from "./documents-sync";
import type { JobPosting } from "@/lib/jobs/job-search";
import type { InterviewPrep, InterviewType } from "@/lib/interview/interview-prep";

/** Everything needed to re-open a saved prep sheet without regenerating it. */
export interface SavedInterviewPrepData {
  job: JobPosting;
  interviewType: InterviewType;
  /** The custom instruction for the "other" type, when applicable. */
  customDetail?: string;
  prep: InterviewPrep;
}

/** A saved interview-prep sheet as listed on the Saved page. */
export interface InterviewPrepRecord {
  id: string;
  title: string;
  updatedAt: number; // epoch ms
  templateId: string; // unused for prep; kept for the shared document shape
  data: SavedInterviewPrepData;
}

interface InterviewPrepDocumentsState {
  sheets: InterviewPrepRecord[];
  upsertSheet: (record: InterviewPrepRecord) => void;
  removeSheet: (id: string) => void;
  getSheet: (id: string) => InterviewPrepRecord | undefined;
}

/**
 * Saved interview-prep sheets, persisted to localStorage and mirrored to the
 * server (as `documents` of type "interviewPrep") so they follow the user across
 * devices. Mirrors the cover-letter / resignation-letter document stores.
 */
export const useInterviewPrepDocumentsStore =
  create<InterviewPrepDocumentsState>()(
    persist(
      (set, get) => ({
        sheets: [],
        upsertSheet: (record) => {
          // Mirror the write to the server (best-effort) before local state.
          pushServerDocument("interviewPrep", record);
          set((s) => {
            const i = s.sheets.findIndex((r) => r.id === record.id);
            if (i >= 0) {
              const next = [...s.sheets];
              next[i] = record;
              return { sheets: next };
            }
            return { sheets: [record, ...s.sheets] };
          });
        },
        removeSheet: (id) => {
          deleteServerDocument("interviewPrep", id);
          set((s) => ({ sheets: s.sheets.filter((r) => r.id !== id) }));
        },
        getSheet: (id) => get().sheets.find((r) => r.id === id),
      }),
      {
        name: "resume-co:interview-prep-documents",
        storage: createJSONStorage(() => safeLocalStorage),
      }
    )
  );

/* ------------------------------- helpers -------------------------------- */

const TYPE_LABEL: Record<InterviewType, string> = {
  screening: "Screening call",
  manager: "Meeting with a manager",
  technical: "Technical",
  other: "Custom prep",
};

/** Human-readable label for an interview type (used in titles + cards). */
export function interviewTypeLabel(type: InterviewType): string {
  return TYPE_LABEL[type];
}

/** Card title for a saved sheet, e.g. "Screening call - Acme". */
export function interviewPrepTitle(
  job: JobPosting,
  type: InterviewType
): string {
  const where = (job.company || job.title || "").trim();
  return where ? `${TYPE_LABEL[type]} - ${where}` : TYPE_LABEL[type];
}

// Small stable hash so a distinct "other" instruction gets its own sheet.
function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

/**
 * Deterministic id per (job, type) - regenerating the same type for the same job
 * updates the one sheet instead of creating duplicates. A different "other"
 * instruction gets its own sheet via a short hash.
 */
export function interviewPrepId(
  jobId: string,
  type: InterviewType,
  customDetail?: string
): string {
  const base = `ip_${jobId}_${type}`;
  return type === "other" && customDetail
    ? `${base}_${hash(customDetail)}`
    : base;
}
