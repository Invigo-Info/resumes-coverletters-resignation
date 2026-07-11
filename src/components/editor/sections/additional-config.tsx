import {
  Briefcase,
  Award,
  MessageSquareQuote,
  Globe,
  Link2,
  Gamepad2,
  Code2,
  type LucideIcon,
} from "lucide-react";
import type { AdditionalType } from "@/lib/store/resume-store";

/** Which control renders an additional-section field. */
export type FieldType =
  | "text"
  | "rich"
  | "select"
  | "monthYear"
  | "autocomplete";

/** Declarative spec for one field in an additional section's form. */
export interface FieldDef {
  key: string;
  label: string;
  placeholder?: string;
  type?: FieldType;
  /** Grid span out of 12. */
  span?: number;
  options?: string[];
  /** monthYear: offer a "Present" choice. */
  present?: boolean;
  /**
   * monthYear: the entry key holding the earliest selectable month, so an end
   * date cannot be set before its start date. Independent of `present` - a
   * picker without "Present" still needs the floor.
   */
  minKey?: string;
  /** autocomplete: which static suggestion list to use. */
  suggest?: "jobTitle" | "location" | "institution";
  /** Capitalize each word as the user types (job titles, institutions). */
  titleCase?: boolean;
  /**
   * Validate the value and show an inline error. "phone" also sanitizes on
   * every keystroke and reformats on blur, exactly like Contact information.
   */
  validate?: "email" | "phone" | "url";
  /** Flag an empty value once the user has visited and left the field. */
  required?: boolean;
}

/** Per-section-type configuration: label, icon, copy, and its field layout. */
export interface AdditionalConfig {
  label: string;
  icon: LucideIcon;
  title: string; // default section title
  description: string;
  addLabel: string;
  single?: boolean; // hobbies: one rich body, no repeats
  /** Field keys joined with ", " to build an entry card's header. */
  titleKeys: string[];
  /** Field keys joined with " - " under the header (usually a date range). */
  subtitleKeys?: string[];
  fields: FieldDef[];
}

/** Language proficiency options for the Languages section's select field. */
export const PROFICIENCY_LEVELS = [
  "Not applicable",
  "Novice (A1-A2)",
  "Proficient (B1-B2)",
  "Highly proficient (C1-C2)",
  "Native",
];

/**
 * Single source of truth for every additional section type - drives the picker,
 * the rendered form fields, and the default titles/copy.
 */
