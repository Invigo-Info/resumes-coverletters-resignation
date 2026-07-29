/**
 * AI helpers for the resume builder.
 *
 * Each function calls the server-side Gemini bridge (/api/ai) first. If the
 * server has no GEMINI_API_KEY or the call fails, it transparently falls back
 * to canned content so the UI always works. The UI never changes either way.
 *
 * To enable real AI: add GEMINI_API_KEY=... to resume-co/.env.local
 */

import { dedupeSuggestions, hasFakeMetric } from "./validate";

/** Selectable summary tones (id + label + swatch) for the summary generator. */
export const SUMMARY_TONES = [
  { id: "visionary", label: "Visionary", color: "#6366f1" },
  { id: "enthusiastic", label: "Enthusiastic", color: "#f97316" },
  { id: "confident", label: "Confident", color: "#2563eb" },
  { id: "friendly", label: "Friendly", color: "#16a34a" },
  { id: "formal", label: "Formal", color: "#475569" },
] as const;

/** One of the valid tone ids, derived from SUMMARY_TONES. */
export type ToneId = (typeof SUMMARY_TONES)[number]["id"];

/**
 * The tone for the nth generated summary variant. Each "Rewrite" advances one
 * step, so the user sees a genuinely different voice (Visionary -> Enthusiastic
 * -> …) rather than a reshuffle of the same one. Wraps after the last tone.
 */
