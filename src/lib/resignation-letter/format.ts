/** Date + letter-text helpers for the resignation-letter feature. */

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2026-04-14" → "April 14, 2026". Returns "" for empty/invalid input. */
export function formatLetterDate(iso: string): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return "";
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const day = Number(m[3]);
  if (month < 0 || month > 11) return "";
  return `${MONTHS[month]} ${day}, ${year}`;
}

/** A JS Date → "2026-04-14" (local, no timezone shift). */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * The single live-preview sentence shown in the builder before AI generation
 * (matches Step 2–8.png — stays generic, does not inject the position).
 */
export function previewOpeningLine(lastWorkingDayIso: string): string {
  const last = formatLetterDate(lastWorkingDayIso) || "your last day";
  return `I am writing to formally resign from my position, with my last working day being ${last}.`;
}

/**
 * Wrap plain text into paragraph HTML for the preview/editor. Passes through
 * if the text already looks like HTML. (Mirrors the cover-letter format util.)
 */
export function bodyToHtml(text: string): string {
  if (!text) return "";
  if (/<\w+[\s>]/.test(text)) return text;
  return text
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

// Escape HTML-significant characters so plain-text input can't inject markup.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Flatten preview/editor HTML back to plain text with paragraph breaks. */
export function htmlToText(html: string): string {
  if (!html) return "";
  return html
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
