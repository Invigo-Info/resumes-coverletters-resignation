/** Filter buckets a template can belong to in the gallery. */
export type TemplateCategory =
  | "ATS-friendly"
  | "Simple"
  | "Professional"
  | "Student";

/**
 * Section-heading "skin" the live preview renders for a template, so each style
 * has its own visual signature (rule, short underline, left bar, wide caps, no
 * rule, tinted band, or double rule) beyond just color/font/column differences.
 * Defaults to "classic" when a preset omits it.
 */
export type HeadingVariant =
  | "classic"
  | "underline"
  | "bar"
  | "caps"
  | "minimal"
  | "band"
  | "serifRule";

/** Layout/style preset applied to the live preview when a template is chosen. */
export interface TemplatePreset {
  columns: "left" | "centered" | "right";
  dark: boolean;
  font: "roboto" | "georgia" | "garamond";
  color: string;
  /** Optional tinted page background (combination look). Defaults to white. */
  bg?: string;
  /** Section-heading skin (see HeadingVariant). Defaults to "classic". */
  variant?: HeadingVariant;
}

export interface ResumeTemplate {
  id: string;
  name: string;
  used: number;
  categories: TemplateCategory[];
  /** Preview image filename (e.g. "hopper.jpg"). It lives in each category folder
   *  under /public that this template belongs to, and in /public/templates. */
  file: string;
  /** Default preview image (the /public/templates copy). Category tabs load the
   *  same file from their own folder instead - see `templateImage`. */
  image: string;
  preset: TemplatePreset;
  /** Surfaced with a "Recommended" tag. Keep this to one or two templates -
   *  the point is to guide a fast decision, not to label everything. */
  recommended?: boolean;
}

/**
 * Files present in each category folder under /public. This folder membership is
 * the SOURCE OF TRUTH for the gallery: a template appears under a category tab
 * when its file is in that folder, and its preview in that tab is loaded from
 * that folder (e.g. selecting "Student" shows /Student/<file>). To add or move a
 * template between categories, drop/remove its .jpg in the matching folder and
 * mirror it here.
 */
export const CATEGORY_FILES: Record<TemplateCategory, string[]> = {
  "ATS-friendly": [
    "ampere.jpg", "bentz.jpg", "curie.jpg", "feynman.jpg", "ford.jpg",
    "hopper.jpg", "ive.jpg", "lamarr.jpg", "napoleon.jpg", "newton.jpg",
    "pharrell.jpg", "shakespeare.jpg", "stallman.jpg", "turing.jpg",
  ],
  Professional: [
    "ampere.jpg", "bentz.jpg", "curie.jpg", "hopper.jpg", "lamarr.jpg", "newton.jpg",
  ],
  Simple: [
    "feynman.jpg", "hopper.jpg", "ive.jpg", "napoleon.jpg", "newton.jpg",
    "stallman.jpg", "turing.jpg",
  ],
  Student: [
    "feynman.jpg", "hopper.jpg", "ive.jpg", "newton.jpg", "stallman.jpg", "turing.jpg",
  ],
};

/** Category folders, in the gallery's display order. */
const CATEGORY_ORDER: TemplateCategory[] = [
  "ATS-friendly",
  "Simple",
  "Professional",
  "Student",
];

/** Which category folders contain a given file. */
function categoriesForFile(file: string): TemplateCategory[] {
  return CATEGORY_ORDER.filter((c) => CATEGORY_FILES[c].includes(file));
}

/** Core template data; `categories` and `image` are derived from the folders. */
type BaseTemplate = Omit<ResumeTemplate, "categories" | "image">;

