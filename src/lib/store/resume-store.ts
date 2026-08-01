"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { safeLocalStorage } from "./safe-storage";
import { getTemplate, DEFAULT_TEMPLATE_ID } from "@/lib/templates";
import { fontPairsForTemplate, styleStem } from "@/lib/font-pairs";
import { getResumeTheme, DEFAULT_THEME_ID } from "@/lib/resume-themes";

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

// Every font family a resume style can offer (Design > Fonts). Each style exposes
// exactly three Primary+Secondary PAIRS drawn from these families - see the
// per-style table in `font-pairs.ts`. Web families load via next/font (see
// layout.tsx); a few licensed families (Google Sans, Sentient, Erode, Satoshi,
// Tabular) render through a documented same-category fallback, never a silent
// unrelated substitute.
export type FontId =
  | "verdana"
  | "georgia"
  | "arial"
  | "tahoma"
  | "garamond"
  | "roboto"
  | "robotoFlex"
  | "robotoSerif"
  | "inter"
  | "nunitoSans"
  | "literata"
  | "cactusSerif"
  | "lora"
  | "sourceSansPro"
  | "source"
  | "work"
  | "inria"
  | "dmSans"
  | "crimson"
  | "ibmPlex"
  | "poppins"
  | "playfair"
  | "manrope"
  | "ubuntuMono"
  | "tabular"
  | "googleSans"
  | "sentient"
  | "erode"
  | "satoshi";
export type SpacingId = "dense" | "normal" | "loose";
export type ColumnsId = "left" | "centered" | "right";

export interface DesignOptions {
  font: FontId; // primary family: name + section headings
  fontSecondary?: FontId; // secondary family: body / bullets / dates (falls back to `font`)
  spacing: SpacingId;
  columns: ColumnsId;
  color: string; // hex accent (headings / title / rules)
  bg: string; // page background ("" = white); set by "combination" color themes
  dark: boolean; // dark sidebar layout
  /**
   * Selected color-theme id (see `resume-themes.ts`). A theme is a COMPLETE
   * palette - it drives the sidebar panel color and, for the dark theme, the
   * body-text color, on top of the accent (`color`) and page bg (`bg`) it also
   * writes. Optional so resumes saved before themes still load.
   */
  themeId?: string;
  /**
   * Per-style remembered font-pair selection: `{ [styleStem]: fontPairId }`.
   * Font pairs are style-specific, so a choice made for one style is restored
   * only when that same style is re-selected - a Bentz pick never leaks into
   * Napoleon. Absent styles fall back to the style's Option-1 default.
   */
  fontByStyle?: Record<string, string>;
}

export interface ResumeState {
  /** Stable id linking the active resume to its saved draft on the dashboard. */
  id: string;
  templateId: string;
  personal: PersonalDetails;
  contact: ContactInfo;
  /** Editable heading for the Contact section (renamable via the pencil). */
  contactTitle: string;
  summary: string; // HTML
  /** Editable heading for the Summary section (renamable via the pencil). */
  summaryTitle: string;
  /** Signature of the resume sections the applied summary was written from
   *  (employment/skills/education). When it drifts, the summary section offers
   *  to regenerate. "" until a summary is applied via Use. */
  summaryBasis: string;
  employment: EmploymentEntry[];
  /** Editable heading for the Employment section (renamable via the pencil). */
  employmentTitle: string;
  skills: SkillEntry[];
  /** Editable heading for the Skills section (renamable via the pencil). */
  skillsTitle: string;
  education: EducationEntry[];
  /** Editable heading for the Education section (renamable via the pencil). */
  educationTitle: string;
  additional: AdditionalSection[];
  design: DesignOptions;

