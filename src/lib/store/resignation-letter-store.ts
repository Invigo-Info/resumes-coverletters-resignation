"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  reasonParagraph,
  gratitudeParagraph,
  assistanceParagraph,
} from "@/lib/resignation-letter/suggestions";
import { bodyToHtml } from "@/lib/resignation-letter/format";

/** Seed the editable reason paragraph (stored as HTML for the rich editor). */
function seedReasonHtml(reason: string | null, otherText: string, company: string): string {
  return bodyToHtml(reasonParagraph(reason, otherText, company));
}

/** Seed the editable gratitude paragraph (stored as HTML for the rich editor). */
function seedGratitudeHtml(selected: string[], company: string, position: string): string {
  return bodyToHtml(gratitudeParagraph(selected, company, position));
}

/** Seed the editable assistance paragraph (stored as HTML for the rich editor). */
function seedAssistanceHtml(): string {
  return bodyToHtml(assistanceParagraph());
}

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

/** Wizard screen keys (see docs/resignation-letter-onboarding-plan.md §5). */
export type RLStep =
  | "heading"
  | "recipient"
  | "position"
  | "reason"
  | "gratitude"
  | "assistance"
  | "contacts"
  | "generate"
  | "preview";

export type RLFontId = "georgia" | "inter" | "garamond";
export type RLFontSize = "S" | "M" | "L";
export type RLTheme = "light" | "dark";

export interface RLEmployer {
  managerName: string;
  companyName: string;
  companyAddress: string;
}

export interface RLContacts {
  email: string;
  phone: string;
  address: string;
}

export interface ResignationLetterState {
  /** Stable id for the saved draft (assigned on first content / reset). */
  id: string;
  fullName: string;
  employer: RLEmployer;
  /** Auto-derived from employer.managerName unless the user edits it. */
  salutation: string;
  salutationTouched: boolean;
  position: string;
  submissionDate: string; // ISO yyyy-mm-dd
  lastWorkingDay: string; // ISO yyyy-mm-dd
  reason: string | null; // single-select
  otherReasonText: string;
  /** Editable reason paragraph (HTML), seeded from the selected reason chip. */
  reasonText: string;
  /** True once the user manually edits the reason paragraph. */
  reasonTextTouched: boolean;
  gratitude: string[]; // multi-select, max 3
  /** Editable gratitude paragraph (HTML), seeded from the selected chips. */
  gratitudeText: string;
  /** True once the user manually edits the gratitude paragraph. */
  gratitudeTextTouched: boolean;
  assistance: boolean | null;
  /** Editable assistance paragraph (HTML), seeded when the user opts in. */
  assistanceText: string;
  /** True once the user manually edits the assistance paragraph. */
  assistanceTextTouched: boolean;
  contacts: RLContacts;

  letter: { body: string };
  design: { font: RLFontId; accent: string; fontSize: RLFontSize; theme: RLTheme; bg: string };

  /** wizard control */
  step: RLStep;
  mode: "onboarding" | "edit";

  /* setters */
  setStep: (step: RLStep) => void;
  setMode: (mode: "onboarding" | "edit") => void;
  setFullName: (value: string) => void;
  patchEmployer: (patch: Partial<RLEmployer>) => void;
  setSalutation: (value: string) => void;
  setPosition: (value: string) => void;
  setSubmissionDate: (value: string) => void;
  setLastWorkingDay: (value: string) => void;
  setReason: (value: string | null) => void;
  setOtherReasonText: (value: string) => void;
  setReasonText: (value: string) => void;
  toggleGratitude: (value: string) => void;
  setGratitudeText: (value: string) => void;
  setAssistance: (value: boolean) => void;
  setAssistanceText: (value: string) => void;
  patchContacts: (patch: Partial<RLContacts>) => void;
  setLetter: (patch: Partial<{ body: string }>) => void;
  setDesign: (patch: Partial<{ font: RLFontId; accent: string; fontSize: RLFontSize; theme: RLTheme; bg: string }>) => void;

  goNext: () => void;
  goBack: () => void;
  hydrate: (data: Partial<ResignationLetterState>) => void;
  loadDocument: (id: string, data: Partial<ResignationLetterState>) => void;
  reset: () => void;
}

