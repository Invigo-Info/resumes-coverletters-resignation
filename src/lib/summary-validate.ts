/**
 * Lightweight, high-precision validator for a generated Professional Summary.
 *
 * It does not try to judge writing quality - it only catches the factual/trust
 * failures the spec forbids and that a resume tool must never ship: unsupported
 * puffery, a stated experience number that the trusted calculation does not
 * support, and percentage/currency figures that appear nowhere in the resume
 * evidence. Findings feed a single AI "repair" pass. Intentionally conservative
 * (only flags high-confidence problems) so it never rewrites correct output.
 */

import type { ComputedExperience } from "./experience";

/** Puffery / unsupported-claim phrases that must not appear (spec banned list). */
const BANNED_PHRASES: string[] = [
  "visionary",
  "world-class",
  "world class",
  "guru",
  "ninja",
  "rockstar",
  "rock star",
  "expert in everything",
  "proven track record",
  "highly accomplished",
  "award-winning",
  "award winning",
  "industry-leading",
  "industry leading",
  "results that speak for themselves",
  "consistently exceeded targets",
  "consistently exceeded expectations",
  "delivered measurable results",
  "second to none",
  "unparalleled",
  "best-in-class",
  "best in class",
];

export interface SummaryIssue {
  kind: "buzzword" | "years" | "unsupported-number";
  detail: string;
}

/** Digits with the surrounding thousands separators, e.g. "35", "1,200". */
const NUM = String.raw`\d[\d,]*`;

/**
 * Validate a summary against the resume evidence and the trusted experience.
 *
 * @param summary        the generated summary text (plain text)
 * @param evidenceText   all resume text the summary may draw on (bullets, skills,
 *                       education) - lowercased comparison source
 * @param computed       the authoritative years-of-experience figure
 */
export function validateSummary(
  summary: string,
  evidenceText: string,
  computed: ComputedExperience
): SummaryIssue[] {
  const issues: SummaryIssue[] = [];
  const lower = summary.toLowerCase();
  const evidence = evidenceText.toLowerCase();

  // 1) Banned puffery.
  for (const phrase of BANNED_PHRASES) {
    if (lower.includes(phrase)) {
      issues.push({ kind: "buzzword", detail: `Remove the unsupported phrase "${phrase}".` });
    }
  }

  // 2) Stated years of experience must match the trusted figure.
  const yearsMatch = lower.match(new RegExp(`(${NUM})\\s*\\+?\\s*years?`));
  if (yearsMatch) {
    const stated = Number(yearsMatch[1].replace(/,/g, ""));
    if (computed.displayStyle === "omit" || computed.relevantYears == null) {
      issues.push({
        kind: "years",
        detail:
          "Do not state a number of years of experience - the resume dates do not establish one. Use early-career wording instead.",
      });
    } else if (stated > computed.relevantYears) {
      issues.push({
        kind: "years",
        detail: `Change the stated experience to ${computed.relevantYears} years (the resume dates support ${computed.relevantYears}, not ${stated}).`,
      });
    }
  }

  // 3) Percentage and currency figures must appear in the resume evidence.
  const figures = summary.match(new RegExp(`${NUM}\\s*%|\\$\\s*${NUM}`, "g")) ?? [];
  for (const fig of figures) {
    const digits = fig.replace(/[^\d]/g, "");
    if (digits && !evidence.replace(/[^\d]/g, " ").split(/\s+/).includes(digits)) {
      issues.push({
        kind: "unsupported-number",
        detail: `Remove the figure "${fig.trim()}" - it does not appear in the resume data.`,
      });
    }
  }

  return issues;
}

/** Build the correction block appended to a repair request when issues are found. */
export function repairInstruction(issues: SummaryIssue[]): string {
  const lines = issues.map((i) => `- ${i.detail}`).join("\n");
  return `The previous summary had these problems that MUST be fixed:\n${lines}\n\nRewrite the summary fixing every point above. Keep all supported facts, the same length, third person, no pronouns, and plain prose. Do not introduce any new number, tool, employer, achievement, or claim.`;
}
