/**
 * AI helpers for the resume builder.
 *
 * Each function calls the server-side Gemini bridge (/api/ai) first. If the
 * server has no GEMINI_API_KEY or the call fails, it transparently falls back
 * to canned content so the UI always works. The UI never changes either way.
 *
 * To enable real AI: add GEMINI_API_KEY=... to resume-co/.env.local
 */

export const SUMMARY_TONES = [
  { id: "visionary", label: "Visionary", color: "#6366f1" },
  { id: "enthusiastic", label: "Enthusiastic", color: "#f97316" },
  { id: "confident", label: "Confident", color: "#2563eb" },
  { id: "friendly", label: "Friendly", color: "#16a34a" },
  { id: "formal", label: "Formal", color: "#475569" },
] as const;

export type ToneId = (typeof SUMMARY_TONES)[number]["id"];

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** POST to the AI bridge. Returns null when the server signals fallback. */
async function callAi<T>(
  task: string,
  payload: Record<string, unknown>
): Promise<T | null> {
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

/* ----------------------------- fallback data ----------------------------- */

const TONE_OPENERS: Record<ToneId, (role: string) => string> = {
  visionary: (r) => `Forward-thinking ${r} who turns ambitious ideas into measurable results.`,
  enthusiastic: (r) =>
    `Energetic ${r} ready to contribute strong communication, punctuality, and team collaboration to a fast-paced workplace.`,
  confident: (r) =>
    `Results-driven ${r} with a proven record of delivering impact and owning outcomes end to end.`,
  friendly: (r) =>
    `Approachable ${r} who builds trust with clients and teammates while keeping work on track.`,
  formal: (r) =>
    `Dedicated ${r} with demonstrated expertise across the full scope of the role and a commitment to quality.`,
};
const TONE_BODY =
  "Quick to learn new processes and technologies, adaptable across roles, and committed to meeting deadlines with consistent quality. Eager to develop professionally while supporting team goals and client needs.";

const BULLET_POOL = [
  "Managed daily schedules and shift swaps for 18 office staff across three departments to maintain coverage.",
  "Processed vendor invoices using QuickBooks, reconciled accounts and corrected discrepancies, and reduced payment errors.",
  "Prepared monthly budget variance reports in Excel for leadership review, highlighting expense trends.",
  "Ran the employee onboarding checklist, completed new-hire paperwork, and set up workstation access.",
  "Implemented a digital filing structure in SharePoint that cut document retrieval time for staff.",
  "Coordinated conference-room bookings and AV setups for client meetings and internal reviews.",
  "Maintained inventory of office supplies and negotiated with suppliers to keep stock levels consistent.",
  "Scheduled travel arrangements and expense reports for senior staff, shortening reimbursement turnaround.",
];

const HARD_SKILLS = [
  "SEO Optimization", "Content Creation", "Campaign Management", "Social Media Strategy",
  "Email Marketing", "Brand Development", "Market Research", "Data Analysis",
  "Google Analytics", "A/B Testing", "Marketing Automation", "Copywriting",
];
const SOFT_SKILLS = [
  "Creative Thinking", "Team Leadership", "Analytical Mindset", "Adaptability",
  "Time Management", "Conflict Resolution", "Networking", "Communication",
  "Problem Solving", "Collaboration", "Critical Thinking", "Negotiation",
];

/* ------------------------------- functions ------------------------------- */

/** Generate a professional-summary draft for the given tone. */
export async function generateSummary(opts: {
  tone: ToneId;
  jobTitle?: string;
}): Promise<string> {
  const ai = await callAi<string>("summary", opts);
  if (ai) return ai;
  await delay(500);
  const role = opts.jobTitle || "professional";
  return `${TONE_OPENERS[opts.tone](role)} ${TONE_BODY}`;
}

/** Refine an existing professional summary (Improve with AI). */
export async function improveSummary(opts: {
  tone: ToneId;
  text: string;
  jobTitle?: string;
}): Promise<string> {
  const ai = await callAi<string>("improveSummary", opts);
  if (ai) return ai;
  await delay(500);
  const role = opts.jobTitle || "professional";
  return `${TONE_OPENERS[opts.tone](role)} ${TONE_BODY}`;
}

/** Suggest achievement-style bullet points (idea generation). */
export async function improveBullets(opts: {
  role?: string;
  company?: string;
  page?: number;
}): Promise<string[]> {
  const ai = await callAi<string[]>("bullets", opts);
  if (ai && Array.isArray(ai)) return ai;
  await delay(500);
  const start = ((opts.page ?? 0) * 4) % BULLET_POOL.length;
  return Array.from({ length: 4 }, (_, i) => BULLET_POOL[(start + i) % BULLET_POOL.length]);
}

/** Rewrite the user's existing bullet text into stronger versions. */
export async function refineBullets(opts: {
  text: string;
  role?: string;
}): Promise<string[]> {
  const ai = await callAi<string[]>("improveBullets", opts);
  if (ai && Array.isArray(ai)) return ai;
  await delay(500);
  return BULLET_POOL.slice(0, 3);
}

/**
 * Transform existing bullet points in place per a free-form instruction
 * ("Edit with AI": Improve / More human / Shorter / Ask AI to…).
 * Returns the rewritten bullets, or null when AI is unavailable/failed so the
 * caller can show feedback instead of silently leaving the text unchanged.
 */
export async function rewriteBullets(opts: {
  bullets: string[];
  instruction: string;
  jobTitle?: string;
}): Promise<string[] | null> {
  const ai = await callAi<string[]>("rewriteBullets", {
    bullets: opts.bullets,
    instruction: opts.instruction,
    jobTitle: opts.jobTitle,
  });
  if (ai && Array.isArray(ai)) {
    const cleaned = ai
      .filter((s): s is string => typeof s === "string")
      .map((s) => s.trim())
      .filter(Boolean);
    if (cleaned.length) return cleaned;
  }
  return null; // AI unavailable / failed
}

/**
 * Rewrite a free-text block (e.g. the professional summary) per an instruction
 * ("Edit with AI": Improve / More human / Shorter / Ask AI to…).
 * Returns the rewritten text, or null when AI is unavailable/failed.
 */
export async function rewriteText(opts: {
  text: string;
  instruction: string;
  context?: string;
}): Promise<string | null> {
  const ai = await callAi<string>("improveText", {
    text: opts.text,
    instruction: opts.context
      ? `${opts.instruction} ${opts.context}`
      : opts.instruction,
  });
  if (typeof ai === "string" && ai.trim()) return ai.trim();
  return null;
}

/** Tailor a resume to a pasted job description (returns summary + keywords). */
export async function tailorResume(opts: {
  jobDescription: string;
  summary?: string;
  jobTitle?: string;
}): Promise<{ summary: string; keywords: string[] }> {
  const ai = await callAi<{ summary: string; keywords: string[] }>("tailor", opts);
  if (ai && ai.summary && Array.isArray(ai.keywords)) return ai;
  await delay(700);
  const role = opts.jobTitle || "professional";
  return {
    summary: `Results-driven ${role} aligned to this role, with a proven record of delivering measurable impact. Strong in the core skills the posting calls for, with a focus on outcomes, collaboration, and continuous improvement.`,
    keywords: [
      "communication", "leadership", "project management", "data analysis",
      "stakeholder management", "problem solving", "strategy", "collaboration",
    ],
  };
}

/**
 * AI autocomplete completions for a typed field (job title, location,
 * institution, degree, …). Returns [] on fallback so the caller can rely on
 * its own static list when AI is unavailable.
 */
export async function suggestOptions(opts: {
  kind: string;
  query: string;
}): Promise<string[]> {
  const ai = await callAi<string[]>("suggest", opts);
  if (ai && Array.isArray(ai)) {
    return ai.filter((s): s is string => typeof s === "string" && s.trim().length > 0);
  }
  return [];
}

/** Generate suggested hard + soft skills (Regenerate). */
export async function generateSkills(opts: {
  jobTitle?: string;
  exclude?: string[];
  seed?: number;
}): Promise<{ hard: string[]; soft: string[] }> {
  const ai = await callAi<{ hard: string[]; soft: string[] }>("skills", opts);
  if (ai && ai.hard && ai.soft) return ai;
  await delay(400);
  const off = (opts.seed ?? 0) * 2;
  const pick = (pool: string[]) =>
    Array.from({ length: 7 }, (_, i) => pool[(off + i) % pool.length]).filter(
      (s) => !(opts.exclude ?? []).includes(s)
    );
  return { hard: pick(HARD_SKILLS), soft: pick(SOFT_SKILLS) };
}