export const ADDITIONAL_CONFIG: Record<AdditionalType, AdditionalConfig> = {
  internships: {
    label: "Internships",
    icon: Briefcase,
    title: "Internships",
    description: "List internships that demonstrate your relevant experience and skills.",
    addLabel: "Add one more internship",
    titleKeys: ["jobTitle", "company"],
    subtitleKeys: ["startDate", "endDate"],
    fields: [
      { key: "jobTitle", label: "Job title", placeholder: "e.g., Product Designer", span: 6, type: "autocomplete", suggest: "jobTitle", titleCase: true },
      { key: "company", label: "Company name", placeholder: "e.g., Apple Inc.", span: 6 },
      { key: "startDate", label: "Start date", placeholder: "Jan 2016", span: 4, type: "monthYear" },
      { key: "endDate", label: "End date", placeholder: "Feb 2019", span: 4, type: "monthYear", present: true, minKey: "startDate" },
      { key: "location", label: "Location", placeholder: "e.g., Austin, TX", span: 4, type: "autocomplete", suggest: "location" },
      { key: "description", label: "", type: "rich", placeholder: "• Describe numbers or concrete outcomes when you can\n• Emphasize skills and tools that matter for your target job", span: 12 },
    ],
  },
  courses: {
    label: "Courses",
    icon: Award,
    title: "Courses",
    description: "Use this section for courses and certifications to support your skills for the role.",
    addLabel: "Add one more course",
    titleKeys: ["course", "institution"],
    subtitleKeys: ["startDate", "endDate"],
    fields: [
      // Equal thirds, like Education: at span 3 a date cell is 100px and
      // "Jan 2016" needs 60px of the 56px it gets, so the year gets cut.
      { key: "institution", label: "Institution", placeholder: "Harvard University", span: 4 },
      { key: "startDate", label: "Start date", placeholder: "Jan 2016", span: 4, type: "monthYear" },
      { key: "endDate", label: "End date", placeholder: "Feb 2019", span: 4, type: "monthYear", minKey: "startDate" },
      { key: "course", label: "Course", placeholder: "e.g., Advanced Product Design", span: 12, titleCase: true },
    ],
  },
  references: {
    label: "References",
    icon: MessageSquareQuote,
    title: "References",
    description: "References are usually requested later, but you may list 1-2 relevant contacts here.",
    addLabel: "Add one more reference",
    // The name is the card's headline; the company sits under it as a subtitle,
    // so a collapsed list of references stays scannable.
    titleKeys: ["name"],
    subtitleKeys: ["company"],
    fields: [
      { key: "name", label: "Referent name", placeholder: "John Smith", span: 6 },
      { key: "company", label: "Referent company", placeholder: "Apple", span: 6 },
      { key: "email", label: "Referent email", placeholder: "e.g., john@example.com", span: 6, validate: "email" },
      { key: "phone", label: "Referent phone", placeholder: "e.g., +1 305 206 2368", span: 6, validate: "phone", required: true },
    ],
  },
  languages: {
    label: "Languages",
    icon: Globe,
    title: "Languages",
    description: "Include languages you can work in if relevant to the role.",
    addLabel: "Add one more language",
    titleKeys: ["language"],
    subtitleKeys: ["proficiency"],
    fields: [
      { key: "language", label: "Language", placeholder: "English", span: 6 },
      { key: "proficiency", label: "Proficiency", type: "select", placeholder: "Proficiency level", options: PROFICIENCY_LEVELS, span: 6 },
    ],
  },
  links: {
    label: "Links",
    icon: Link2,
    title: "Links",
    description: "Include links such as your portfolio, website or socials. The link title will be clickable in your resume for potential employers to open easily.",
    addLabel: "Add one more link",
    titleKeys: ["title"],
    subtitleKeys: ["url"],
    fields: [
      { key: "title", label: "Link title", placeholder: "LinkedIn", span: 6 },
      { key: "url", label: "URL", placeholder: "https://linkedin.com/in/you", span: 6, validate: "url" },
    ],
  },
  hobbies: {
    label: "Hobbies",
    icon: Gamepad2,
    title: "Hobbies",
    description: "Use this section to highlight your interests or transferable skills. A simple list works well.",
    addLabel: "",
    single: true,
    titleKeys: ["body"],
    fields: [
      { key: "body", label: "", type: "rich", placeholder: "Photography, volunteering", span: 12 },
    ],
  },
  custom: {
    label: "Custom section",
    icon: Code2,
    title: "Custom section",
    description: "Use this custom section for anything that adds value to your resume - mentoring, publications, awards, or side projects.",
    addLabel: "Add one more",
    // The header names the item; the subheader is the context it happened in,
    // so it belongs on the card's second line rather than in its title.
    titleKeys: ["header"],
    subtitleKeys: ["subheader"],
    fields: [
      { key: "header", label: "Header", placeholder: "Conference talk", span: 6 },
      { key: "subheader", label: "Subheader", placeholder: "Marketing Summit", span: 6 },
      { key: "body", label: "", type: "rich", placeholder: "Presented a case study, led a workshop with 10 people.", span: 12 },
    ],
  },
};

/** Order of options shown in the "+ Additional section" picker. */
export const ADDITIONAL_ORDER: AdditionalType[] = [
  "internships",
  "courses",
  "references",
  "languages",
  "links",
  "hobbies",
  "custom",
];

/**
 * Types a resume may hold more than one of. Every other type is offered once:
 * a second "Languages" section would just fragment the same list. Custom is the
 * escape hatch (Volunteering, Awards, Publications…), so it never runs out.
 */
export const REPEATABLE_TYPES: ReadonlySet<AdditionalType> = new Set(["custom"]);

/**
 * Title for a newly added section. Repeatable types get a numeric suffix so two
 * of them are tellable apart in the sidebar (and have distinct accessible
 * names); the first keeps the clean, unnumbered title.
 */
export function nextSectionTitle(
  type: AdditionalType,
  existingCount: number
): string {
  const { title } = ADDITIONAL_CONFIG[type];
  if (!REPEATABLE_TYPES.has(type) || existingCount === 0) return title;
  return `${title} ${existingCount + 1}`;
}
