/**
 * Whether a resume photo should be offered, based on where the user is applying.
 *
 * US, UK, and Irish employers routinely discard resumes carrying a photo: it
 * exposes them to discrimination claims, and many applicant tracking systems
 * strip or reject them. Rather than let the user hurt their own application, the
 * photo control is hidden for those regions.
 */

/** Accepted image types for a profile photo. */
export const PHOTO_ACCEPT = ".jpg,.jpeg,.png,.webp";
export const PHOTO_MIME = ["image/jpeg", "image/png", "image/webp"];

/** Hard ceiling on the picked file (bytes). */
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/** Recommended minimum source resolution; below this we warn but still accept. */
export const PHOTO_MIN_EDGE = 300;

/**
 * Region tokens that suppress the photo field. Matched as whole words against a
 * lowercased location string, so "Dublin, Ireland" hits but "Irelandia" does not
 * and "Ohio" never matches the "oh" of anything.
 */
const NO_PHOTO_PATTERNS: RegExp[] = [
  // United States. Deliberately no bare "america" - that would swallow
  // "Latin America" and "South America".
  /\b(usa|u\.s\.a|us|u\.s|united states(?: of america)?)\b/,
  // United Kingdom + constituent countries
  /\b(uk|u\.k|united kingdom|great britain|britain|england|scotland|wales|northern ireland)\b/,
  // Ireland
  /\b(ireland|republic of ireland|eire|éire)\b/,
];

/**
 * True when the location names the US, UK, or Ireland. An empty or unrecognised
 * location returns false - we only hide the field when we are confident.
 */
export function hidesPhoto(location: string): boolean {
  const s = location.trim().toLowerCase();
  if (!s) return false;
  return NO_PHOTO_PATTERNS.some((re) => re.test(s));
}

/** Why the photo field disappeared, shown in place of the control. */
export const PHOTO_HIDDEN_REASON =
  "Photos are left off resumes for the US, UK, and Ireland. Employers there routinely reject them to avoid bias.";
