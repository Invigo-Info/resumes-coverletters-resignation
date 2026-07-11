/**
 * Validation and formatting for the contact section's email and phone fields.
 *
 * Both fields are optional on a resume, so an empty value is never an error.
 * Once the user types something, it has to be plausibly reachable - a recruiter
 * cannot email "john@gmail" or dial a 4-digit number.
 */

/* -------------------------------- email --------------------------------- */

// Deliberately not RFC 5322. That regex is famously unusable and still accepts
// addresses no mail server will route. This checks the shape a human expects:
// something, an @, a domain with a dot, and a 2+ letter TLD.
const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[a-z]{2,}$/i;

/** Personal-email domains that read as less professional on a resume. */
const CASUAL_DOMAINS = ["hotmail.com", "aol.com", "yahoo.com", "live.com", "msn.com"];

/** Field error for an email, or "" when valid (or empty). */
export function emailError(value: string): string {
  const v = value.trim();
  if (!v) return "";
  if (!v.includes("@")) return "Email must include an @ sign.";
  if (!EMAIL.test(v)) return "Enter a valid email, like john.doe@gmail.com.";
  return "";
}

/** Non-blocking nudge shown under a valid email, or "" when there is nothing to say. */
export function emailHint(value: string): string {
  const domain = value.trim().toLowerCase().split("@")[1];
  if (!domain) return "";
  if (CASUAL_DOMAINS.includes(domain)) {
    return "A firstname.lastname address reads more professional to recruiters.";
  }
  return "";
}

/* -------------------------------- phone --------------------------------- */

/**
 * Dial codes we can format for, longest-first so "+1" never shadows a longer
 * code that happens to start with 1. `groups` describes the digit grouping
 * applied after the country code.
 */
const COUNTRIES: { code: string; name: string; groups: number[] }[] = [
  { code: "+971", name: "UAE", groups: [2, 3, 4] },
  { code: "+353", name: "Ireland", groups: [2, 3, 4] },
  { code: "+352", name: "Luxembourg", groups: [3, 3, 3] },
  { code: "+91", name: "India", groups: [5, 5] },
  { code: "+86", name: "China", groups: [3, 4, 4] },
  { code: "+81", name: "Japan", groups: [2, 4, 4] },
  { code: "+65", name: "Singapore", groups: [4, 4] },
  { code: "+61", name: "Australia", groups: [1, 4, 4] },
  { code: "+55", name: "Brazil", groups: [2, 5, 4] },
  { code: "+49", name: "Germany", groups: [3, 4, 4] },
  { code: "+44", name: "United Kingdom", groups: [2, 4, 4] },
  { code: "+39", name: "Italy", groups: [3, 3, 4] },
  { code: "+34", name: "Spain", groups: [3, 3, 3] },
  { code: "+33", name: "France", groups: [1, 2, 2, 2, 2] },
  { code: "+31", name: "Netherlands", groups: [2, 4, 4] },
  { code: "+27", name: "South Africa", groups: [2, 3, 4] },
  { code: "+1", name: "US / Canada", groups: [3, 3, 4] },
];

/** The country whose dial code this number starts with, or null. */
export function detectCountry(value: string): { code: string; name: string } | null {
  const v = value.replace(/[^\d+]/g, "");
  const hit = COUNTRIES.find((c) => v.startsWith(c.code));
  return hit ? { code: hit.code, name: hit.name } : null;
}

/**
 * Strip everything a phone number cannot contain, keeping a single leading `+`.
 * Run on every keystroke so the field can never hold junk.
 */
export function sanitizePhone(value: string): string {
  const plus = value.trimStart().startsWith("+");
  const digits = value.replace(/[^\d]/g, "");
  return (plus ? "+" : "") + digits;
}

/**
 * Group the digits for readability: "+13052062368" -> "+1 305 206 2368".
 * An unrecognised country code falls back to groups of three, and a number with
 * no `+` is left alone so local formats the user knows are not mangled.
 */
export function formatPhone(value: string): string {
  const v = sanitizePhone(value);
  if (!v.startsWith("+")) return v;

  const country = COUNTRIES.find((c) => v.startsWith(c.code));
  const code = country?.code ?? v.slice(0, 2);
  let rest = v.slice(code.length);
  if (!rest) return code;

  const groups = country?.groups ?? [];
  const parts: string[] = [];
  for (const size of groups) {
    if (!rest) break;
    parts.push(rest.slice(0, size));
    rest = rest.slice(size);
  }
  // Anything past the known grouping (or an unknown country) goes in threes.
  while (rest) {
    parts.push(rest.slice(0, 3));
    rest = rest.slice(3);
  }
  return `${code} ${parts.join(" ")}`.trim();
}

/**
 * Field error for a phone number, or "" when valid (or empty).
 * E.164 allows 1 to 15 digits total; below 7 nothing real is dialable.
 */
export function phoneError(value: string): string {
  const v = sanitizePhone(value);
  if (!v) return "";
  const digits = v.replace(/\D/g, "");
  if (digits.length < 7) return "That number looks too short. Include the area code.";
  if (digits.length > 15) return "That number is too long. Phone numbers hold at most 15 digits.";
  if (v.startsWith("+") && !detectCountry(v)) {
    return "We don't recognise that country code. Check the digits after the plus sign.";
  }
  return "";
}

/* ------------------------------- linkedin -------------------------------- */

/** True once the value looks like a LinkedIn profile (URL or bare username). */
export function isLinkedInProfile(value: string): boolean {
  const v = value.trim().toLowerCase();
  if (!v) return false;
  return /(^|\/\/|\.)linkedin\.com\/(in|pub)\/[^/\s]+/.test(v);
}
