"use client";

import type { CoverLetterState } from "@/lib/store/cover-letter-store";

/**
 * Cover-letter AI helpers. Each call hits the server-side Gemini bridge
 * (/api/ai) first and transparently falls back to canned content if the key
 * is missing or the call fails — same contract as the resume builder.
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

export interface CoverLetterInput
  extends Pick<
    CoverLetterState,
    "jobIntent" | "jobDetails" | "skills" | "strengths" | "experience" | "recentJob" | "education" | "personal"
  > {}

function fallbackLetter(input: CoverLetterInput): string {
  const role = input.jobDetails.desiredJobTitle || "the role";
  const company = input.jobDetails.companyName;
  const greeting = input.jobDetails.hiringManagerName
    ? `Dear ${input.jobDetails.hiringManagerName},`
    : "Dear Hiring Manager,";
  const skills = input.skills.join(", ") || "my core skills";
  const strengths = input.strengths.join(", ") || "a strong work ethic";
  const recent = input.recentJob.jobTitle
    ? `my recent role as ${input.recentJob.jobTitle}${input.recentJob.company ? ` at ${input.recentJob.company}` : ""}`
    : "my professional experience";
  const edu = input.education.field
    ? `I hold a degree in ${input.education.field}${input.education.university ? ` from ${input.education.university}` : ""}, which gave me a solid foundation for this work.`
    : "";

  return [
    greeting,
    `I am writing to express my interest in the ${role} position${company ? ` at ${company}` : ""}. Drawing on ${recent}, I am confident in my ability to contribute meaningfully to your team.`,
    `Throughout my career I have developed expertise in ${skills}. My strengths as a ${strengths} professional allow me to deliver results while collaborating effectively with others.`,
    edu,
    `I am enthusiastic about the opportunity to bring my skills and experience to ${company || "your organization"} and would welcome the chance to discuss how I can add value to your team.`,
    `${input.personal.firstName} ${input.personal.lastName}`.trim() || "Sincerely",
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Generate the full cover-letter body. Always returns text (AI or fallback). */
export async function generateCoverLetter(input: CoverLetterInput): Promise<string> {
  const ai = await callAi<string>("coverLetter", {
    jobTitle: input.jobDetails.desiredJobTitle,
    hasSpecificJob: input.jobIntent.hasSpecificJob,
    companyName: input.jobDetails.companyName,
    hiringManagerName: input.jobDetails.hiringManagerName,
    jobDescription: input.jobDetails.jobDescription,
    skills: input.skills,
    strengths: input.strengths,
    experience: input.experience,
    recentJob: input.recentJob,
    education: input.education,
  });
  if (ai && ai.trim()) return ai.trim();
  return fallbackLetter(input);
}

/**
 * Parse a saved/uploaded resume into cover-letter fields via Gemini.
 * Returns null on fallback so the caller can use its persona defaults.
 */
export async function parseResumeAi(input: {
  resumeTitle?: string;
  resumeText?: string;
}): Promise<Partial<CoverLetterState> | null> {
  const data = await callAi<{
    education?: CoverLetterState["education"];
    recentJob?: CoverLetterState["recentJob"];
    experience?: string;
    skills?: string[];
    strengths?: string[];
    personal?: CoverLetterState["personal"];
  }>("parseResume", input);
  if (!data) return null;
  const out: Partial<CoverLetterState> = {};
  if (data.education) out.education = data.education;
  if (data.recentJob) out.recentJob = data.recentJob;
  if (data.experience) out.experience = data.experience;
  if (Array.isArray(data.skills)) out.skills = data.skills.slice(0, 3);
  if (Array.isArray(data.strengths)) out.strengths = data.strengths.slice(0, 3);
  if (data.personal) out.personal = data.personal;
  return out;
}

/**
 * Reorder a fixed chip pool so the picks most relevant to `role` come first.
 * Returns the original order on fallback (or if the AI drops/changes items).
 */
export async function rankChips(
  role: string,
  kind: "skills" | "strengths" | "roles",
  options: string[]
): Promise<string[]> {
  if (!role.trim()) return options;
  const data = await callAi<string[]>("rankChips", { jobTitle: role, kind, options });
  if (!Array.isArray(data) || !data.length) return options;
  // Keep only known options, then append any the model omitted (no data loss).
  const known = new Set(options);
  const ranked = data.filter((x) => known.has(x));
  const seen = new Set(ranked);
  for (const opt of options) if (!seen.has(opt)) ranked.push(opt);
  return ranked.length === options.length ? ranked : options;
}
