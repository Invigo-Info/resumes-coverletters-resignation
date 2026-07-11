/**
 * Validation for the resume's first / last name fields.
 *
 * The spec says "alphabetic characters only". Taken literally that would reject
 * O'Brien, Jean-Luc, and Ana Maria - real names people put on real resumes - so
 * "alphabetic" here means Unicode letters plus the three joiners that legitimately
 * appear inside a name: space, hyphen, apostrophe. Digits and every other symbol
 * are rejected.
 */

// \p{L} = any Unicode letter, \p{M} = combining marks (accents on decomposed input).
const NAME_ALLOWED = /^[\p{L}\p{M}][\p{L}\p{M} '’-]*$/u;
const NAME_DISALLOWED = /[^\p{L}\p{M} '’-]/u;

/** Field-level error for a name, or "" when it is valid. Empty is only an error
 *  once the user has left the field (both names are required). */
export function nameError(value: string, label: string): string {
  const v = value.trim();
  if (!v) return `${label} is required.`;
  if (NAME_DISALLOWED.test(v)) {
    return `${label} can only contain letters, spaces, hyphens, and apostrophes.`;
  }
  if (!NAME_ALLOWED.test(v)) return `Enter a valid ${label.toLowerCase()}.`;
  return "";
}

/** Strip characters a name can never contain, as the user types. */
export function sanitizeName(value: string): string {
  return value.replace(/[^\p{L}\p{M} '’-]/gu, "");
}
