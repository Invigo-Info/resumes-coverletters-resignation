/**
 * Keyword-level resume-to-job match.
 *
 * Powers the "Job keywords in your resume" card: it pulls the salient keywords
 * out of a job posting and splits them into the ones the resume already covers
 * (green check) and the ones it is missing (grey X). The coverage ratio becomes
 * the 0-100 match score shown in the ring on every card and the detail panel.
 * Fully deterministic (no AI, no Date/random) so the card ring and the detail
 * ring always agree and results are stable across renders.
 */

import type { JobPosting } from "./job-search";
import type { ScoreResume } from "./scoreboard";

/** The keyword breakdown behind a job's match score. */
export interface KeywordMatch {
  /** 0-100 keyword coverage. */
  score: number;
  /** Human label for the score ("Strong match", "Fair match", ...). */
  label: string;
  /** Job keywords the resume already contains. */
  matched: string[];
  /** Job keywords the resume is missing (tailoring targets). */
  missing: string[];
}

/** Score band label. 34 -> "Fair match" (matches the reference UI). */
export function matchLabel(score: number): string {
  if (score >= 75) return "Strong match";
  if (score >= 55) return "Good match";
  if (score >= 30) return "Fair match";
  if (score >= 15) return "Weak match";
  return "Low match";
}

/** Ring colour for a score: green (strong) / amber (fair) / red (weak). */
export function ringColor(score: number): string {
  if (score >= 67) return "#16A34A";
  if (score >= 34) return "#D97706";
  return "#DC2626";
}

// Generic Title-Case words that are not real job keywords - excluded from the
// extracted set so chips stay meaningful ("Family Medicine", not "We"/"Our").
const GENERIC = new Set([
  "we","our","the","you","your","job","description","company","overview","role",
  "responsibilities","qualifications","requirements","benefits","position","team",
  "teams","united","states","remote","onsite","site","full","time","part","new",
  "summary","about","who","what","this","that","join","work","working","please",
  "apply","equal","opportunity","employer","must","will","should","would","including",
  "etc","day","days","week","weeks","year","years","plus","strong","excellent",
  "ability","experience","skills","skill","knowledge","preferred","required","related",
  "field","monday","tuesday","wednesday","thursday","friday","saturday","sunday",
  "january","february","march","april","june","july","august","september","october",
  "november","december","us","usa","and","for","with","the","a","an","of","to","in",
  "on","or","as","is","be","by","at","it","are","our","per","hour","week","month",
]);

/** Pull candidate keyword phrases out of a job posting (display-cased, de-duped). */
function extractKeywords(job: JobPosting): string[] {
  const text = [
    job.title,
    job.summary ?? "",
    ...(job.responsibilities ?? []),
    ...(job.qualifications ?? []),
    job.description ?? "",
  ].join("\n");

  const companyWords = new Set(
    job.company.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
  );

  const seen = new Map<string, string>();
  const add = (raw: string) => {
    const p = raw
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^[^A-Za-z]+/, "")
      .replace(/[^A-Za-z0-9)+#]+$/, "");
    if (p.length < 3 || p.length > 30) return;
    const low = p.toLowerCase();
    if (seen.has(low)) return;
    const words = low.split(" ");
    if (words.every((w) => GENERIC.has(w) || companyWords.has(w))) return;
    seen.set(low, p);
  };

  // 1) Skill / qualification phrases identified by a domain suffix.
  const SUFFIX =
    /([A-Za-z][A-Za-z0-9.+#'&/-]*(?:\s+[A-Za-z0-9.+#'&/-]+){0,2}\s+(?:certifications?|licen[sc]es?|degree|diploma|management|analysis|strategy|planning|scheduling|budgeting|forecasting|design|care|procedures?|documentation|assessments?|compliance|reporting|operations?|records?|histories|medications?|therapy|treatment|education|training|research|development|engineering|marketing|accounting|administration|coordination|communication|leadership|software|systems?|databases?)\b)/gi;
  for (const m of text.matchAll(SUFFIX)) add(m[1]);

  // 2) Title-Case domain phrases (1-3 words), e.g. "Family Medicine".
  const TITLE = /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,2})\b/g;
  for (const m of text.matchAll(TITLE)) add(m[1]);

  // 3) Acronyms (BLS, ACLS, RN, CRNA, SQL, HTML, CSS, ...).
  const ACR = /\b([A-Z]{2,6})\b/g;
  for (const m of text.matchAll(ACR)) add(m[1]);

  return [...seen.values()];
}

/**
 * Compute the keyword match between a job and a resume. Resume skills present in
 * the posting are always "matched"; extracted job keywords are "matched" when
 * the resume text covers them, else "missing". Score = matched / total.
 */
export function buildKeywordMatch(job: JobPosting, resume: ScoreResume): KeywordMatch {
  const jobLow = [
    job.title,
    job.summary ?? "",
    ...(job.responsibilities ?? []),
    ...(job.qualifications ?? []),
    job.description ?? "",
  ]
    .join("\n")
    .toLowerCase();

  const haystack =
    `${resume.role} ${resume.skills.join(" ")} ${resume.summary} ${resume.experience}`.toLowerCase();

  const covers = (phraseLow: string): boolean => {
    if (haystack.includes(phraseLow)) return true;
    const words = phraseLow.split(" ").filter((w) => w.length > 2);
    if (!words.length) return false;
    let hits = 0;
    for (const w of words) if (haystack.includes(w)) hits++;
    return hits / words.length >= 0.6;
  };

  const matched = new Map<string, string>();
  const missing = new Map<string, string>();

  // Resume skills that literally appear in the posting are definite matches.
  for (const s of resume.skills) {
    const v = s.trim();
    if (v && jobLow.includes(v.toLowerCase())) matched.set(v.toLowerCase(), v);
  }

  // Extracted job keywords: matched if the resume covers them, else missing.
  for (const kw of extractKeywords(job)) {
    const low = kw.toLowerCase();
    if (matched.has(low) || missing.has(low)) continue;
    if (covers(low)) matched.set(low, kw);
    else missing.set(low, kw);
  }

  const matchedList = [...matched.values()].slice(0, 16);
  const missingList = [...missing.values()].slice(0, 16);
  const total = matchedList.length + missingList.length;
  const score = total
    ? Math.max(5, Math.min(99, Math.round((matchedList.length / total) * 100)))
    : 60;

  return {
    score,
    label: matchLabel(score),
    matched: matchedList,
    missing: missingList,
  };
}
