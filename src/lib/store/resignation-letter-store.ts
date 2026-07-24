"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { safeLocalStorage } from "./safe-storage";
import {
  reasonParagraph,
  gratitudeParagraph,
  assistanceParagraph,
} from "@/lib/resignation-letter/suggestions";
import { bodyToHtml } from "@/lib/resignation-letter/format";
import { composeLetterBody } from "@/lib/resignation-letter/compose";

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

export type RLFontId =
  | "garamond"
  | "georgia"
  | "ibm-plex-sans"
  | "ibm-plex-serif"
  | "inria-sans"
  | "inria-serif"
  | "inter"
  | "poppins"
  | "source-sans"
  | "ubuntu-mono"
  | "work-sans";
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
  /** True once the user manually edits the letter body; stops field-driven re-sync. */
  bodyTouched: boolean;
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
  /** Manual body edit (rich-text / body Improve-with-AI): freezes field re-sync. */
  setLetterBody: (html: string) => void;
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
  bodyTouched: false,
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

/** Labels shown beneath the top stepper (Step 2-8.png). */
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

/** The ordered wizard steps (linear - no branching for resignation letters). */
export function stepSequence(): RLStep[] {
  return RL_SEQUENCE;
}

/** Lenient email format check (reused contract from the cover-letter store). */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Lenient phone check: allows a leading "+", digits, spaces, dots, hyphens and
 * parentheses, and requires 7-15 digits overall (E.164 range) so common local
 * and international formats pass while letters / junk are rejected.
 */
export function isValidPhone(phone: string): boolean {
  const trimmed = phone.trim();
  if (!/^\+?[\d\s().-]+$/.test(trimmed)) return false;
  const digits = trimmed.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

/**
 * Header progress percent per builder step. Matching the reference, every
 * builder input step holds at 29% (the stepper segments carry the per-step
 * progress); the big jump comes when the letter is generated and the user
 * reaches the editor/Design stage (85%) and then Download-ready (100%).
 */
const RL_STEP_PERCENT: Record<string, number> = {
  heading: 29,
  recipient: 29,
  position: 29,
  reason: 29,
  gratitude: 29,
  assistance: 29,
  contacts: 29,
};

/** Progress label + percent for a step within the linear sequence. */
export function progressForStep(step: RLStep): { label: string; percent: number } {
  if (step === "generate" || step === "preview") {
    return { label: RL_STEP_LABEL[step], percent: 100 };
  }
  return { label: RL_STEP_LABEL[step], percent: RL_STEP_PERCENT[step] ?? 29 };
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
      // Optional step - only block on a malformed (non-empty) email or phone.
      return (
        (s.contacts.email.trim().length === 0 || isValidEmail(s.contacts.email)) &&
        (s.contacts.phone.trim().length === 0 || isValidPhone(s.contacts.phone))
      );
    // reason / gratitude / assistance are optional → always allowed.
    default:
      return true;
  }
}

/**
 * Re-derive the letter body from a structured-field change so an already
 * generated letter stays in sync with the fields. No-op while the body is empty
 * (the builder shows a live template) or once the user has manually edited the
 * body (`bodyTouched`) - their text is then preserved verbatim.
 */
function composeIfUntouched(
  s: ResignationLetterState,
  patch: Partial<ResignationLetterState>
): Partial<ResignationLetterState> {
  if (s.bodyTouched || !s.letter.body.trim()) return patch;
  const merged = { ...s, ...patch } as ResignationLetterState;
  return { ...patch, letter: { ...merged.letter, body: composeLetterBody(merged) } };
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

      setFullName: (value) => set((s) => composeIfUntouched(s, { fullName: value })),

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
          return composeIfUntouched(s, { employer, salutation, reasonText, gratitudeText });
        }),

      setSalutation: (value) =>
        set((s) => composeIfUntouched(s, { salutation: value, salutationTouched: true })),
      setPosition: (value) =>
        set((s) => {
          // The gratitude paragraph references the role being left.
          const gratitudeText =
            s.gratitude.length && !s.gratitudeTextTouched
              ? seedGratitudeHtml(s.gratitude, s.employer.companyName, value)
              : s.gratitudeText;
          return composeIfUntouched(s, { position: value, gratitudeText });
        }),
      setSubmissionDate: (value) => set({ submissionDate: value }),
      setLastWorkingDay: (value) => set((s) => composeIfUntouched(s, { lastWorkingDay: value })),

      setReason: (value) =>
        set((s) => {
          // Toggling the active chip off clears the seeded paragraph.
          if (s.reason === value) {
            return composeIfUntouched(
              s,
              s.reasonTextTouched
                ? { reason: null }
                : { reason: null, reasonText: "", reasonTextTouched: false }
            );
          }
          // Selecting a different reason (re)seeds the editable paragraph.
          return composeIfUntouched(s, {
            reason: value,
            reasonText: seedReasonHtml(value, s.otherReasonText, s.employer.companyName),
            reasonTextTouched: false,
          });
        }),

      setOtherReasonText: (value) =>
        set((s) => {
          const reasonText =
            s.reason === "Other Reason" && !s.reasonTextTouched
              ? seedReasonHtml(s.reason, value, s.employer.companyName)
              : s.reasonText;
          return composeIfUntouched(s, { otherReasonText: value, reasonText });
        }),

      setReasonText: (value) =>
        set((s) => composeIfUntouched(s, { reasonText: value, reasonTextTouched: true })),

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
          return composeIfUntouched(s, { gratitude, gratitudeText });
        }),

      setGratitudeText: (value) =>
        set((s) => composeIfUntouched(s, { gratitudeText: value, gratitudeTextTouched: true })),

      setAssistance: (value) =>
        set((s) => {
          if (s.assistanceTextTouched) return composeIfUntouched(s, { assistance: value });
          // Opting in seeds the help paragraph; skipping clears it.
          return composeIfUntouched(s, {
            assistance: value,
            assistanceText: value ? seedAssistanceHtml() : "",
          });
        }),

      setAssistanceText: (value) =>
        set((s) => composeIfUntouched(s, { assistanceText: value, assistanceTextTouched: true })),
      patchContacts: (patch) => set((s) => ({ contacts: { ...s.contacts, ...patch } })),
      setLetter: (patch) => set((s) => ({ letter: { ...s.letter, ...patch } })),
      // Manual body edit takes over: freeze field-driven re-sync from here on.
      setLetterBody: (html) => set((s) => ({ letter: { ...s.letter, body: html }, bodyTouched: true })),
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
      storage: createJSONStorage(() => safeLocalStorage),
    }
  )
);
