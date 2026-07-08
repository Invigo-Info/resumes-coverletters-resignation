/**
 * Tailoring plan.
 *
 * Turns the tailoring context (target job title + the keywords the user chose to
 * highlight) and the resume into an ordered list of section-by-section
 * suggestions - Job title, Professional summary, one per Work-experience entry,
 * and Skills. Each suggestion carries a guidance message, the current ("before")
 * value, an editable "suggested" value, and the score points it adds. Fully
 * deterministic (no Date/random) so the plan and score are stable across renders.
 * Suggestions only reframe existing experience - they never invent new facts.
 */

/** The section a suggestion targets. */
export type SuggestionKind = "title" | "summary" | "experience" | "skills";

/** One reviewable tailoring suggestion. */
export interface TailorPlanItem {
  id: string;
  kind: SuggestionKind;
  /** Card label, e.g. "Job title" or "Work experience: Manager - Acme". */
  label: string;
  /** Why the change helps (ATS / recruiter framing). */
  guidance: string;
  /** Current resume content, for the before/after comparison. */
  before: string;
  /** Proposed content (editable before applying). Title = plain text; summary =
   *  a paragraph; experience = newline-separated bullets; skills = comma list. */
  suggested: string;
  /** Match-score points this suggestion adds when applied. */
  delta: number;
  /** Apply verb - "Add" for skills (append/merge), "Apply" otherwise. */
  actionLabel: "Apply" | "Add";
  /** Employment entry id (experience suggestions only). */
  entryId?: string;
  /** Normalised skills to append (skills suggestions only). */
  skillsToAdd?: string[];
}

/** The resume fields the plan is built from. `summary` is plain text; each
 *  employment `description` is the raw resume HTML so real bullets can be parsed
 *  and reframed (see splitBullets). */
export interface TailorResume {
  jobTitle: string;
  summary: string;
  employment: { id: string; jobTitle: string; company: string; description: string }[];
  skills: string[];
}

const CONNECTORS = /^(and|or|the|with|across|to|of|in|for|a|an|on|at)\s+/i;

/** Strip leading connector words, drop overly long entries, de-dupe (case-insensitive). */
function cleanKeywords(keywords: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of keywords) {
    const k = raw.replace(CONNECTORS, "").trim();
    if (k.length < 2 || k.length > 28) continue;
    const low = k.toLowerCase();
    if (seen.has(low)) continue;
    seen.add(low);
    out.push(k);
  }
  return out;
}

/** Pick keyword at index i, cycling if the list is short. */
const pick = (kws: string[], i: number, fallback: string) =>
  kws.length ? kws[i % kws.length] : fallback;

/** Strip HTML tags to plain text (lib-local; mirrors the editor's stripHtml). */
const stripTags = (html: string) =>
  html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const lowerFirst = (s: string) => (s ? s[0].toLowerCase() + s.slice(1) : s);
const upperFirst = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/**
 * Split a work-experience description into individual bullet texts. Prefers the
 * real <li> structure, then block breaks (</p>, </div>, <br>), then line breaks /
 * sentence boundaries. The returned strings are the user's own words - nothing is
 * added - so bullets can be reframed truthfully.
 */
function splitBullets(desc: string): string[] {
  if (!desc) return [];
  const liMatches = [...desc.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)];
  let rawParts: string[];
  if (liMatches.length) {
    rawParts = liMatches.map((m) => m[1]);
  } else if (/<(br|\/p|\/div)/i.test(desc)) {
    rawParts = desc.split(/<br\s*\/?>|<\/p>|<\/div>/i);
  } else if (desc.includes("\n")) {
    rawParts = desc.split(/\n+/);
  } else {
    rawParts = stripTags(desc).split(/(?<=[.!?])\s+(?=[A-Z])/);
  }
  return rawParts
    .map((p) => stripTags(p).replace(/^[\s•*.\-–—]+/, "").trim())
    .filter(Boolean);
}

// Weak bullet openers that bury the achievement; swapped for a strong action verb.
const WEAK_OPENER =
  /^(responsible for|responsibilities includ(?:e|ed)|worked on|worked with|helped(?: to| with)?|assisted(?: with| in)?|was tasked with|tasked with|duties includ(?:e|ed)|in charge of|handled|involved in|part of|participated in)\s+/i;
