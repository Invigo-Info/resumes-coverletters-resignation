export type TemplateCategory =
  | "ATS-friendly"
  | "Simple"
  | "Professional"
  | "Student";

/** Layout/style preset applied to the live preview when a template is chosen. */
export interface TemplatePreset {
  columns: "left" | "centered" | "right";
  dark: boolean;
  font: "roboto" | "georgia" | "garamond";
  color: string;
  /** Optional tinted page background (combination look). Defaults to white. */
  bg?: string;
}

export interface ResumeTemplate {
  id: string;
  name: string;
  used: number;
  categories: TemplateCategory[];
  /** Real preview image in /public/templates. */
  image: string;
  preset: TemplatePreset;
}

/** The template gallery, mirroring resume.co's "ATS-friendly" set. */
export const templates: ResumeTemplate[] = [
  { id: "clear-ats", name: "Clear ATS", used: 3847, categories: ["ATS-friendly", "Simple"], image: "/templates/hopper.jpg", preset: { columns: "centered", dark: false, font: "georgia", color: "#111827" } },
  { id: "professional", name: "Professional", used: 2156, categories: ["Professional"], image: "/templates/lamarr.jpg", preset: { columns: "left", dark: true, font: "roboto", color: "#0f766e" } },
  { id: "leadership", name: "Leadership", used: 4523, categories: ["Professional"], image: "/templates/napoleon.jpg", preset: { columns: "centered", dark: false, font: "georgia", color: "#7c3aed" } },
  { id: "strategic", name: "Strategic", used: 3291, categories: ["Professional", "ATS-friendly"], image: "/templates/pharrell.jpg", preset: { columns: "left", dark: false, font: "roboto", color: "#2563eb" } },
  { id: "specialist", name: "Specialist", used: 2734, categories: ["Professional"], image: "/templates/shakespeare.jpg", preset: { columns: "right", dark: false, font: "garamond", color: "#b45309" } },
  { id: "classic-ats", name: "Classic ATS", used: 4102, categories: ["ATS-friendly", "Simple"], image: "/templates/bentz.jpg", preset: { columns: "centered", dark: false, font: "roboto", color: "#0f172a" } },
  { id: "minimalistic", name: "Minimalistic", used: 3588, categories: ["Simple", "Student"], image: "/templates/feynman.jpg", preset: { columns: "left", dark: false, font: "roboto", color: "#334155" } },
  { id: "corporate", name: "Corporate", used: 2489, categories: ["Professional"], image: "/templates/ampere.jpg", preset: { columns: "left", dark: true, font: "roboto", color: "#0d9488" } },
  { id: "clear", name: "Clear", used: 4815, categories: ["ATS-friendly", "Simple"], image: "/templates/stallman.jpg", preset: { columns: "right", dark: false, font: "roboto", color: "#334155" } },
  { id: "simple", name: "Simple", used: 3142, categories: ["Simple", "Student"], image: "/templates/ive.jpg", preset: { columns: "centered", dark: false, font: "garamond", color: "#111827" } },
  { id: "functional", name: "Functional", used: 2673, categories: ["ATS-friendly"], image: "/templates/ford.jpg", preset: { columns: "centered", dark: false, font: "roboto", color: "#0e7490", bg: "#e3f1f4" } },
  { id: "balanced", name: "Balanced", used: 4367, categories: ["Professional"], image: "/templates/newton.jpg", preset: { columns: "right", dark: true, font: "roboto", color: "#2563eb" } },
  { id: "essential", name: "Essential", used: 3924, categories: ["Simple", "Student"], image: "/templates/turing.jpg", preset: { columns: "right", dark: false, font: "georgia", color: "#0f766e", bg: "#e7f3ee" } },
  { id: "executive", name: "Executive", used: 2891, categories: ["Professional"], image: "/templates/curie.jpg", preset: { columns: "centered", dark: false, font: "georgia", color: "#1e3a8a" } },
];

export function getTemplate(id: string): ResumeTemplate | undefined {
  return templates.find((t) => t.id === id);
}

export const templateTabs: ("All templates" | TemplateCategory)[] = [
  "All templates",
  "ATS-friendly",
  "Simple",
  "Professional",
  "Student",
];
