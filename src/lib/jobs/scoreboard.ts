/**
 * Resume-to-job match Scoreboard.
 *
 * Turns a plain match percentage into an explainable checklist: how strong the
 * resume matches a job, which Position/Requirements/Responsibilities signals are
 * covered, and which are missing. Hybrid: `getScoreboard` asks Gemini (via
 * /api/ai `scoreJob`) when available and falls back to a deterministic heuristic
 * (`buildHeuristicScoreboard`) otherwise - mirroring every other AI feature.
 */

import { matchMeta, type JobPosting } from "./job-search";

/** The resume context compared against a job posting. */
export interface ScoreResume {
  role: string;
  skills: string[];
  /** Professional summary as plain text. */
  summary: string;
  /** Employment titles + descriptions concatenated as plain text. */
  experience: string;
}

/** One checklist row inside a category (a job signal + whether the resume covers it). */
export interface ScoreItem {
  label: string;
  matched: boolean;
}

/** A category card in the expanded scoreboard. */
export interface ScoreCategory {
  name: "Position" | "Requirements" | "Responsibilities";
  items: ScoreItem[];
}

/** The full match result rendered by the scoreboard card. */
export interface MatchScoreboard {
  score: number;
  label: string;
  summary: string;
  categories: ScoreCategory[];
  mainGaps: string[];
}

/* ------------------------------------------------------------------ */
/* Heuristic scoreboard                                               */
/* ------------------------------------------------------------------ */

const STOPWORDS = new Set([
  "and","the","for","with","that","this","from","your","you","are","our","will",
  "have","has","a","an","of","to","in","on","or","as","is","be","by","at","it",
  "we","us","their","they","them","who","all","any","across","into","within",
  "including","strong","excellent","ability","experience","years","year","plus",
  "related","field","role","team","teams","work","working","skills","skill",
]);