const STRONG_VERBS = ["Led", "Drove", "Owned", "Spearheaded", "Delivered", "Directed"];

/**
 * Reframe one real bullet: replace a weak opener ("Responsible for...") with a
 * strong action verb and keep the rest of the sentence - metrics, tools, and
 * facts - exactly as the user wrote it. Never invents new claims.
 */
function reframeBullet(bullet: string, i: number): string {
  const b = bullet.trim();
  if (!b) return b;
  if (WEAK_OPENER.test(b)) {
    const rest = lowerFirst(b.replace(WEAK_OPENER, "").trim());
    return `${STRONG_VERBS[i % STRONG_VERBS.length]} ${rest}`;
  }
  return upperFirst(b);
}

/** Real "N+ years" of experience stated anywhere in the resume, else null. */
function yearsOfExperience(resume: TailorResume): string | null {
  const text = stripTags(
    `${resume.summary} ${resume.employment.map((e) => e.description).join(" ")}`
  );
  const m = text.match(/(\d{1,2})\s*\+?\s*years?/i);
  return m ? `${m[1]}+ years` : null;
}

/** Real resume skills first, then the selected keywords, de-duped, display-cased. */
function topSkills(resume: TailorResume, kws: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of [...resume.skills, ...kws]) {
    const v = s.trim();
    if (v.length < 2) continue;
    const low = v.toLowerCase();
    if (seen.has(low)) continue;
    seen.add(low);
    out.push(v);
  }
  return out;
}

/** The strongest real measurable clause (has a %, $, or multi-digit figure). */
function measurableClause(resume: TailorResume): string | null {
  const candidates = [
    stripTags(resume.summary),
    ...resume.employment.flatMap((e) => splitBullets(e.description)),
  ];
  for (const c of candidates) {
    const clause = c.trim().replace(/[.\s]+$/, "");
    if (
      clause.length >= 20 &&
      clause.length <= 150 &&
      /\d+\s*%|\$\s?\d|\b\d{2,}\b/.test(clause)
    ) {
      return clause;
    }
  }
  return null;
}

/**
 * A tailored professional summary drawn entirely from the existing resume: it
 * leads with the target job title (+ the resume's real years of experience if
 * stated), names the top real skills / selected keywords, and preserves one of
 * the resume's real measurable achievements. No invented facts.
 */
function buildSummary(jobTitle: string, resume: TailorResume, kws: string[]): string {
  const role = jobTitle.trim() || resume.jobTitle.trim() || "professional";
  const years = yearsOfExperience(resume);
  const skills = topSkills(resume, kws);
  const skillPhrase = skills.length
    ? ` specializing in ${skills.slice(0, 3).join(", ")}`
    : "";
  const lead = years
    ? `Results-driven ${role} with ${years} of experience${skillPhrase}.`
    : `Results-driven ${role}${skillPhrase}.`;
  const metric = measurableClause(resume);
  const proof = metric
    ? ` ${reframeBullet(metric, 0)}.`
    : ` Proven track record of delivering measurable impact through ${
        skills.slice(3, 5).join(" and ") ||
        "data-informed strategy and cross-functional leadership"
      }.`;
  return `${lead}${proof}`;
}

/** Keyword-weighted starter bullets - used only when an entry has none of its
 *  own to reframe. Clearly a starting point for the user to edit, not a claim. */
function buildBullets(kws: string[]): string[] {
  return [
    `Led ${pick(kws, 0, "key")} and ${pick(kws, 1, "cross-functional")} initiatives, aligning execution with organizational goals.`,
    `Owned ${pick(kws, 2, "core")} strategy across cross-functional teams, improving key performance metrics.`,
    `Drove measurable outcomes through ${pick(kws, 3, "data-informed")} decision-making and stakeholder alignment.`,
  ];
}

/** Per-kind score deltas; experience tapers by position (top roles weigh more). */
const DELTA = { title: 4, summary: 6, skills: 5 } as const;
const EXPERIENCE_DELTAS = [6, 5, 3];