  /** Order of sections in the nav + preview. */
  sectionOrder: SectionKey[];
  /** Sections the user has reached, so the nav can unlock them one at a time as
   *  the guided flow advances (via Next). Locked sections show disabled in the
   *  nav; starts with just "personal". */
  unlockedSections: string[];
  /** True when the resume was populated from a parsed source (device/cloud
   *  upload or a LinkedIn/profile import) rather than started from scratch. Used
   *  to hide the "Import from LinkedIn" banner for uploaded resumes, since their
   *  details already came in - a from-scratch resume keeps the banner. */
  importedResume: boolean;
  /** Currently edited section. */
  activeSection: SectionKey;
  /** Currently focused inner entry (employment/education/etc.), for preview
   *  highlighting. null = highlight the whole active section instead. */
  activeEntryId: string | null;
  /** Index of the bullet/paragraph the caret is in within the active entry's
   *  rich-text body, for per-paragraph preview highlighting. null = none. */
  activeBlockIndex: number | null;
  /** Skill chip the user is hovering in the editor, so the preview highlights
   *  just that one skill in blue. null = none. */
  hoveredSkillId: string | null;

  /* setters */
  setTemplate: (id: string) => void;
  /** Select a template AND apply its layout preset to the preview. */
  applyTemplate: (id: string) => void;
  setDesign: (patch: Partial<DesignOptions>) => void;
  setPersonal: (patch: Partial<PersonalDetails>) => void;
  setContact: (patch: Partial<ContactInfo>) => void;
  setSummary: (html: string) => void;
  setSummaryTitle: (title: string) => void;
  setSummaryBasis: (basis: string) => void;

  addEmployment: () => void;
  updateEmployment: (id: string, patch: Partial<EmploymentEntry>) => void;
  removeEmployment: (id: string) => void;
  /** Put a deleted entry back where it was (powers the "Undo" toast). */
  insertEmployment: (entry: EmploymentEntry, index: number) => void;
  /** Move an entry from one position to another (drag-and-drop reorder). */
  reorderEmployment: (from: number, to: number) => void;
  setEmploymentTitle: (title: string) => void;

  addSkill: (name?: string) => void;
  updateSkill: (id: string, patch: Partial<SkillEntry>) => void;
  removeSkill: (id: string) => void;
  clearSkills: () => void;
  /** Put a deleted skill back where it was (powers the "Undo" toast). */
  insertSkill: (entry: SkillEntry, index: number) => void;
  /** Move a skill from one position to another (drag-and-drop reorder). */
  reorderSkills: (from: number, to: number) => void;
  setSkillsTitle: (title: string) => void;
  setContactTitle: (title: string) => void;

  addEducation: () => void;
  updateEducation: (id: string, patch: Partial<EducationEntry>) => void;
  removeEducation: (id: string) => void;
  /** Put a deleted entry back where it was (powers the "Undo" toast). */
  insertEducation: (entry: EducationEntry, index: number) => void;
  /** Move an entry from one position to another (drag-and-drop reorder). */
  reorderEducation: (from: number, to: number) => void;
  setEducationTitle: (title: string) => void;

  /** Additional sections (returns the new section id so the caller can open it). */
  addAdditionalSection: (type: AdditionalType, title: string) => string;
  updateAdditionalTitle: (id: string, title: string) => void;
  removeAdditionalSection: (id: string) => void;
  /** Appends a blank entry and returns its id, so the caller can expand it. */
  addAdditionalEntry: (sectionId: string) => string;
  /** Put a deleted entry back where it was (powers the "Undo" toast). */
  insertAdditionalEntry: (
    sectionId: string,
    entry: AdditionalEntry,
    index: number
  ) => void;
  /** Move an entry within its section (drag-and-drop reorder). */
  reorderAdditionalEntries: (
    sectionId: string,
    from: number,
    to: number
  ) => void;
  updateAdditionalEntry: (
    sectionId: string,
    entryId: string,
    patch: Partial<AdditionalEntry>
  ) => void;
  removeAdditionalEntry: (sectionId: string, entryId: string) => void;