/** Generate a unique resignation-letter draft id. */
export const newResignationLetterId = () =>
  `rl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/* ------------------------------------------------------------------ */
/* Defaults                                                           */
/* ------------------------------------------------------------------ */

const MAX_GRATITUDE = 3;

const initial = {
  id: "",
  fullName: "",
  employer: { managerName: "", companyName: "", companyAddress: "" },
  salutation: "",
  salutationTouched: false,
  position: "",
  submissionDate: "",
  lastWorkingDay: "",
  reason: null as string | null,
  otherReasonText: "",
  reasonText: "",
  reasonTextTouched: false,
  gratitude: [] as string[],
  gratitudeText: "",
  gratitudeTextTouched: false,
  assistance: null as boolean | null,
  assistanceText: "",
  assistanceTextTouched: false,
  contacts: { email: "", phone: "", address: "" },
  letter: { body: "" },
  design: { font: "georgia" as RLFontId, accent: "#111827", fontSize: "M" as RLFontSize, theme: "light" as RLTheme, bg: "" },
  step: "heading" as RLStep,
  mode: "onboarding" as const,
};

/* ------------------------------------------------------------------ */
/* Linear step sequence + stepper / progress metadata                 */
/* ------------------------------------------------------------------ */

/** The 7 builder steps, in order, then generate. */
export const RL_SEQUENCE: RLStep[] = [
  "heading",
  "recipient",
  "position",
  "reason",
  "gratitude",
  "assistance",
  "contacts",
  "generate",
];

/** Labels shown beneath the top stepper (Step 2–8.png). */
export const RL_STEP_LABEL: Record<RLStep, string> = {
  heading: "Heading",
  recipient: "Recipient",
  position: "Position & Dates",
  reason: "Reason",
  gratitude: "Gratitude",
  assistance: "Assistance",
  contacts: "Contacts",
  generate: "Generating",
  preview: "Ready",
};

/** The seven labeled segments rendered in the stepper. */
export const RL_STEPPER_STEPS: RLStep[] = [
  "heading",
  "recipient",
  "position",
  "reason",
  "gratitude",
  "assistance",
  "contacts",
];

/** The ordered wizard steps (linear — no branching for resignation letters). */
export function stepSequence(): RLStep[] {
  return RL_SEQUENCE;
}

/** Lenient email format check (reused contract from the cover-letter store). */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Progress label + percent for a step within the linear sequence. */
export function progressForStep(step: RLStep): { label: string; percent: number } {
  if (step === "generate" || step === "preview") {
    return { label: RL_STEP_LABEL[step], percent: 100 };
  }
  const idx = RL_STEPPER_STEPS.indexOf(step);
  const total = RL_STEPPER_STEPS.length;
  const percent = idx < 0 ? 10 : Math.max(8, Math.round(((idx + 1) / total) * 100));
  return { label: RL_STEP_LABEL[step], percent };
}

/** Whether the Next/Save button should be enabled for a step. */
export function canProceed(step: RLStep, s: ResignationLetterState): boolean {
  switch (step) {
    case "heading":
      return s.fullName.trim().length > 0;
    case "recipient":
      return s.employer.managerName.trim().length > 0 && s.employer.companyName.trim().length > 0;
    case "position":
      return (
        s.position.trim().length > 0 &&
        s.submissionDate.length > 0 &&
        s.lastWorkingDay.length > 0 &&
        s.lastWorkingDay >= s.submissionDate
      );
    case "contacts":
      // Optional step — only block on a malformed (non-empty) email.
      return s.contacts.email.trim().length === 0 || isValidEmail(s.contacts.email);
    // reason / gratitude / assistance are optional → always allowed.
    default:
      return true;
  }
}

/* ------------------------------------------------------------------ */
/* Store                                                              */
/* ------------------------------------------------------------------ */

/**
 * Source of truth for the resignation-letter wizard. Persisted to localStorage
 * (`resume-co:resignation-letter`). Setters keep the seeded reason/gratitude/
 * assistance paragraphs in sync with answers until the user edits them by hand.
 */
export const useResignationLetterStore = create<ResignationLetterState>()(
  persist(
    (set, get) => ({
      ...initial,

      setStep: (step) => set({ step }),
      setMode: (mode) => set({ mode }),

      setFullName: (value) => set({ fullName: value }),

      patchEmployer: (patch) =>
        set((s) => {
          const employer = { ...s.employer, ...patch };
          // Auto-fill the salutation from the manager name until the user edits it.
          const salutation =
            !s.salutationTouched && patch.managerName !== undefined
              ? patch.managerName.trim()
                ? `Dear ${patch.managerName.trim()},`
                : ""
              : s.salutation;
          // Keep the seeded reason/gratitude paragraphs in sync with the company
          // name until the user edits them manually.
          const reasonText =
            patch.companyName !== undefined && s.reason && !s.reasonTextTouched
              ? seedReasonHtml(s.reason, s.otherReasonText, employer.companyName)
              : s.reasonText;
          const gratitudeText =
            patch.companyName !== undefined && s.gratitude.length && !s.gratitudeTextTouched
              ? seedGratitudeHtml(s.gratitude, employer.companyName, s.position)
              : s.gratitudeText;
          return { employer, salutation, reasonText, gratitudeText };
        }),

      setSalutation: (value) => set({ salutation: value, salutationTouched: true }),
      setPosition: (value) =>
        set((s) => {
          // The gratitude paragraph references the role being left.
          const gratitudeText =
            s.gratitude.length && !s.gratitudeTextTouched
              ? seedGratitudeHtml(s.gratitude, s.employer.companyName, value)
              : s.gratitudeText;
          return { position: value, gratitudeText };
        }),
      setSubmissionDate: (value) => set({ submissionDate: value }),
      setLastWorkingDay: (value) => set({ lastWorkingDay: value }),

      setReason: (value) =>
        set((s) => {
          // Toggling the active chip off clears the seeded paragraph.
          if (s.reason === value) {
            return s.reasonTextTouched
              ? { reason: null }
              : { reason: null, reasonText: "", reasonTextTouched: false };
          }
          // Selecting a different reason (re)seeds the editable paragraph.
          return {
            reason: value,
            reasonText: seedReasonHtml(value, s.otherReasonText, s.employer.companyName),
            reasonTextTouched: false,
          };
        }),

      setOtherReasonText: (value) =>
        set((s) => {
          const reasonText =
            s.reason === "Other Reason" && !s.reasonTextTouched
              ? seedReasonHtml(s.reason, value, s.employer.companyName)
              : s.reasonText;
          return { otherReasonText: value, reasonText };
        }),

      setReasonText: (value) => set({ reasonText: value, reasonTextTouched: true }),

      toggleGratitude: (value) =>
        set((s) => {
          const has = s.gratitude.includes(value);
          let gratitude: string[];
          if (has) {
            gratitude = s.gratitude.filter((x) => x !== value);
          } else {
            if (s.gratitude.length >= MAX_GRATITUDE) return s;
            gratitude = [...s.gratitude, value];
          }
          // Reseed the editable paragraph from the new selection until the user
          // edits it manually.
          const gratitudeText = s.gratitudeTextTouched
            ? s.gratitudeText
            : seedGratitudeHtml(gratitude, s.employer.companyName, s.position);
          return { gratitude, gratitudeText };
        }),

      setGratitudeText: (value) => set({ gratitudeText: value, gratitudeTextTouched: true }),

      setAssistance: (value) =>
        set((s) => {
          if (s.assistanceTextTouched) return { assistance: value };
          // Opting in seeds the help paragraph; skipping clears it.
          return {
            assistance: value,
            assistanceText: value ? seedAssistanceHtml() : "",
          };
        }),

      setAssistanceText: (value) => set({ assistanceText: value, assistanceTextTouched: true }),
      patchContacts: (patch) => set((s) => ({ contacts: { ...s.contacts, ...patch } })),
      setLetter: (patch) => set((s) => ({ letter: { ...s.letter, ...patch } })),
      setDesign: (patch) => set((s) => ({ design: { ...s.design, ...patch } })),

      goNext: () => {
        const seq = stepSequence();
        const idx = seq.indexOf(get().step);
        if (idx >= 0 && idx < seq.length - 1) set({ step: seq[idx + 1] });
      },
      goBack: () => {
        const seq = stepSequence();
        const idx = seq.indexOf(get().step);
        if (idx > 0) set({ step: seq[idx - 1] });
      },

      hydrate: (data) => set((s) => ({ ...s, ...data })),
      loadDocument: (id, data) => set((s) => ({ ...s, ...data, id })),
      reset: () => set({ ...initial, id: newResignationLetterId() }),
    }),
    {
      name: "resume-co:resignation-letter",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
