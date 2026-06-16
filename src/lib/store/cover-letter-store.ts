"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export type CLFlow = "scratch" | "upload" | "use-resume";

/** Wizard screen keys (see docs/cover-letter-onboarding-plan.md §2). */
export type CLStep =
  | "intent"
  | "job-details"
  | "desired-title"
  | "skills"
  | "experience"
  | "recent-job"
  | "education"
  | "degree"
  | "field"
  | "strengths"
  | "personal"
  | "generate"
  | "preview";

export type EducationLevel = "college" | "highschool" | "student" | "none";

export type CLFontId = "georgia" | "inter" | "garamond";
export type CLSpacingId = "dense" | "normal" | "loose";
export type CLLayoutId = "accent-top" | "split";

export interface CLDesign {
  font: CLFontId;
  accent: string;
  /** Vertical rhythm (Compact / Standard / Spacious). */
  spacing: CLSpacingId;
  /** Tinted or dark page background ("" = white). */
  bg: string;
  /** Dark page (white text) — set by "dark combination" color swatches. */
  dark: boolean;
  /** Header arrangement, set by the selected Style template. */
  layout: CLLayoutId;
  /** Selected Style template id. */
  template: string;
}

export interface CLJobDetails {
  desiredJobTitle: string;
  companyName: string;
  hiringManagerName: string;
  jobDescription: string;
}

export interface CLPersonal {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
}

export interface CoverLetterState {
  flow: CLFlow;
  sourceResumeId?: string;
  uploadedFileName?: string;

  jobIntent: { hasSpecificJob: boolean | null };
  jobDetails: CLJobDetails;

  skills: string[]; // max 3
  experience: string; // "~1" … "10+"
  recentJob: { jobTitle: string; company: string };
  education: { level: EducationLevel | null; university: string; field: string };
  strengths: string[]; // max 3
  personal: CLPersonal;

  letter: { companyName: string; hiringManagerName: string; body: string };
  design: CLDesign;

  /** wizard control */
  step: CLStep;
  mode: "onboarding" | "edit";

  /* setters */
  setFlow: (flow: CLFlow, meta?: { sourceResumeId?: string; uploadedFileName?: string }) => void;
  setStep: (step: CLStep) => void;
  setMode: (mode: "onboarding" | "edit") => void;
  setJobIntent: (hasSpecificJob: boolean) => void;
  patchJobDetails: (patch: Partial<CLJobDetails>) => void;
  toggleSkill: (skill: string) => void;
  setExperience: (value: string) => void;
  patchRecentJob: (patch: Partial<{ jobTitle: string; company: string }>) => void;
  setEducationLevel: (level: EducationLevel) => void;
  patchEducation: (patch: Partial<{ university: string; field: string }>) => void;
  toggleStrength: (strength: string) => void;
  patchPersonal: (patch: Partial<CLPersonal>) => void;
  setLetter: (patch: Partial<{ companyName: string; hiringManagerName: string; body: string }>) => void;
  setDesign: (patch: Partial<CLDesign>) => void;

  goNext: () => void;
  goBack: () => void;
  hydrate: (data: Partial<CoverLetterState>) => void;
  reset: () => void;
}

/* ------------------------------------------------------------------ */
/* Defaults                                                           */
/* ------------------------------------------------------------------ */

const MAX_SELECT = 3;

const initial = {
  flow: "scratch" as CLFlow,
  sourceResumeId: undefined,
  uploadedFileName: undefined,
  jobIntent: { hasSpecificJob: null },
  jobDetails: { desiredJobTitle: "", companyName: "", hiringManagerName: "", jobDescription: "" },
  skills: [] as string[],
  experience: "",
  recentJob: { jobTitle: "", company: "" },
  education: { level: null as EducationLevel | null, university: "", field: "" },
  strengths: [] as string[],
  personal: { firstName: "", lastName: "", email: "", phone: "", address: "" },
  letter: { companyName: "", hiringManagerName: "", body: "" },
  design: {
    font: "georgia" as CLFontId,
    accent: "#111827",
    spacing: "normal" as CLSpacingId,
    bg: "",
    dark: false,
    layout: "accent-top" as CLLayoutId,
    template: "classic",
  },
  step: "intent" as CLStep,
  mode: "onboarding" as const,
};

/* ------------------------------------------------------------------ */
/* Branching: the ordered step sequence for the current answers       */
/* (docs §3). Upload / use-resume only run the post-Review intent path.*/
/* ------------------------------------------------------------------ */

export function stepSequence(s: Pick<CoverLetterState, "flow" | "jobIntent" | "experience" | "education">): CLStep[] {
  const seq: CLStep[] = ["intent"];

  // Job-intent branch (all flows)
  if (s.jobIntent.hasSpecificJob === true) seq.push("job-details");
  else if (s.jobIntent.hasSpecificJob === false) seq.push("desired-title");

  // Resume / upload flows skip the manual middle — they merge straight to generate.
  if (s.flow !== "scratch") {
    if (s.jobIntent.hasSpecificJob !== null) seq.push("generate");
    return seq;
  }

  // Start-from-scratch full wizard
  if (s.jobIntent.hasSpecificJob === null) return seq;
  seq.push("skills", "experience");
  if (s.experience && s.experience !== "~1") seq.push("recent-job");
  seq.push("education");
  if (s.education.level === "college") seq.push("degree", "field");
  seq.push("strengths", "personal", "generate");
  return seq;
}

/* ------------------------------------------------------------------ */
/* Progress + step-indicator metadata (docs §4, verbatim messages)    */
/* ------------------------------------------------------------------ */

export type CLPhase = "add-details" | "personalize" | "download";