  setActiveSection: (key: SectionKey) => void;
  /** Mark the inner entry being edited (null clears it). */
  setActiveEntryId: (id: string | null) => void;
  /** Mark the bullet/paragraph being edited within the active entry. */
  setActiveBlockIndex: (index: number | null) => void;
  /** Mark the skill chip being hovered (null clears it). */
  setHoveredSkillId: (id: string | null) => void;
  setSectionOrder: (order: SectionKey[]) => void;
  /** Drop a built-in section from the resume. Re-addable via restoreSection. */
  removeSection: (key: SectionKey) => void;
  /** Put a built-in section back at its canonical position. */
  restoreSection: (key: SectionKey) => void;
  /** Move a reorderable section up/down within the movable range (personal &
   *  contact stay pinned at the top, summary at the bottom). */
  moveSection: (key: SectionKey, dir: "up" | "down") => void;
  /** Drop one section onto another's position (sidebar drag-and-drop). */
  reorderSections: (fromKey: SectionKey, toKey: SectionKey) => void;

  /** Replace the whole resume (used by upload-parse in Phase 12). */
  hydrate: (data: Partial<ResumeState>) => void;
  /** Clear back to a pristine, empty resume + new id ("Start from scratch"). */
  reset: () => void;
  /** Load a saved draft into the editor (used by the dashboard "Edit"). */
  loadDocument: (id: string, data: Partial<ResumeState>) => void;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Unique id for a repeatable entry.
 *
 * A plain counter is not enough: it resets to 0 on every page load while the
 * entries themselves are persisted, so the first entry added after a reload
 * would collide with the saved "emp-1" and React would see two children with
 * the same key. Stamping the session start into the id keeps them distinct
 * across reloads, and the counter keeps them distinct within one.
 *
 * Only ever called from user actions (never during SSR or module init), so the
 * time component cannot cause a hydration mismatch.
 */
let idCounter = 0;
const idSession = Date.now().toString(36);
const uid = (prefix: string) => `${prefix}-${idSession}-${(++idCounter).toString(36)}`;

/** Re-key any entries that share an id, keeping the first occurrence as-is. */
function dedupeIds<T extends { id: string }>(list: T[] | undefined, prefix: string): T[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  return list.map((item) => {
    if (!item?.id || seen.has(item.id)) return { ...item, id: uid(prefix) };
    seen.add(item.id);
    return item;
  });
}

/**
 * Guarantee unique entry ids on data coming in from outside the store (a saved
 * draft, an uploaded resume). Only the arrays actually present are touched, so
 * this is safe on a partial patch.
 *
 * Section titles are deliberately NOT deduped: repeated Custom sections all keep
 * the clean title "Custom section" and are told apart by a display-only number
 * the sidebar computes from their order, so the number never leaks into the
 * stored title (and renaming stays exactly what the user typed).
 */
function withUniqueIds(data: Partial<ResumeState>): Partial<ResumeState> {
  const next = { ...data };
  if (next.employment) next.employment = dedupeIds(next.employment, "emp");
  if (next.education) next.education = dedupeIds(next.education, "edu");
  if (next.skills) next.skills = dedupeIds(next.skills, "skill");
  if (next.additional)
    next.additional = dedupeIds(next.additional, "sec").map((sec) => ({
      ...sec,
      entries: dedupeIds(sec.entries, "ent"),
    }));
  return next;
}

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

/** Generate a unique resume/draft id. */
export const newResumeId = () =>
  `res-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** A pristine, empty resume - shared by the store's initial state and reset(). */
type ResumeData = Pick<
  ResumeState,
  | "id"
  | "templateId"
  | "personal"
  | "contact"
  | "contactTitle"
  | "summary"
  | "summaryTitle"
  | "summaryBasis"
  | "employment"
  | "employmentTitle"
  | "skills"
  | "skillsTitle"
  | "education"
  | "educationTitle"
  | "additional"
  | "design"
  | "sectionOrder"
  | "unlockedSections"
  | "importedResume"
  | "activeSection"
  | "activeEntryId"
  | "activeBlockIndex"
  | "hoveredSkillId"
>;

const emptyResume = (): ResumeData => ({
  id: "",
  templateId: DEFAULT_TEMPLATE_ID,
  personal: {
    firstName: "",
    lastName: "",
    jobTitle: "",
    nationality: "",
    driverLicense: "",
    birthDate: "",
  },
  contact: { email: "", phone: "", linkedin: "", location: "" },
  contactTitle: "Contact information",
  summary: "",
  summaryTitle: "Professional summary",
  summaryBasis: "",
  employment: [],
  employmentTitle: "Employment history",
  skills: [],
  skillsTitle: "Skills",
  education: [],
  educationTitle: "Education",
  additional: [],
  design: {
    font: "georgia",
    fontSecondary: "georgia",
    spacing: "normal",
    columns: "centered",
    color: "#111827",
    bg: "",
    dark: false,
    themeId: "black",
  },
  sectionOrder: [...DEFAULT_SECTION_ORDER],
  // Guided flow starts with only the first section reachable; Next unlocks the
  // rest one at a time (see setActiveSection).
  unlockedSections: ["personal"],
  // A blank resume is a from-scratch start; upload/import flips this true.
  importedResume: false,
  activeSection: "personal",
  activeEntryId: null,
  activeBlockIndex: null,
  hoveredSkillId: null,
});

/**
 * Build a complete, read-only resume state from a saved draft's data, for
 * rendering a live thumbnail with `<LivePreview previewOnly />`. In previewOnly
 * mode LivePreview never invokes a setter or reads transient editor state
 * (active section/entry, hovered skill), so this fills those with pristine
 * defaults and stubs the rest - every VISUAL field (personal, sections, design,
 * template, order) comes straight from the record so the thumbnail matches the
 * user's own content in their chosen template. `design`/`sectionOrder` are
 * merged defensively so an older/partial record can't crash the render.
 */
/**
 * The design that `applyTemplate(id)` would produce from the current design,
 * WITHOUT mutating the store. Exported so a live style thumbnail can render the
 * exact look selecting that template yields (so the carousel thumbnail matches
 * the preview). Applies the template's preset over the current design, resets
 * the combination background, picks the style-specific font pair (the saved pick
 * for this style, else its default), and clears the color-theme id so the theme
 * re-resolves from the preset's own color/bg.
 */
export function designForTemplate(
  design: DesignOptions,
  id: string
): DesignOptions {
  const t = getTemplate(id);
  if (!t) return design;
  const stem = styleStem(t);
  const pairs = fontPairsForTemplate(t);
  const savedId = design.fontByStyle?.[stem];
  const pair = pairs.find((p) => p.id === savedId) ?? pairs[0];
  // Every newly selected style defaults to the BLACK color theme, regardless of
  // the template preset's own accent - so a fresh style always starts black and
  // the user drives the color from the Colors section afterwards (which writes
  // its own themeId/color/bg and stays until another style is picked). We keep
  // the preset's LAYOUT (columns, dark, heading variant) and font pair; only the
  // color/background/theme are forced to black here.
  const black = getResumeTheme(DEFAULT_THEME_ID);
  return {
    ...design,
    ...t.preset,
    font: pair.primary,
    fontSecondary: pair.secondary,
    color: black?.accent ?? "#111827",
    bg: black?.contentBg ?? "",
    themeId: DEFAULT_THEME_ID,
  };
}

export function previewStateFromDoc(data: Partial<ResumeState>): ResumeState {
  const base = emptyResume();
  return {
    ...base,
    ...data,
    design: { ...base.design, ...(data.design ?? {}) },
    sectionOrder: data.sectionOrder ?? base.sectionOrder,
  } as unknown as ResumeState;
}

/* ------------------------------------------------------------------ */
/* Store                                                              */
/* ------------------------------------------------------------------ */

/**
 * The single source of truth for the resume currently being edited. Persisted to
 * localStorage (key `resume-co:resume`) so an in-progress resume survives reload.
 */
export const useResumeStore = create<ResumeState>()(
  persist(
    (set) => ({
  ...emptyResume(),

  setTemplate: (id) => set({ templateId: id }),
  applyTemplate: (id) =>
    set((s) => {
      const t = getTemplate(id);
      if (!t) return { templateId: id };
      return { templateId: id, design: designForTemplate(s.design, id) };
    }),
  setDesign: (patch) => set((s) => ({ design: { ...s.design, ...patch } })),
  setPersonal: (patch) =>
    set((s) => ({ personal: { ...s.personal, ...patch } })),
  setContact: (patch) => set((s) => ({ contact: { ...s.contact, ...patch } })),
  setSummary: (html) => set({ summary: html }),
  setSummaryTitle: (title) => set({ summaryTitle: title }),
  setSummaryBasis: (summaryBasis) => set({ summaryBasis }),

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
  insertEmployment: (entry, index) =>
    set((s) => {
      const next = [...s.employment];
      next.splice(Math.max(0, Math.min(index, next.length)), 0, entry);
      return { employment: next };
    }),
  reorderEmployment: (from, to) =>
    set((s) => {
      if (from === to || from < 0 || from >= s.employment.length) return {};
      const next = [...s.employment];
      const [moved] = next.splice(from, 1);
      next.splice(Math.max(0, Math.min(to, next.length)), 0, moved);
      return { employment: next };
    }),
  setEmploymentTitle: (title) => set({ employmentTitle: title }),

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
  clearSkills: () => set({ skills: [] }),
  insertSkill: (entry, index) =>
    set((s) => {
      const next = [...s.skills];
      next.splice(Math.max(0, Math.min(index, next.length)), 0, entry);
      return { skills: next };
    }),
  reorderSkills: (from, to) =>
    set((s) => {
      if (from === to || from < 0 || from >= s.skills.length) return {};
      const next = [...s.skills];
      const [moved] = next.splice(from, 1);
      next.splice(Math.max(0, Math.min(to, next.length)), 0, moved);
      return { skills: next };
    }),
  setSkillsTitle: (title) => set({ skillsTitle: title }),
  setContactTitle: (title) => set({ contactTitle: title }),

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
  insertEducation: (entry, index) =>
    set((s) => {
      const next = [...s.education];
      next.splice(Math.max(0, Math.min(index, next.length)), 0, entry);
      return { education: next };
    }),
  reorderEducation: (from, to) =>
    set((s) => {
      if (from === to || from < 0 || from >= s.education.length) return {};
      const next = [...s.education];
      const [moved] = next.splice(from, 1);
      next.splice(Math.max(0, Math.min(to, next.length)), 0, moved);
      return { education: next };
    }),
  setEducationTitle: (title) => set({ educationTitle: title }),

  addAdditionalSection: (type, title) => {
    const id = uid(type);
    set((s) => {
      // Insert the new section just before Professional summary, which always
      // stays last. Falls back to the end if there's no summary in the order.
      const order = [...s.sectionOrder];
      const summaryIdx = order.indexOf("summary");
      if (summaryIdx >= 0) order.splice(summaryIdx, 0, id);
      else order.push(id);
      return {
        additional: [
          ...s.additional,
          { id, type, title, entries: [{ id: uid("ent") }] },
        ],
        sectionOrder: order,
        activeSection: id,
        // Unlock the new section so the nav lists it as navigable - without this
        // it renders disabled and clicking it (after leaving) does nothing.
        unlockedSections: s.unlockedSections.includes(id)
          ? s.unlockedSections
          : [...s.unlockedSections, id],
      };
    });
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
  addAdditionalEntry: (sectionId) => {
    const id = uid("ent");
    set((s) => ({
      additional: s.additional.map((a) =>
        a.id === sectionId ? { ...a, entries: [...a.entries, { id }] } : a
      ),
    }));
    return id;
  },
  insertAdditionalEntry: (sectionId, entry, index) =>
    set((s) => ({
      additional: s.additional.map((a) => {
        if (a.id !== sectionId) return a;
        const entries = [...a.entries];
        entries.splice(Math.max(0, Math.min(index, entries.length)), 0, entry);
        return { ...a, entries };
      }),
    })),
  reorderAdditionalEntries: (sectionId, from, to) =>
    set((s) => ({
      additional: s.additional.map((a) => {
        if (a.id !== sectionId) return a;
        if (from === to || from < 0 || from >= a.entries.length) return a;
        const entries = [...a.entries];
        const [moved] = entries.splice(from, 1);
        entries.splice(Math.max(0, Math.min(to, entries.length)), 0, moved);
        return { ...a, entries };
      }),
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

  // Switching sections clears the inner-entry cursor so the new section
  // highlights as a whole until the user focuses one of its entries. Reaching a
  // section also unlocks it in the guided flow, so Next (which activates the next
  // section) is what enables it in the nav; the nav blocks clicks on locked ones.
  setActiveSection: (key) =>
    set((s) => ({
      activeSection: key,
      activeEntryId: null,
      activeBlockIndex: null,
      unlockedSections: s.unlockedSections.includes(key)
        ? s.unlockedSections
        : [...s.unlockedSections, key],
    })),
  // (Re)activating an entry resets the paragraph cursor; the rich-text editor
  // sets it again from the caret position.
  setActiveEntryId: (id) => set({ activeEntryId: id, activeBlockIndex: null }),
  setActiveBlockIndex: (index) => set({ activeBlockIndex: index }),
  setHoveredSkillId: (id) => set({ hoveredSkillId: id }),
  setSectionOrder: (order) => set({ sectionOrder: order }),
  removeSection: (key) =>
    set((s) => ({ sectionOrder: s.sectionOrder.filter((k) => k !== key) })),
  restoreSection: (key) =>
    set((s) => {
      if (s.sectionOrder.includes(key)) return {};
      // Slot it back where the default layout puts it, so a restored section
      // does not land at the bottom of the resume.
      const home = DEFAULT_SECTION_ORDER.indexOf(key);
      if (home < 0) return { sectionOrder: [...s.sectionOrder, key] };
      const before = DEFAULT_SECTION_ORDER.slice(0, home);
      const at = s.sectionOrder.findIndex((k) => !before.includes(k));
      const next = [...s.sectionOrder];
      next.splice(at < 0 ? next.length : at, 0, key);
      return { sectionOrder: next };
    }),
  reorderSections: (fromKey, toKey) =>
    set((s) => {
      // Same pinning rules as moveSection: only the middle band reorders.
      const LEADING: SectionKey[] = ["personal", "contact"];
      const TRAILING: SectionKey[] = ["summary"];
      const order = s.sectionOrder;
      const movable = order.filter(
        (k) => !LEADING.includes(k) && !TRAILING.includes(k)
      );
      const from = movable.indexOf(fromKey);
      const to = movable.indexOf(toKey);
      if (from < 0 || to < 0 || from === to) return {};
      const next = [...movable];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      const leading = order.filter((k) => LEADING.includes(k));
      const trailing = order.filter((k) => TRAILING.includes(k));
      return { sectionOrder: [...leading, ...next, ...trailing] };
    }),
  moveSection: (key, dir) =>
    set((s) => {
      // personal/contact are pinned to the top, summary to the bottom; only the
      // sections between them reorder.
      const LEADING: SectionKey[] = ["personal", "contact"];
      const TRAILING: SectionKey[] = ["summary"];
      const order = s.sectionOrder;
      const movable = order.filter(
        (k) => !LEADING.includes(k) && !TRAILING.includes(k)
      );
      const i = movable.indexOf(key);
      if (i < 0) return {};
      const j = dir === "up" ? i - 1 : i + 1;
      if (j < 0 || j >= movable.length) return {};
      const next = [...movable];
      [next[i], next[j]] = [next[j], next[i]];
      const leading = order.filter((k) => LEADING.includes(k));
      const trailing = order.filter((k) => TRAILING.includes(k));
      return { sectionOrder: [...leading, ...next, ...trailing] };
    }),

  // Loading a resume into the editor (upload / open / duplicate) restarts the
  // guided flow at the first section, so the nav unlocks step by step again, and
  // marks the resume as imported (its details came from a parsed source) so the
  // "Import from LinkedIn" banner stays hidden. reset() below is the from-scratch
  // path and leaves importedResume false, so the banner shows there.
  hydrate: (data) =>
    set((s) => {
      const merged = { ...s, ...withUniqueIds(data), importedResume: true };
      return {
        ...merged,
        // An imported resume arrives complete, so every parsed section is
        // immediately reachable and editable - exactly like opening a saved
        // draft (see loadDocument). This includes the custom "extra" sections
        // lifted from the upload (Projects, Certifications, Internships, ...),
        // which would otherwise sit locked and invisible behind the guided
        // flow. A from-scratch resume still starts guided: it uses reset()
        // (unlockedSections: ["personal"]), never hydrate().
        unlockedSections: [...merged.sectionOrder],
      };
    }),
  reset: () => set({ ...emptyResume(), id: newResumeId() }),
  loadDocument: (id, data) =>
    set((s) => {
      // Defensive: a legacy/corrupted record may arrive with `data` as a JSON
      // string (double- or triple-encoded on the server) instead of an object.
      // Spreading a string would blank the editor, so decode it back to an
      // object first - looping since some rows were re-saved while corrupted.
      let decoded: unknown = data;
      for (let i = 0; i < 6 && typeof decoded === "string"; i++) {
        try {
          decoded = JSON.parse(decoded);
        } catch {
          decoded = {};
          break;
        }
      }
      const doc = (
        decoded && typeof decoded === "object" ? decoded : {}
      ) as Partial<ResumeState>;
      const merged = { ...s, ...withUniqueIds(doc), id, importedResume: true };
      return {
        ...merged,
        // Reset the summary basis: a freshly loaded resume has no applied-summary
        // baseline yet, so the "resume changed" prompt starts clean per resume.
        summaryBasis: "",
        // A saved resume is fully accessible: unlock every section so the sidebar
        // lists them all as navigable with data-driven status dots, rather than
        // relocking it into the guided flow (only "personal" reachable) as a
        // fresh/uploaded resume does.
        unlockedSections: [...merged.sectionOrder],
      };
    }),
    }),
    {
      name: "resume-co:resume",
      storage: createJSONStorage(() => safeLocalStorage),
      // Don't restore the transient UI cursor - always open on the first section.
      partialize: ({
        activeSection: _activeSection,
        activeEntryId: _activeEntryId,
        activeBlockIndex: _activeBlockIndex,
        hoveredSkillId: _hoveredSkillId,
        ...rest
      }) => rest,
      /**
       * Repair duplicate entry ids on EVERY rehydration, not just on a version
       * bump. A migration is one-shot: once a blob carrying two "emp-1"s is
       * stamped with the current version it would never be fixed again, and
       * React would keep warning about duplicate keys forever. Doing it in
       * `merge` means any corrupt blob self-heals the next time it is read.
       */
      merge: (persisted, current) => ({
        ...current,
        ...withUniqueIds((persisted ?? {}) as Partial<ResumeState>),
      }),
      // v1: normalise built-in order (summary last) for resumes saved earlier.
      // v2: re-pin summary to the very end (fixes orders where an additional
      //     section or a reorder pushed it out of last place).
      // v3: re-key duplicate entry ids left behind by the old reload-resetting
      //     counter (two entries could both be "emp-1"). Kept for the record;
      //     `merge` above now does this on every load.
      version: 3,
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
        if (state && version < 2 && Array.isArray(state.sectionOrder)) {
          const rest = state.sectionOrder.filter((k) => k !== "summary");
          state.sectionOrder = state.sectionOrder.includes("summary")
            ? [...rest, "summary"]
            : rest;
        }
        return state as ResumeState;
      },
    }
  )
);

/* ------------------------------------------------------------------ */
/* Progress (shared by the top bar + the Improve tab)                 */
/* ------------------------------------------------------------------ */

/** One weighted completion item shown in the progress checklist. */
export interface ProgressItem {
  key: string;
  label: string;
  weight: number;
  done: boolean;
}

// True when stripping HTML tags leaves non-empty text (a rich field has content).
const hasText = (html: string) => html.replace(/<[^>]*>/g, "").trim().length > 0;

/**
 * Fixed starting score awarded the moment the builder opens - the resume can
 * still be empty and placeholder text never counts. The earnable field items
 * below sum to 88, so a fully completed resume lands on exactly 100.
 */
export const BASE_PROGRESS = 12;

/**
 * The weighted checklist of resume fields and whether each is genuinely filled
 * in. Field-completion based (never page based): only real information the user
 * added moves the score, and it is derived purely from the current resume data
 * - so removing a value drops the points back, and editing an already complete
 * value never awards them twice. Weights mirror the observed builder logic:
 * name/title/email/summary carry the most, the first skill outweighs the next
 * two, and phone/LinkedIn/location stay optional (shown but not scored).
 */
export function getProgressItems(s: ResumeState): ProgressItem[] {
  const skillCount = s.skills.filter((sk) => sk.name.trim()).length;
  return [
    { key: "firstName", label: "Add your first name", weight: 8, done: !!s.personal.firstName.trim() },
    { key: "lastName", label: "Add your last name", weight: 8, done: !!s.personal.lastName.trim() },
    { key: "jobTitle", label: "Add the job title", weight: 10, done: !!s.personal.jobTitle.trim() },
    { key: "email", label: "Add contact email", weight: 12, done: !!s.contact.email.trim() },
    { key: "company", label: "Add your company", weight: 12, done: s.employment.some((e) => e.company.trim()) },
    { key: "achievement", label: "Add a work achievement", weight: 8, done: s.employment.some((e) => hasText(e.description)) },
    { key: "skill1", label: "Add a skill", weight: 6, done: skillCount >= 1 },
    { key: "skill2", label: "Add a second skill", weight: 4, done: skillCount >= 2 },
    { key: "skill3", label: "Add a third skill", weight: 2, done: skillCount >= 3 },
    { key: "institution", label: "Add your education", weight: 4, done: s.education.some((e) => e.institution.trim()) },
    { key: "degree", label: "Add your degree", weight: 2, done: s.education.some((e) => e.degree.trim()) },
    { key: "summary", label: "Write a summary", weight: 12, done: hasText(s.summary) },
  ];
}

/**
 * Overall completion percentage: the fixed 12% base plus the weights of every
 * completed field, clamped to 0-100. Recomputed from state on every read, so
 * the top bar and Improve tab always match the actual resume.
 */
export function getProgress(s: ResumeState): number {
  const earned = getProgressItems(s).reduce((acc, i) => acc + (i.done ? i.weight : 0), 0);
  return Math.min(100, Math.max(0, BASE_PROGRESS + earned));
}

/**
 * Does a section hold real saved data? Drives the sidebar / mobile status dots
 * (green when complete, grey when empty), independent of the guided-flow unlock
 * state - so an opened saved resume shows a green dot on every section the user
 * has actually filled, and grey only on the ones genuinely left empty.
 */
export function isSectionComplete(s: ResumeState, key: SectionKey): boolean {
  switch (key) {
    case "personal":
      return !!(
        s.personal.firstName.trim() ||
        s.personal.lastName.trim() ||
        s.personal.jobTitle.trim()
      );
    case "contact":
      return !!(
        s.contact.email.trim() ||
        s.contact.phone.trim() ||
        s.contact.location.trim() ||
        s.contact.linkedin.trim()
      );
    case "summary":
      return hasText(s.summary);
    case "employment":
      return s.employment.some(
        (e) => e.company.trim() || e.jobTitle.trim() || hasText(e.description)
      );
    case "skills":
      return s.skills.some((sk) => sk.name.trim());
    case "education":
      return s.education.some((e) => e.institution.trim() || e.degree.trim());
    default: {
      // Additional (user-added) section: courses, languages, hobbies, links, etc.
      const sec = s.additional.find((a) => a.id === key);
      return !!sec?.entries.some((e) =>
        Object.entries(e).some(
          ([field, value]) =>
            field !== "id" && typeof value === "string" && value.trim()
        )
      );
    }
  }
}

/** One actionable suggestion on the Improve page (weight = points it adds). */
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