export const toneAt = (index: number) =>
  SUMMARY_TONES[((index % SUMMARY_TONES.length) + SUMMARY_TONES.length) % SUMMARY_TONES.length];

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** POST to the AI bridge. Returns null when the server signals fallback. */
async function callAi<T>(
  task: string,
  payload: object
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
  "Led cross-functional projects from kickoff to delivery, aligning stakeholders on scope, timeline and owners.",
  "Built and maintained reporting dashboards that gave leadership weekly visibility into key operational metrics.",
  "Trained and mentored new team members, creating documentation that shortened ramp-up time.",
  "Streamlined a recurring manual process into a repeatable workflow, cutting turnaround time and errors.",
  "Owned communication with external partners, resolving issues quickly to keep deliverables on schedule.",
  "Analyzed operational data to spot bottlenecks and recommended changes that improved throughput.",
  "Coordinated with vendors and internal teams to launch initiatives on time and within budget.",
  "Improved team documentation and knowledge sharing, reducing repeat questions and rework.",
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

/**
 * Canned draft for when AI is unavailable. Both the opener lookup and the role
 * are guarded: an unknown tone id or a blank job title must still read as a
 * sentence, never as "undefined professional …".
 */
function fallbackSummary(tone: ToneId, jobTitle?: string): string {
  const opener = TONE_OPENERS[tone] ?? TONE_OPENERS.confident;
  return `${opener(jobTitle?.trim() || "professional")} ${TONE_BODY}`;
}

/**
 * Structured resume data the summary is built FROM - so the AI writes from the
 * candidate's real experience, not just by rewording the existing summary text.
 */
export interface SummaryContext {
  employment?: {
    jobTitle?: string;
    company?: string;
    startDate?: string;
    endDate?: string;
    location?: string;
    bullets?: string[];
  }[];
  skills?: string[];
  education?: { degree?: string; institution?: string }[];
}

/**
 * Generate a professional-summary draft from scratch ("Write with AI"), grounded
 * in the candidate's structured resume data (employment, skills, education).
 * `jobTitle` is the desired job title from Personal details - the role being
 * applied for.
 */
export async function generateSummary(
  opts: {
    tone: ToneId;
    jobTitle?: string;
  } & SummaryContext
): Promise<string> {
  const ai = await callAi<string>("summary", opts);
  if (ai) return ai;
  await delay(500);
  return fallbackSummary(opts.tone, opts.jobTitle);
}

/**
 * Refine the summary already in the editor ("Improve with AI"). `instruction`
 * carries the chosen preset (Improve / More human / Shorter / Ask AI to…). The
 * candidate's structured data is passed too, so the rewrite stays truthful to
 * the resume and can surface real experience - never inventing facts.
 */
export async function improveSummary(
  opts: {
    tone: ToneId;
    text: string;
    jobTitle?: string;
    instruction?: string;
  } & SummaryContext
): Promise<string> {
  const ai = await callAi<string>("improveSummary", opts);
  if (ai) return ai;
  await delay(500);
  return fallbackSummary(opts.tone, opts.jobTitle);
}

/**
 * Suggest achievement-style bullet points (idea generation).
 *
 * `role` is the job title of THIS employment entry - never the desired job
 * title from Personal details. An empty role yields generic bullets, which is
 * exactly what the caller wants when the entry has no title yet.
 */
export async function improveBullets(opts: {
  role?: string;
  company?: string;
  page?: number;
  /** The entry's current bullets (e.g. parsed from an uploaded resume). When
   *  present, suggestions are generated to complement these instead of being
   *  generic role-based ideas. */
  existing?: string[];
  /** Every idea already displayed for this entry, so "Show more" never repeats
   *  one - passed to the model AND used to filter its reply. */
  previouslyShown?: string[];
  /** Ideas the user has already inserted as bullets. */
  previouslyAdded?: string[];
}): Promise<string[]> {
  const existing = (opts.existing ?? []).map((b) => b.trim()).filter(Boolean);
  const shown = (opts.previouslyShown ?? []).map((b) => b.trim()).filter(Boolean);
  const added = (opts.previouslyAdded ?? []).map((b) => b.trim()).filter(Boolean);
  const excludePool = [...existing, ...shown, ...added];

  // One server round-trip. `alsoExclude` carries what we have accepted so far in
  // a repair pass, so the model does not hand back the same ideas again.
  const fetchRaw = (alsoExclude: string[]) =>
    callAi<string[]>("bullets", {
      // The server prompt reads `jobTitle`; send it under that name or every
      // suggestion comes back for a generic "professional".
      jobTitle: opts.role?.trim() || "",
      company: opts.company,
      page: opts.page,
      existing,
      previouslyShown: shown,
      previouslyAdded: added,
      alsoExclude,
    });

  const first = await fetchRaw([]);
  if (first && Array.isArray(first)) {
    // Drop invented metrics (a title-only idea has no context to justify a
    // number) and any near-duplicate of the exclusion history or of each other.
    let clean = dedupeSuggestions(
      first.filter((s) => typeof s === "string" && !hasFakeMetric(s)),
      excludePool
    );
    // One bounded repair pass to top back up toward 7 after filtering.
    if (clean.length < 7) {
      const more = await fetchRaw(clean);
      if (more && Array.isArray(more)) {
        clean = dedupeSuggestions(
          [...clean, ...more.filter((s) => typeof s === "string" && !hasFakeMetric(s))],
          excludePool
        );
      }
    }
    if (clean.length) return clean.slice(0, 7);
  }

  await delay(500);
  // Fallback (no AI key): draw from the generic pool but skip anything already
  // in the resume, shown, or added, so suggestions never repeat.
  const seen = new Set(excludePool.map((b) => b.toLowerCase()));
  const pool = BULLET_POOL.filter((b) => !seen.has(b.toLowerCase()));
  const src = pool.length >= 7 ? pool : BULLET_POOL;
  const start = ((opts.page ?? 0) * 7) % src.length;
  return Array.from({ length: 7 }, (_, i) => src[(start + i) % src.length]);
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
  /** When true (only the "Shorter" preset), the model may merge near-duplicate
   *  bullets into fewer. Otherwise it must return one rewritten bullet per
   *  input bullet, in order. */
  allowMerge?: boolean;
}): Promise<string[] | null> {
  const ai = await callAi<string[]>("rewriteBullets", {
    bullets: opts.bullets,
    instruction: opts.instruction,
    jobTitle: opts.jobTitle,
    mergeAllowed: opts.allowMerge ?? false,
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

/** What the tailoring flow returns for a pasted/uploaded job posting. */
export interface TailorResult {
  summary: string;
  keywords: string[];
  /** The candidate's own bullets, reframed for the posting. Empty when we had
   *  no real bullets to work from - we never invent achievements. */
  achievements: string[];
}

/**
 * Tailor a resume to a pasted job description. `bullets` are the candidate's
 * REAL experience bullets; when supplied, the AI reframes them into tailored
 * achievements. Without them the achievements list stays empty rather than
 * fabricating accomplishments.
 */
export async function tailorResume(opts: {
  jobDescription: string;
  summary?: string;
  jobTitle?: string;
  bullets?: string[];
}): Promise<TailorResult> {
  const ai = await callAi<Partial<TailorResult>>("tailor", opts);
  if (ai && ai.summary && Array.isArray(ai.keywords)) {
    return {
      summary: ai.summary,
      keywords: ai.keywords,
      achievements: Array.isArray(ai.achievements)
        ? ai.achievements.filter((a): a is string => typeof a === "string" && !!a.trim())
        : [],
    };
  }
  await delay(700);
  const role = opts.jobTitle || "professional";
  return {
    summary: `Results-driven ${role} aligned to this role, with a proven record of delivering measurable impact. Strong in the core skills the posting calls for, with a focus on outcomes, collaboration, and continuous improvement.`,
    keywords: [
      "communication", "leadership", "project management", "data analysis",
      "stakeholder management", "problem solving", "strategy", "collaboration",
    ],
    achievements: [],
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