const STEP_PHASE: Record<CLStep, CLPhase> = {
  intent: "add-details",
  "job-details": "add-details",
  "desired-title": "add-details",
  skills: "personalize",
  experience: "personalize",
  "recent-job": "add-details",
  education: "add-details",
  degree: "add-details",
  field: "add-details",
  strengths: "personalize",
  personal: "add-details",
  generate: "download",
  preview: "download",
};

const STEP_MESSAGE: Record<CLStep, { message: string; gain: string }> = {
  intent: { message: "Tell us about your desired job", gain: "+14%" },
  "job-details": { message: "Tell us about your desired job", gain: "+14%" },
  "desired-title": { message: "Tell us about your desired job", gain: "+14%" },
  skills: { message: "Tell us about your best skills", gain: "+12%" },
  experience: { message: "Tell us about your relevant experience", gain: "+17%" },
  "recent-job": { message: "Tell us about your relevant experience", gain: "+17%" },
  education: { message: "Share your educational background", gain: "+14%" },
  degree: { message: "Share your educational background", gain: "+14%" },
  field: { message: "Share your educational background", gain: "+14%" },
  strengths: { message: "Let us know what you're good at", gain: "+14%" },
  personal: { message: "Provide your contact information", gain: "+19%" },
  generate: { message: "Generating your cover letter", gain: "" },
  preview: { message: "Your cover letter is ready", gain: "" },
};

export function phaseForStep(step: CLStep): CLPhase {
  return STEP_PHASE[step];
}

/** Lenient email format check (used for Personal-step validation). */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Whether the Next/Save button should be enabled for a step. */
export function canProceed(step: CLStep, s: CoverLetterState): boolean {
  switch (step) {
    case "intent":
      return s.jobIntent.hasSpecificJob !== null;
    case "job-details":
      return s.jobDetails.desiredJobTitle.trim().length > 0;
    case "desired-title":
      return s.jobDetails.desiredJobTitle.trim().length > 0;
    case "skills":
      return s.skills.length >= 1;
    case "experience":
      return s.experience.length > 0;
    case "recent-job":
      return s.recentJob.jobTitle.trim().length > 0;
    case "education":
      return s.education.level !== null;
    case "degree":
      return s.education.university.trim().length > 0;
    case "field":
      return s.education.field.trim().length > 0;
    case "strengths":
      return s.strengths.length >= 1;
    case "personal":
      return (
        s.personal.firstName.trim().length > 0 &&
        s.personal.lastName.trim().length > 0 &&
        isValidEmail(s.personal.email)
      );
    default:
      return true;
  }
}

/** Progress message + percent for a step within its computed sequence. */
export function progressForStep(
  step: CLStep,
  s: Pick<CoverLetterState, "flow" | "jobIntent" | "experience" | "education">
): { message: string; gain: string; percent: number } {
  const seq = stepSequence(s);
  const idx = seq.indexOf(step);
  const percent =
    step === "preview" || step === "generate"
      ? 100
      : idx < 0
        ? 10
        : Math.max(8, Math.round(((idx + 1) / seq.length) * 100));
  return { ...STEP_MESSAGE[step], percent };
}

/* ------------------------------------------------------------------ */
/* Store                                                              */
/* ------------------------------------------------------------------ */

export const useCoverLetterStore = create<CoverLetterState>()(
  persist(
    (set, get) => ({
      ...initial,

      setFlow: (flow, meta) =>
        set({ flow, sourceResumeId: meta?.sourceResumeId, uploadedFileName: meta?.uploadedFileName }),
      setStep: (step) => set({ step }),
      setMode: (mode) => set({ mode }),

      setJobIntent: (hasSpecificJob) => set({ jobIntent: { hasSpecificJob } }),
      patchJobDetails: (patch) => set((s) => ({ jobDetails: { ...s.jobDetails, ...patch } })),

      toggleSkill: (skill) =>
        set((s) => {
          const has = s.skills.includes(skill);
          if (has) return { skills: s.skills.filter((x) => x !== skill) };
          if (s.skills.length >= MAX_SELECT) return s;
          return { skills: [...s.skills, skill] };
        }),

      setExperience: (value) => set({ experience: value }),
      patchRecentJob: (patch) => set((s) => ({ recentJob: { ...s.recentJob, ...patch } })),

      setEducationLevel: (level) => set((s) => ({ education: { ...s.education, level } })),
      patchEducation: (patch) => set((s) => ({ education: { ...s.education, ...patch } })),

      toggleStrength: (strength) =>
        set((s) => {
          const has = s.strengths.includes(strength);
          if (has) return { strengths: s.strengths.filter((x) => x !== strength) };
          if (s.strengths.length >= MAX_SELECT) return s;
          return { strengths: [...s.strengths, strength] };
        }),

      patchPersonal: (patch) => set((s) => ({ personal: { ...s.personal, ...patch } })),
      setLetter: (patch) => set((s) => ({ letter: { ...s.letter, ...patch } })),
      setDesign: (patch) => set((s) => ({ design: { ...s.design, ...patch } })),

      goNext: () => {
        const s = get();
        const seq = stepSequence(s);
        const idx = seq.indexOf(s.step);
        if (idx >= 0 && idx < seq.length - 1) set({ step: seq[idx + 1] });
      },
      goBack: () => {
        const s = get();
        const seq = stepSequence(s);
        const idx = seq.indexOf(s.step);
        if (idx > 0) set({ step: seq[idx - 1] });
      },

      hydrate: (data) => set((s) => ({ ...s, ...data })),
      reset: () => set({ ...initial }),
    }),
    {
      name: "resume-co:cover-letter",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