/** Salient lowercase keywords from a line of text (for overlap matching). */
function keywords(text: string): string[] {
  return [
    ...new Set(
      text
        .toLowerCase()
        .split(/[^a-z0-9+#.]+/)
        .filter((w) => w.length > 2 && !STOPWORDS.has(w))
    ),
  ];
}

/** Does the resume haystack cover enough of an item's keywords to count? */
function itemMatched(label: string, haystack: string, skills: string[]): boolean {
  const words = keywords(label);
  if (!words.length) return false;
  // A named skill appearing in the item is a strong signal.
  if (skills.some((s) => s && label.toLowerCase().includes(s))) return true;
  let hits = 0;
  for (const w of words) if (haystack.includes(w)) hits++;
  return hits / words.length >= 0.5;
}

/** Split a job description into candidate signal lines (bullets / sentences). */
function descriptionLines(description: string): string[] {
  return description
    .split(/\n|(?<=[.!?])\s+(?=[A-Z])|•|;/)
    .map((l) => l.replace(/^[\s•\-*]+/, "").trim())
    .filter((l) => l.length >= 12 && l.length <= 160);
}

const REQ_HINT = /(degree|bachelor|master|mba|\d+\+?\s*years|proficien|require|qualif|certif|must have|understanding of|knowledge of)/i;
const RESP_HINT = /(oversee|lead|manage|implement|develop|create|drive|own|represent|report|analyze|collaborat|build|execute|responsible|coordinate|deliver)/i;

/**
 * Deterministic scoreboard from a job + resume. Uses the job's structured
 * responsibilities/qualifications when present (generated jobs), otherwise parses
 * the free-text description (live jobs). Weighted: Position 30, Requirements 35,
 * Responsibilities 25, skills bonus 10.
 */
export function buildHeuristicScoreboard(
  job: JobPosting,
  resume: ScoreResume
): MatchScoreboard {
  const haystack = `${resume.role} ${resume.skills.join(" ")} ${resume.summary} ${resume.experience}`.toLowerCase();
  const skills = resume.skills.map((s) => s.toLowerCase().trim()).filter(Boolean);

  const lines = job.description ? descriptionLines(job.description) : [];

  // Position: role identity, seniority, and any position-like description lines.
  const head = job.title.split(/[,\-|]/)[0].trim();
  const positionLabels = [
    `${head} title match`,
    job.seniority ? `${job.seniority}-level role alignment` : `Role scope alignment`,
    ...lines
      .filter((l) => !REQ_HINT.test(l) && !RESP_HINT.test(l))
      .slice(0, 3),
  ].slice(0, 5);

  // Requirements: the job's qualifications, or requirement-like description lines.
  const requirementLabels = (
    job.qualifications.length
      ? job.qualifications
      : lines.filter((l) => REQ_HINT.test(l))
  ).slice(0, 5);

  // Responsibilities: the job's responsibilities, or duty-like description lines.
  const responsibilityLabels = (
    job.responsibilities.length
      ? job.responsibilities
      : lines.filter((l) => RESP_HINT.test(l))
  ).slice(0, 6);

  const toItems = (labels: string[]): ScoreItem[] =>
    labels
      .map((label) => label.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .map((label) => ({ label, matched: itemMatched(label, haystack, skills) }));

  const position = toItems(
    positionLabels.length ? positionLabels : [`${head} title match`]
  );
  const requirements = toItems(requirementLabels);
  const responsibilities = toItems(responsibilityLabels);

  const ratio = (items: ScoreItem[]) =>
    items.length ? items.filter((i) => i.matched).length / items.length : 0.6;

  // Skill bonus: how many resume skills show up in the posting text.
  const jobText = `${job.title} ${job.description ?? ""} ${job.responsibilities.join(" ")} ${job.qualifications.join(" ")}`.toLowerCase();
  const skillHits = skills.filter((s) => jobText.includes(s)).length;
  const skillBonus = skills.length ? Math.min(1, skillHits / Math.min(skills.length, 5)) : 0.6;

  const score = Math.round(
    Math.max(
      50,
      Math.min(
        99,
        ratio(position) * 30 +
          ratio(requirements) * 35 +
          ratio(responsibilities) * 25 +
          skillBonus * 10
      )
    )
  );

  const categories: ScoreCategory[] = [
    { name: "Position" as const, items: position },
    { name: "Requirements" as const, items: requirements },
    { name: "Responsibilities" as const, items: responsibilities },
  ].filter((c) => c.items.length > 0);

  const mainGaps = categories
    .flatMap((c) => c.items)
    .filter((i) => !i.matched)
    .map((i) => i.label);

  const matchedTop = categories
    .flatMap((c) => c.items)
    .filter((i) => i.matched)
    .slice(0, 3)
    .map((i) => i.label.toLowerCase());

  const { label } = matchMeta(score);
  const summary = buildSummary(job, matchedTop, mainGaps, label);

  return { score, label, summary, categories, mainGaps };
}

/** Short, specific match explanation (kept non-generic). */
function buildSummary(
  job: JobPosting,
  matchedTop: string[],
  mainGaps: string[],
  label: string
): string {
  const strengths = matchedTop.length
    ? ` Your resume shows ${matchedTop.slice(0, 2).join(" and ")}.`
    : "";
  const gap = mainGaps.length
    ? ` The main gap is ${mainGaps[0].toLowerCase()}.`
    : " No major gaps stand out.";
  return `${label} for the ${job.title} role.${strengths}${gap}`;
}

/* ------------------------------------------------------------------ */
/* Hybrid (AI first, heuristic fallback)                              */
/* ------------------------------------------------------------------ */

/** Validate + coerce an AI response into a MatchScoreboard (null if malformed). */
function normalizeAi(data: unknown): MatchScoreboard | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const score = Number(d.score);
  if (!Number.isFinite(score)) return null;
  const rawCats = Array.isArray(d.categories) ? d.categories : [];
  const categories: ScoreCategory[] = rawCats
    .map((c) => {
      const cc = c as Record<string, unknown>;
      const name = cc.name as ScoreCategory["name"];
      const items = (Array.isArray(cc.items) ? cc.items : [])
        .map((it) => {
          const ii = it as Record<string, unknown>;
          return { label: String(ii.label ?? "").trim(), matched: Boolean(ii.matched) };
        })
        .filter((i) => i.label);
      return { name, items };
    })
    .filter(
      (c) =>
        ["Position", "Requirements", "Responsibilities"].includes(c.name) &&
        c.items.length > 0
    );
  if (!categories.length) return null;
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const mainGaps = Array.isArray(d.mainGaps) ? d.mainGaps.map(String) : [];
  return {
    score: clamped,
    // Derive the label from the score so the badge colour + label always agree
    // (the model sometimes returns a label that disagrees with its number).
    label: matchMeta(clamped).label,
    summary: typeof d.summary === "string" ? d.summary : "",
    categories,
    mainGaps,
  };
}

/** Ask Gemini (via /api/ai) for a scoreboard; null on no-key/failure/malformed. */
async function callScoreAi(
  job: JobPosting,
  resume: ScoreResume
): Promise<MatchScoreboard | null> {
  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task: "scoreJob",
        payload: {
          resume,
          job: {
            title: job.title,
            company: job.company,
            description:
              job.description ||
              [...job.responsibilities, ...job.qualifications].join("\n"),
          },
        },
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.fallback || !json.data) return null;
    return normalizeAi(json.data);
  } catch {
    return null;
  }
}

/**
 * Hybrid entry point used by the UI: AI scoreboard when available, deterministic
 * heuristic otherwise. Lazy-loaded per selected job (the brief's hybrid model).
 */
export async function getScoreboard(
  job: JobPosting,
  resume: ScoreResume
): Promise<MatchScoreboard> {
  const ai = await callScoreAi(job, resume);
  return ai ?? buildHeuristicScoreboard(job, resume);
}