/** The template gallery, mirroring resume.co's "ATS-friendly" set. */
const BASE_TEMPLATES: BaseTemplate[] = [
  { id: "clear-ats", name: "Clear ATS", used: 3847, file: "hopper.jpg", preset: { columns: "centered", dark: false, font: "georgia", color: "#111827", variant: "serifRule" }, recommended: true },
  { id: "professional", name: "Professional", used: 2156, file: "lamarr.jpg", preset: { columns: "left", dark: true, font: "roboto", color: "#0f766e", variant: "bar" } },
  { id: "leadership", name: "Leadership", used: 4523, file: "napoleon.jpg", preset: { columns: "centered", dark: false, font: "georgia", color: "#7c3aed", variant: "caps" } },
  { id: "strategic", name: "Strategic", used: 3291, file: "pharrell.jpg", preset: { columns: "left", dark: false, font: "roboto", color: "#2563eb", variant: "underline" } },
  { id: "specialist", name: "Specialist", used: 2734, file: "shakespeare.jpg", preset: { columns: "right", dark: false, font: "garamond", color: "#b45309", variant: "serifRule" } },
  { id: "classic-ats", name: "Classic ATS", used: 4102, file: "bentz.jpg", preset: { columns: "centered", dark: false, font: "georgia", color: "#111827", variant: "underline" } },
  { id: "minimalistic", name: "Minimalistic", used: 3588, file: "feynman.jpg", preset: { columns: "left", dark: false, font: "roboto", color: "#334155", variant: "minimal" } },
  { id: "corporate", name: "Corporate", used: 2489, file: "ampere.jpg", preset: { columns: "left", dark: true, font: "roboto", color: "#0d9488", variant: "caps" } },
  { id: "clear", name: "Clear", used: 4815, file: "stallman.jpg", preset: { columns: "right", dark: false, font: "roboto", color: "#334155", variant: "bar" }, recommended: true },
  { id: "simple", name: "Simple", used: 3142, file: "ive.jpg", preset: { columns: "centered", dark: false, font: "garamond", color: "#111827", variant: "minimal" } },
  { id: "functional", name: "Functional", used: 2673, file: "ford.jpg", preset: { columns: "centered", dark: false, font: "roboto", color: "#0e7490", bg: "#e3f1f4", variant: "band" } },
  { id: "balanced", name: "Balanced", used: 4367, file: "newton.jpg", preset: { columns: "right", dark: true, font: "roboto", color: "#2563eb", variant: "underline" } },
  { id: "essential", name: "Essential", used: 3924, file: "turing.jpg", preset: { columns: "right", dark: false, font: "georgia", color: "#0f766e", bg: "#e7f3ee", variant: "serifRule" } },
  { id: "executive", name: "Executive", used: 2891, file: "curie.jpg", preset: { columns: "centered", dark: false, font: "georgia", color: "#1e3a8a", variant: "band" } },
  // Additional ATS-optimized styles: single-column, light, standard fonts and
  // clear heading rules - the layout ATS parsers read most reliably. Each has a
  // distinct color/font/heading skin so the live carousel thumbnail reads apart.
  // (They reuse existing ATS-friendly preview files for the gallery/fallback;
  // the Design-tab carousel renders them live from the preset.)
  { id: "ats-modern", name: "ATS Modern", used: 4210, file: "hopper.jpg", preset: { columns: "centered", dark: false, font: "roboto", color: "#0f172a", variant: "underline" } },
  { id: "ats-classic", name: "ATS Classic", used: 3760, file: "bentz.jpg", preset: { columns: "centered", dark: false, font: "georgia", color: "#111827", variant: "classic" } },
  { id: "ats-minimal", name: "ATS Minimal", used: 3980, file: "feynman.jpg", preset: { columns: "left", dark: false, font: "roboto", color: "#1f2937", variant: "minimal" } },
  { id: "ats-professional", name: "ATS Professional", used: 4480, file: "lamarr.jpg", preset: { columns: "centered", dark: false, font: "roboto", color: "#1e3a8a", variant: "bar" } },
  { id: "ats-executive", name: "ATS Executive", used: 3120, file: "curie.jpg", preset: { columns: "centered", dark: false, font: "georgia", color: "#0f766e", variant: "caps" } },
  { id: "ats-elegant", name: "ATS Elegant", used: 3350, file: "turing.jpg", preset: { columns: "left", dark: false, font: "garamond", color: "#111827", variant: "serifRule" } },
];

/** The templates, with categories + default image derived from the folders. */
export const templates: ResumeTemplate[] = BASE_TEMPLATES.map((t) => ({
  ...t,
  categories: categoriesForFile(t.file),
  image: `/templates/${t.file}`,
}));

/**
 * Preview image for a template in a given category tab. In a category tab the
 * image is loaded from that category's /public folder; "All templates" (no
 * category) uses the default /templates copy.
 */
export function templateImage(
  t: ResumeTemplate,
  category?: TemplateCategory
): string {
  if (category && CATEGORY_FILES[category]?.includes(t.file)) {
    return `/${category}/${t.file}`;
  }
  return t.image;
}

/**
 * Pre-selected when the user arrives with no template chosen yet. This is the
 * one source of truth for that default - `resume-store`'s empty resume seeds
 * `templateId` from it, so the gallery's check mark and the live preview can
 * never disagree.
 */
export const DEFAULT_TEMPLATE_ID = "clear-ats";

/** Look up a template by id (undefined if unknown). */
export function getTemplate(id: string): ResumeTemplate | undefined {
  return templates.find((t) => t.id === id);
}

/** True when a template is safe to run through applicant tracking systems. */
export function isAtsFriendly(t: ResumeTemplate): boolean {
  return t.categories.includes("ATS-friendly");
}

/** Tab labels for the gallery filter bar ("All" plus each category). */
export const templateTabs: ("All templates" | TemplateCategory)[] = [
  "All templates",
  "ATS-friendly",
  "Simple",
  "Professional",
  "Student",
];
