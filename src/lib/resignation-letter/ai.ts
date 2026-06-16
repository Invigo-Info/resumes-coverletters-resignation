"use client";

import type { ResignationLetterState } from "@/lib/store/resignation-letter-store";
import { formatLetterDate, htmlToText } from "@/lib/resignation-letter/format";
import { RL_OTHER_REASON } from "@/lib/resignation-letter/suggestions";

/**
 * Resignation-letter AI helpers. Each call hits the server-side Gemini bridge
 * (/api/ai) first and transparently falls back to a deterministic template if
 * the key is missing or the call fails — same contract as the cover letter.
 */

async function callAi<T>(task: string, payload: Record<string, unknown>): Promise<T | null> {
  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task, payload }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.fallback) return null;
    return json.data as T;
  } catch {
    return null;
  }
}

export type ResignationLetterInput = Pick<
  ResignationLetterState,
  | "fullName"
  | "employer"
  | "salutation"
  | "position"
  | "submissionDate"
  | "lastWorkingDay"
  | "reason"
  | "otherReasonText"
  | "reasonText"
  | "gratitude"
  | "gratitudeText"
  | "assistance"
  | "assistanceText"
  | "contacts"
>;

/** Resolve the human-readable reason (handles the "Other" free-text case). */
function resolveReason(input: ResignationLetterInput): string {
  if (!input.reason) return "";
  if (input.reason === RL_OTHER_REASON) return input.otherReasonText.trim();
  return input.reason;
}

function fallbackLetter(input: ResignationLetterInput): string {
  const name = input.fullName.trim() || "Sincerely";
  const company = input.employer.companyName.trim();
  const position = input.position.trim() || "my position";
  const salutation = input.salutation.trim() || "Dear Hiring Manager,";
  const lastDay = formatLetterDate(input.lastWorkingDay) || "my final working day";
  const reasonStatement = htmlToText(input.reasonText).trim();
  const reason = resolveReason(input);

  const paras: string[] = [
    salutation,
    `I am writing to formally resign from my position${position ? ` as ${position}` : ""}${
      company ? ` at ${company}` : ""
    }, with my last working day being ${lastDay}.`,
  ];

  if (reasonStatement) {
    // Use the user's edited reason paragraph verbatim.
    paras.push(reasonStatement);
  } else if (reason) {
    paras.push(
      `This decision follows a thoughtful reflection on ${reason.toLowerCase()}, and I am grateful for the understanding and support I have received.`
    );
  }
  const gratitudeStatement = htmlToText(input.gratitudeText).trim();
  if (gratitudeStatement) {
    // Use the user's edited gratitude paragraph verbatim.
    paras.push(gratitudeStatement);
  } else if (input.gratitude.length) {
    paras.push(
      `I am sincerely thankful for the ${input.gratitude
        .join(", ")
        .toLowerCase()} I experienced during my time${company ? ` at ${company}` : " here"}. It has meaningfully shaped my professional growth.`
    );
  }
  const assistanceStatement = htmlToText(input.assistanceText).trim();
  if (input.assistance && assistanceStatement) {
    // Use the user's edited assistance paragraph verbatim.
    paras.push(assistanceStatement);
  } else if (input.assistance) {
    paras.push(
      `I am happy to assist with a smooth transition over the coming weeks, whether that means training a replacement or wrapping up ongoing projects.`
    );
  }
  paras.push("Sincerely,", name);

  return paras.join("\n\n");
}

/**
 * Improve the current letter body via AI ("Improve with AI" in Write mode).
 * `text` is plain text; returns improved plain text, or null on fallback.
 */
export async function improveLetterBody(text: string, instruction: string): Promise<string | null> {
  if (!text.trim()) return null;
  const ai = await callAi<string>("improveText", { text, instruction });
  return ai && ai.trim() ? ai.trim() : null;
}

/** Generate the full resignation-letter body. Always returns text (AI or fallback). */
export async function generateResignationLetter(input: ResignationLetterInput): Promise<string> {
  const ai = await callAi<string>("resignationLetter", {
    fullName: input.fullName,
    companyName: input.employer.companyName,
    position: input.position,
    salutation: input.salutation,
    submissionDate: formatLetterDate(input.submissionDate),
    lastWorkingDay: formatLetterDate(input.lastWorkingDay),
    reason: resolveReason(input),
    reasonText: htmlToText(input.reasonText),
    gratitude: input.gratitude,
    gratitudeText: htmlToText(input.gratitudeText),
    assistance: input.assistance,
    assistanceText: htmlToText(input.assistanceText),
  });
  if (ai && ai.trim()) return ai.trim();
  return fallbackLetter(input);
}
