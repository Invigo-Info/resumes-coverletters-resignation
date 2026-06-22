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
  /** autocomplete: which static suggestion list to use. */
  suggest?: "jobTitle" | "location" | "institution";
}

/** Per-section-type configuration: label, icon, copy, and its field layout. */
export interface AdditionalConfig {
  label: string;
  icon: LucideIcon;
  title: string; // default section title
  description: string;
  addLabel: string;
  single?: boolean; // hobbies: one rich body, no repeats
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
 * Single source of truth for every additional section type — drives the picker,
 * the rendered form fields, and the default titles/copy.
 */
export const ADDITIONAL_CONFIG: Record<AdditionalType, AdditionalConfig> = {
  internships: {
    label: "Internships",
    icon: Briefcase,
    title: "Internships",
    description: "List internships that demonstrate your relevant experience and skills.",
    addLabel: "Add one more internship",
    fields: [
      { key: "jobTitle", label: "Job title", placeholder: "Account Management Intern", span: 6, type: "autocomplete", suggest: "jobTitle" },
      { key: "company", label: "Company name", placeholder: "Apple Inc.", span: 6 },
      { key: "startDate", label: "Start date", placeholder: "Jan 2016", span: 4, type: "monthYear" },
      { key: "endDate", label: "End date", placeholder: "Feb 2019", span: 4, type: "monthYear", present: true },
      { key: "location", label: "Location", placeholder: "Washington, D.C.", span: 4, type: "autocomplete", suggest: "location" },
      { key: "description", label: "", type: "rich", placeholder: "• Describe numbers or concrete outcomes when you can", span: 12 },
    ],
  },
  courses: {
    label: "Courses",
    icon: Award,
    title: "Courses",
    description: "Use this section for courses and certifications to support your skills for the role.",
    addLabel: "Add one more course",
    fields: [
      { key: "institution", label: "Institution", placeholder: "Harvard University", span: 6, type: "autocomplete", suggest: "institution" },
      { key: "startDate", label: "Start date", placeholder: "Jan 2016", span: 3, type: "monthYear" },
      { key: "endDate", label: "End date", placeholder: "Feb 2019", span: 3, type: "monthYear" },
      { key: "course", label: "Course", placeholder: "Negotiation", span: 12 },
    ],
  },
  references: {
    label: "References",
    icon: MessageSquareQuote,
    title: "References",
    description: "References are usually requested later, but you may list 1-2 relevant contacts here.",
    addLabel: "Add one more reference",
    fields: [
      { key: "name", label: "Referent name", placeholder: "John Smith", span: 6 },
      { key: "company", label: "Referent company", placeholder: "Apple", span: 6 },
      { key: "email", label: "Referent email", placeholder: "john@example.com", span: 6 },
      { key: "phone", label: "Referent phone", placeholder: "999 888 7777", span: 6 },
    ],
  },
  languages: {
    label: "Languages",
    icon: Globe,
    title: "Languages",
    description: "Include languages you can work in if relevant to the role.",
    addLabel: "Add one more language",
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
    fields: [
      { key: "title", label: "Link title", placeholder: "LinkedIn", span: 6 },
      { key: "url", label: "URL", placeholder: "https://linkedin.com/in/you", span: 6 },
    ],
  },
  hobbies: {
    label: "Hobbies",
    icon: Gamepad2,
    title: "Hobbies",
    description: "Use this section to highlight your interests or transferable skills. A simple list works well.",
    addLabel: "",
    single: true,
    fields: [
      { key: "body", label: "", type: "rich", placeholder: "Photography, volunteering", span: 12 },
    ],
  },
  custom: {
    label: "Custom section",
    icon: Code2,
    title: "Custom section",
    description: "Use this custom section for anything that adds value to your resume — mentoring, publications, awards, or side projects.",
    addLabel: "Add one more",
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
