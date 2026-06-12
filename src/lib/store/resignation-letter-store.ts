"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

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
  gratitude: string[]; // multi-select, max 3
  assistance: boolean | null;
  contacts: RLContacts;

  letter: { body: string };
  design: { font: RLFontId; accent: string; fontSize: RLFontSize; theme: RLTheme };

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
  toggleGratitude: (value: string) => void;
  setAssistance: (value: boolean) => void;
  patchContacts: (patch: Partial<RLContacts>) => void;
  setLetter: (patch: Partial<{ body: string }>) => void;
  setDesign: (patch: Partial<{ font: RLFontId; accent: string; fontSize: RLFontSize; theme: RLTheme }>) => void;

  goNext: () => void;
  goBack: () => void;
  hydrate: (data: Partial<ResignationLetterState>) => void;
  reset: () => void;
}

/* ------------------------------------------------------------------ */
/* Defaults                                                           */
/* ------------------------------------------------------------------ */

const MAX_GRATITUDE = 3;

const initial = {
  fullName: "",
  employer: { managerName: "", companyName: "", companyAddress: "" },
  salutation: "",
  salutationTouched: false,
  position: "",
  submissionDate: "",
  lastWorkingDay: "",
  reason: null as string | null,
  otherReasonText: "",
  gratitude: [] as string[],
  assistance: null as boolean | null,
  contacts: { email: "", phone: "", address: "" },
  letter: { body: "" },
  design: { font: "georgia" as RLFontId, accent: "#111827", fontSize: "M" as RLFontSize, theme: "light" as RLTheme },
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
          return { employer, salutation };
        }),

      setSalutation: (value) => set({ salutation: value, salutationTouched: true }),
      setPosition: (value) => set({ position: value }),
      setSubmissionDate: (value) => set({ submissionDate: value }),
      setLastWorkingDay: (value) => set({ lastWorkingDay: value }),

      setReason: (value) => set((s) => ({ reason: s.reason === value ? null : value })),
      setOtherReasonText: (value) => set({ otherReasonText: value }),

      toggleGratitude: (value) =>
        set((s) => {
          const has = s.gratitude.includes(value);
          if (has) return { gratitude: s.gratitude.filter((x) => x !== value) };
          if (s.gratitude.length >= MAX_GRATITUDE) return s;
          return { gratitude: [...s.gratitude, value] };
        }),

      setAssistance: (value) => set({ assistance: value }),
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
      reset: () => set({ ...initial }),
    }),
    {
      name: "resume-co:resignation-letter",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
