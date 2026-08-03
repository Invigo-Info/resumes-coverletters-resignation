/**
 * Client-side guards for the Professional Summary AI, matching the spec's
 * conflict rule. When a custom "Ask AI to..." instruction demands a specific
 * number of years the resume dates do not support, we do NOT send the request
 * (the model would refuse or the validator would strip it): we surface a clear
 * conflict with a safe alternative instead. Deterministic, so no round-trip.
 */

import type { ComputedExperience } from "@/utilities/experience";

export interface YearsConflict {
  /** Years the instruction asked for. */
  requested: number;
  /** Years the resume dates actually support (null when none is established). */
  supported: number | null;
}

/** A "N years" figure inside a free-form instruction. */
const YEARS_RE = /(\d[\d,]*)\s*\+?\s*years?/i;

/**
 * Detect a custom instruction that asks for MORE years of experience than the
 * trusted calculation supports (or any specific number when none is
 * established). Returns null when there is no conflict.
 */
export function detectYearsConflict(
  instruction: string,
  computed: ComputedExperience
): YearsConflict | null {
  const m = instruction.match(YEARS_RE);
  if (!m) return null;
  const requested = Number(m[1].replace(/,/g, ""));
  if (!Number.isFinite(requested)) return null;
  if (computed.displayStyle === "omit" || computed.relevantYears == null) {
    return { requested, supported: null };
  }
  if (requested > computed.relevantYears) {
    return { requested, supported: computed.relevantYears };
  }
  return null;
}

/**
 * Remove any clause demanding "N years" from an instruction, so a safe
 * alternative can honour the rest of the request without the unsupported claim.
 * Returns "" when nothing else remains (caller falls back to a plain improve).
 */
export function stripYearsRequest(instruction: string): string {
  return instruction
    // Remove a "N years [of experience]" phrase plus a common lead-in verb, so
    // the rest of the request survives (never the whole sentence).
    .replace(
      /\b(?:say|make it|set it to|change it to|use|with|for|of)?\s*\d[\d,]*\s*\+?\s*years?(?:\s+of\s+experience)?\b/gi,
      " "
    )
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,!?])/g, "$1")
    .trim();
}
