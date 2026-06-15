"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { getTemplate } from "@/lib/templates";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export interface PersonalDetails {
  firstName: string;
  lastName: string;
  jobTitle: string;
  photo?: string;
  nationality: string;
  driverLicense: string;
  birthDate: string;
}

export interface ContactInfo {
  email: string;
  phone: string;
  linkedin: string;
  location: string;
}

export interface EmploymentEntry {
  id: string;
  jobTitle: string;
  company: string;
  startDate: string;
  endDate: string;
  location: string;
  description: string; // HTML
}

export interface SkillEntry {
  id: string;
  name: string;
  level: string;
}

export interface EducationEntry {
  id: string;
  institution: string;
  degree: string;
  startDate: string;
  endDate: string;
  location: string;
  description: string; // HTML
}

/** Built-in section keys (additional sections add their own ids). */
export type SectionKey =
  | "personal"
  | "contact"
  | "summary"
  | "employment"
  | "skills"
  | "education"
  | string;

export type AdditionalType =
  | "internships"
  | "courses"
  | "references"
  | "languages"
  | "links"
  | "hobbies"
  | "custom";

/** A single entry inside an additional section (fields vary by type). */
export interface AdditionalEntry {
  id: string;
  [field: string]: string;
}

export interface AdditionalSection {
  id: string; // also used as the section key in sectionOrder
  type: AdditionalType;
  title: string;
  entries: AdditionalEntry[];
}

export type FontId = "roboto" | "georgia" | "garamond";
export type SpacingId = "dense" | "normal" | "loose";
export type ColumnsId = "left" | "centered" | "right";

export interface DesignOptions {
  font: FontId;
  spacing: SpacingId;
  columns: ColumnsId;
  color: string; // hex accent (headings / title / rules)
  bg: string; // page background ("" = white); set by "combination" color themes
  dark: boolean; // dark sidebar layout
}

export interface ResumeState {
  templateId: string;
  personal: PersonalDetails;
  contact: ContactInfo;
  summary: string; // HTML
  employment: EmploymentEntry[];
  skills: SkillEntry[];
  education: EducationEntry[];
  additional: AdditionalSection[];
  design: DesignOptions;

  /** Order of sections in the nav + preview. */
  sectionOrder: SectionKey[];
  /** Currently edited section. */
  activeSection: SectionKey;

  /* setters */
  setTemplate: (id: string) => void;
  /** Select a template AND apply its layout preset to the preview. */
  applyTemplate: (id: string) => void;
  setDesign: (patch: Partial<DesignOptions>) => void;
  setPersonal: (patch: Partial<PersonalDetails>) => void;
  setContact: (patch: Partial<ContactInfo>) => void;
  setSummary: (html: string) => void;

  addEmployment: () => void;
  updateEmployment: (id: string, patch: Partial<EmploymentEntry>) => void;
  removeEmployment: (id: string) => void;

  addSkill: (name?: string) => void;
  updateSkill: (id: string, patch: Partial<SkillEntry>) => void;
  removeSkill: (id: string) => void;

  addEducation: () => void;
  updateEducation: (id: string, patch: Partial<EducationEntry>) => void;
  removeEducation: (id: string) => void;

  /** Additional sections (returns the new section id so the caller can open it). */
  addAdditionalSection: (type: AdditionalType, title: string) => string;
  updateAdditionalTitle: (id: string, title: string) => void;
  removeAdditionalSection: (id: string) => void;
  addAdditionalEntry: (sectionId: string) => void;
  updateAdditionalEntry: (
    sectionId: string,
    entryId: string,
    patch: Partial<AdditionalEntry>
  ) => void;
  removeAdditionalEntry: (sectionId: string, entryId: string) => void;

  setActiveSection: (key: SectionKey) => void;
  setSectionOrder: (order: SectionKey[]) => void;

