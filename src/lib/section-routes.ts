/**
 * URL <-> internal step/section mapping for the three multi-step "write" flows.
 *
 * Each flow exposes a clean, shareable URL per step:
 *   Resume              /resumes/write/<slug>            e.g. /resumes/write/work
 *   Cover letter        /cover-letters/write/<slug>      e.g. /cover-letters/write/skills
 *   Resignation letter  /resignation-letters/write/<slug>
 *
 * The slug is the public, human-readable segment; the store key is the internal
 * identifier the editor logic uses. They differ only where the product copy and
 * the internal model disagree (resume "work" -> "employment").
 */

/* ------------------------------------------------------------------ Resume */

export const RESUME_WRITE_BASE = "/resumes/write";

const RESUME_SLUG_TO_KEY: Record<string, string> = {
  personal: "personal",
  contact: "contact",
  work: "employment",
  education: "education",
  skills: "skills",
  summary: "summary",
};

const RESUME_KEY_TO_SLUG: Record<string, string> = {
  personal: "personal",
  contact: "contact",
  employment: "work",
  education: "education",
  skills: "skills",
  summary: "summary",
};

export const RESUME_FIRST_SLUG = "personal";

/** Map a URL slug to the resume store's section key, or null if unknown. */
export function resumeKeyFromSlug(slug: string): string | null {
  return RESUME_SLUG_TO_KEY[slug] ?? null;
}

/** Map a resume section key to its URL slug, or null if it isn't routable. */
export function resumeSlugFromKey(key: string): string | null {
  return RESUME_KEY_TO_SLUG[key] ?? null;
}

/* ------------------------------------------------------------ Cover letter */

export const COVER_LETTER_WRITE_BASE = "/cover-letters/write";
export const COVER_LETTER_FIRST_SLUG = "intent";

// Cover-letter store steps already read as URL-friendly slugs, so the mapping is
// identity for every step the user can actually edit (generate/preview are
// terminal and live on the dedicated preview route).
const COVER_LETTER_STEPS = [
  "intent",
  "job-details",
  "desired-title",
  "skills",
  "experience",
  "recent-job",
  "education",
  "degree",
  "field",
  "strengths",
  "personal",
] as const;

/** True if the slug is an editable cover-letter step (routable). */
export function isCoverLetterSlug(slug: string): boolean {
  return (COVER_LETTER_STEPS as readonly string[]).includes(slug);
}

/* ------------------------------------------------------ Resignation letter */

export const RESIGNATION_WRITE_BASE = "/resignation-letters/write";
export const RESIGNATION_FIRST_SLUG = "heading";

const RESIGNATION_STEPS = [
  "heading",
  "recipient",
  "position",
  "reason",
  "gratitude",
  "assistance",
  "contacts",
] as const;

/** True if the slug is a valid resignation-letter step (routable). */
export function isResignationSlug(slug: string): boolean {
  return (RESIGNATION_STEPS as readonly string[]).includes(slug);
}