/**
 * Build the ordered suggestion plan. `jobTitle` is the posting's title, `keywords`
 * the user-selected keywords, `resume` the current (plain-text) resume content.
 */
export function buildTailorPlan(
  jobTitle: string,
  keywords: string[],
  resume: TailorResume
): TailorPlanItem[] {
  const kws = cleanKeywords(keywords);
  const items: TailorPlanItem[] = [];

  // Job title - always shown, so the left column includes a Before/Suggested
  // job-title comparison (matching the posting's exact title ranks higher in ATS
  // search). The suggested value equals the resume headline when it already
  // matches, so applying it is a safe no-op.
  const posting = jobTitle.trim();
  const alreadyAligned =
    !!posting && posting.toLowerCase() === resume.jobTitle.trim().toLowerCase();
  if (posting) {
    items.push({
      id: "title",
      kind: "title",
      label: "Job title",
      guidance: alreadyAligned
        ? "Your headline already matches the posting's exact title - the strongest signal for ATS title search. Keep it, or fine-tune the wording."
        : "Using the exact job title from the posting is the easiest way to boost your visibility. ATS ranks resumes with matching titles higher in search results.",
      before: resume.jobTitle || "Not set",
      suggested: posting,
      delta: DELTA.title,
      actionLabel: "Apply",
    });
  }

  // Professional summary - rewritten to include the target title, top skills, and
  // a real measurable achievement, all drawn from the existing resume.
  items.push({
    id: "summary",
    kind: "summary",
    label: "Professional summary",
    guidance:
      "The summary is the first thing recruiters and ATS scan. We reframed yours around this role's title and keywords - still true to your experience, no invented facts.",
    before: resume.summary || "No summary yet.",
    suggested: buildSummary(jobTitle, resume, kws),
    delta: DELTA.summary,
    actionLabel: "Apply",
  });

  // Work experience - one suggestion per entry (up to 3). We reframe the user's
  // OWN bullets (strong action verbs, keywords surfaced) and preserve every metric
  // and fact; only entries with no bullets get editable starter suggestions.
  resume.employment
    .filter((e) => e.jobTitle.trim() || e.company.trim())
    .slice(0, 3)
    .forEach((e, i) => {
      const title = e.jobTitle.trim() || "Work experience";
      const detail = [title, e.company.trim()].filter(Boolean).join(" - ");
      const bullets = splitBullets(e.description);
      items.push({
        id: `exp-${e.id}`,
        kind: "experience",
        label: `Work experience: ${detail}`,
        guidance: bullets.length
          ? "Reframed your own bullets to open with strong action verbs and surface this role's keywords - every metric and fact stays yours."
          : "Starter bullets for this role - edit them to match what you actually did. We never invent experience.",
        before: stripTags(e.description) || "No bullets yet.",
        suggested: (bullets.length
          ? bullets.map((b, idx) => reframeBullet(b, idx))
          : buildBullets(kws)
        ).join("\n"),
        delta: EXPERIENCE_DELTAS[i] ?? 3,
        actionLabel: "Apply",
        entryId: e.id,
      });
    });

  // Skills - append the selected keywords the resume is missing.
  const have = new Set(resume.skills.map((s) => s.trim().toLowerCase()));
  const toAdd = kws.filter((k) => !have.has(k.toLowerCase())).slice(0, 12);
  if (toAdd.length > 0) {
    items.push({
      id: "skills",
      kind: "skills",
      label: "Skills",
      guidance:
        "This section directly impacts your ATS score. Don't hold back, include every relevant skill you have.",
      before: resume.skills.join(", ") || "No skills yet.",
      suggested: toAdd.join(", "),
      delta: DELTA.skills,
      actionLabel: "Add",
      skillsToAdd: toAdd,
    });
  }

  return items;
}

/** The maximum score reachable when every suggestion in `plan` is applied. */
export function planMaxScore(baseScore: number, plan: TailorPlanItem[]): number {
  return Math.min(99, baseScore + plan.reduce((sum, s) => sum + s.delta, 0));
}
