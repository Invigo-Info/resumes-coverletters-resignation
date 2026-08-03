import type { ResignationLetterState } from "@/features/resignation-letter/store/resignation-letter-store";
import { bodyToHtml, formatLetterDate, htmlToText } from "./format";

/** Split an HTML/plain paragraph field into trimmed, non-empty paragraphs. */
function paragraphs(text: string): string[] {
  return htmlToText(text)
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * Deterministically assemble the resignation-letter body (HTML) from the live
 * builder inputs and the enriched reason/gratitude/assistance paragraphs. Used
 * to keep a generated letter in sync when the user edits a structured field
 * (name, employer, position, dates, ...), as long as they have not taken manual
 * control of the body text.
 */
export function composeLetterBody(s: ResignationLetterState): string {
  const name = s.fullName.trim();
  const company = s.employer.companyName.trim();
  const position = s.position.trim();
  const manager = s.employer.managerName.trim();
  const salutation =
    s.salutation.trim() || (manager ? `Dear ${manager},` : "Dear Hiring Manager,");
  const lastDay = formatLetterDate(s.lastWorkingDay) || "my final working day";

  const out: string[] = [salutation];
  out.push(
    `I am writing to formally resign from my position${position ? ` as ${position}` : ""}${
      company ? ` at ${company}` : ""
    }, with my last working day being ${lastDay}.`
  );
  out.push(...paragraphs(s.reasonText));
  out.push(...paragraphs(s.gratitudeText));
  if (s.assistance) out.push(...paragraphs(s.assistanceText));
  out.push("Sincerely,");
  if (name) out.push(name);

  return bodyToHtml(out.join("\n\n"));
}