  /** Replace the whole resume (used by upload-parse in Phase 12). */
  hydrate: (data: Partial<ResumeState>) => void;
  /** Clear back to a pristine, empty resume (used by "Start from scratch"). */
  reset: () => void;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

let idCounter = 0;
const uid = (prefix: string) => `${prefix}-${++idCounter}`;

const emptyEmployment = (): EmploymentEntry => ({
  id: uid("emp"),
  jobTitle: "",
  company: "",
  startDate: "",
  endDate: "",
  location: "",
  description: "",
});

const emptyEducation = (): EducationEntry => ({
  id: uid("edu"),
  institution: "",
  degree: "",
  startDate: "",
  endDate: "",
  location: "",
  description: "",
});

export const DEFAULT_SECTION_ORDER: SectionKey[] = [
  "personal",
  "contact",
  "employment",
  "education",
  "skills",
  "summary",
];

/** A pristine, empty resume — shared by the store's initial state and reset(). */
type ResumeData = Pick<
  ResumeState,
  | "templateId"
  | "personal"
  | "contact"
  | "summary"
  | "employment"
  | "skills"
  | "education"
  | "additional"
  | "design"
  | "sectionOrder"
  | "activeSection"
>;

const emptyResume = (): ResumeData => ({
  templateId: "clear-ats",
  personal: {
    firstName: "",
    lastName: "",
    jobTitle: "",
    nationality: "",
    driverLicense: "",
    birthDate: "",
  },
  contact: { email: "", phone: "", linkedin: "", location: "" },
  summary: "",
  employment: [],
  skills: [],
  education: [],
  additional: [],
  design: {
    font: "georgia",
    spacing: "normal",
    columns: "centered",
    color: "#111827",
    bg: "",
    dark: false,
  },
  sectionOrder: [...DEFAULT_SECTION_ORDER],
  activeSection: "personal",
});

/* ------------------------------------------------------------------ */
/* Store                                                              */
/* ------------------------------------------------------------------ */

export const useResumeStore = create<ResumeState>()(
  persist(
    (set) => ({
  ...emptyResume(),

  setTemplate: (id) => set({ templateId: id }),
  applyTemplate: (id) =>
    set((s) => {
      const t = getTemplate(id);
      if (!t) return { templateId: id };
      // Reset the combination background unless the template's preset sets one.
      return { templateId: id, design: { ...s.design, bg: "", ...t.preset } };
    }),
  setDesign: (patch) => set((s) => ({ design: { ...s.design, ...patch } })),
  setPersonal: (patch) =>
    set((s) => ({ personal: { ...s.personal, ...patch } })),
  setContact: (patch) => set((s) => ({ contact: { ...s.contact, ...patch } })),
  setSummary: (html) => set({ summary: html }),

  addEmployment: () =>
    set((s) => ({ employment: [...s.employment, emptyEmployment()] })),
  updateEmployment: (id, patch) =>
    set((s) => ({
      employment: s.employment.map((e) =>
        e.id === id ? { ...e, ...patch } : e
      ),
    })),
  removeEmployment: (id) =>
    set((s) => ({ employment: s.employment.filter((e) => e.id !== id) })),

  addSkill: (name = "") =>
    set((s) => ({
      skills: [...s.skills, { id: uid("skill"), name, level: "" }],
    })),
  updateSkill: (id, patch) =>
    set((s) => ({
      skills: s.skills.map((sk) => (sk.id === id ? { ...sk, ...patch } : sk)),
    })),
  removeSkill: (id) =>
    set((s) => ({ skills: s.skills.filter((sk) => sk.id !== id) })),

  addEducation: () =>
    set((s) => ({ education: [...s.education, emptyEducation()] })),
  updateEducation: (id, patch) =>
    set((s) => ({
      education: s.education.map((e) =>
        e.id === id ? { ...e, ...patch } : e
      ),
    })),
  removeEducation: (id) =>
    set((s) => ({ education: s.education.filter((e) => e.id !== id) })),

  addAdditionalSection: (type, title) => {
    const id = uid(type);
    set((s) => ({
      additional: [
        ...s.additional,
        { id, type, title, entries: [{ id: uid("ent") }] },
      ],
      sectionOrder: [...s.sectionOrder, id],
      activeSection: id,
    }));
    return id;
  },
  updateAdditionalTitle: (id, title) =>
    set((s) => ({
      additional: s.additional.map((a) => (a.id === id ? { ...a, title } : a)),
    })),
  removeAdditionalSection: (id) =>
    set((s) => ({
      additional: s.additional.filter((a) => a.id !== id),
      sectionOrder: s.sectionOrder.filter((k) => k !== id),
      activeSection: s.activeSection === id ? "personal" : s.activeSection,
    })),
  addAdditionalEntry: (sectionId) =>
    set((s) => ({
      additional: s.additional.map((a) =>
        a.id === sectionId
          ? { ...a, entries: [...a.entries, { id: uid("ent") }] }
          : a
      ),
    })),
  updateAdditionalEntry: (sectionId, entryId, patch) =>
    set((s) => ({
      additional: s.additional.map((a) =>
        a.id === sectionId
          ? {
              ...a,
              entries: a.entries.map((e) =>
                e.id === entryId ? ({ ...e, ...patch } as AdditionalEntry) : e
              ),
            }
          : a
      ),
    })),
  removeAdditionalEntry: (sectionId, entryId) =>
    set((s) => ({
      additional: s.additional.map((a) =>
        a.id === sectionId
          ? { ...a, entries: a.entries.filter((e) => e.id !== entryId) }
          : a
      ),
    })),

  setActiveSection: (key) => set({ activeSection: key }),
  setSectionOrder: (order) => set({ sectionOrder: order }),

  hydrate: (data) => set((s) => ({ ...s, ...data })),
  reset: () => set(emptyResume()),
    }),
    {
      name: "resume-co:resume",
      storage: createJSONStorage(() => localStorage),
      // Don't restore the transient UI cursor — always open on the first section.
      partialize: ({ activeSection: _activeSection, ...rest }) => rest,
      // v1: normalise built-in order (summary last) for resumes saved earlier.
      version: 1,
      migrate: (persisted, version) => {
        const state = persisted as Partial<ResumeState> | undefined;
        if (state && version < 1 && Array.isArray(state.sectionOrder)) {
          const prev = state.sectionOrder;
          const builtinOrder = ["personal", "contact", "employment", "education", "skills"];
          const builtins = builtinOrder.filter((k) => prev.includes(k));
          const additional = prev.filter(
            (k) => !builtinOrder.includes(k) && k !== "summary"
          );
          state.sectionOrder = [...builtins, ...additional, "summary"];
        }
        return state as ResumeState;
      },
    }
  )
);

/* ------------------------------------------------------------------ */
/* Progress (shared by the top bar + the Improve tab)                 */
/* ------------------------------------------------------------------ */

export interface ProgressItem {
  key: string;
  label: string;
  weight: number;
  done: boolean;
}

const hasText = (html: string) => html.replace(/<[^>]*>/g, "").trim().length > 0;

export function getProgressItems(s: ResumeState): ProgressItem[] {
  return [
    { key: "firstName", label: "Add your first name", weight: 8, done: !!s.personal.firstName.trim() },
    { key: "lastName", label: "Add your last name", weight: 8, done: !!s.personal.lastName.trim() },
    { key: "jobTitle", label: "Add the job title", weight: 10, done: !!s.personal.jobTitle.trim() },
    { key: "email", label: "Add contact email", weight: 12, done: !!s.contact.email.trim() },
    { key: "phone", label: "Add a phone number", weight: 6, done: !!s.contact.phone.trim() },
    { key: "location", label: "Add your location", weight: 6, done: !!s.contact.location.trim() },
    { key: "linkedin", label: "Add a LinkedIn URL", weight: 4, done: !!s.contact.linkedin.trim() },
    { key: "summary", label: "Write a summary", weight: 12, done: hasText(s.summary) },
    { key: "employment", label: "Add work experience", weight: 14, done: s.employment.some((e) => e.jobTitle.trim()) },
    { key: "skills", label: "Add one more skill", weight: 8, done: s.skills.some((sk) => sk.name.trim()) },
    { key: "education", label: "Add your education", weight: 12, done: s.education.some((e) => e.institution.trim()) },
  ];
}

export function getProgress(s: ResumeState): number {
  return getProgressItems(s).reduce((acc, i) => acc + (i.done ? i.weight : 0), 0);
}

export interface ImproveSuggestion {
  key: string;
  label: string;
  weight: number;
  target: SectionKey;
}

/**
 * Dynamic Improve-page suggestions with the doc's staged scoring:
 * employment +12→+8, education +6→+2, skills +12→+6→+2, then removed.
 */
export function getImproveSuggestions(s: ResumeState): ImproveSuggestion[] {
  const out: ImproveSuggestion[] = [];
  const p = s.personal;
  if (!p.firstName.trim()) out.push({ key: "firstName", label: "Add your first name", weight: 8, target: "personal" });
  if (!p.lastName.trim()) out.push({ key: "lastName", label: "Add your last name", weight: 8, target: "personal" });
  if (!p.jobTitle.trim()) out.push({ key: "jobTitle", label: "Add the job title", weight: 10, target: "personal" });
  if (!s.contact.email.trim()) out.push({ key: "email", label: "Add contact email", weight: 12, target: "contact" });
  if (!hasText(s.summary)) out.push({ key: "summary", label: "Write a summary", weight: 12, target: "summary" });

  // Employment: staged (title+company = partial, needs description for complete)
  const empCore = s.employment.filter((e) => e.jobTitle.trim() && e.company.trim());
  if (empCore.length === 0)
    out.push({ key: "employment", label: "Add work experience", weight: 12, target: "employment" });
  else if (!empCore.some((e) => hasText(e.description)))
    out.push({ key: "employment", label: "Add work experience", weight: 8, target: "employment" });

  // Education: staged (institution = partial, needs degree for complete)
  const eduInst = s.education.filter((e) => e.institution.trim());
  if (eduInst.length === 0)
    out.push({ key: "education", label: "Add education", weight: 6, target: "education" });
  else if (!eduInst.some((e) => e.degree.trim()))
    out.push({ key: "education", label: "Add education", weight: 2, target: "education" });

  // Skills: staged (0 → 1 → 2 → done at 3)
  const skillCount = s.skills.filter((sk) => sk.name.trim()).length;
  if (skillCount === 0) out.push({ key: "skills", label: "Add skills", weight: 12, target: "skills" });
  else if (skillCount === 1) out.push({ key: "skills", label: "Add more skills", weight: 6, target: "skills" });
  else if (skillCount === 2) out.push({ key: "skills", label: "Add one more skill", weight: 2, target: "skills" });

  return out;
}
