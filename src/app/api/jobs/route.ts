import { NextResponse } from "next/server";
import {
  scoreText,
  industryFor,
  type JobPosting,
  type ResumeProfile,
} from "@/features/jobs/lib/job-search";

/** Normalized query built from the request's filter params. */
interface JobQuery {
  profile: ResumeProfile;
  /** All target titles (first = primary); OR-matched in the query. */
  titles: string[];
  /** Max age in days (from the date-posted filter). */
  days: number;
  /** Work model filter. */
  work: "remote_and_onsite" | "remote_only" | "onsite_only";
}

const DAYS_FOR: Record<string, number> = { "24h": 1, "3d": 3, week: 7, month: 30 };

/**
 * GET /api/jobs?role=&titles=a,b&where=&skills=a,b&date=month&work=remote_and_onsite&sort=best_match
 *
 * Returns real job postings matched to the resume profile + filters, normalized
 * into the app's JobPosting shape. Source priority:
 *   1. Adzuna  - when ADZUNA_APP_ID + ADZUNA_APP_KEY are set (free key, richer
 *      data: salary, location, description).
 *   2. Remotive - keyless fallback (real remote jobs), so live results work
 *      even before any key is configured.
 * If both fail or return nothing, responds with an empty list and the client
 * falls back to locally-generated matches.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const role = (searchParams.get("role") || "").trim();
  const where = (searchParams.get("where") || "").trim();
  const skills = (searchParams.get("skills") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const titles = (searchParams.get("titles") || role)
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const days = DAYS_FOR[searchParams.get("date") || "month"] ?? 30;
  const workParam = searchParams.get("work") || "remote_and_onsite";
  const work = (["remote_and_onsite", "remote_only", "onsite_only"].includes(workParam)
    ? workParam
    : "remote_and_onsite") as JobQuery["work"];

  const primaryRole = titles[0] || role;
  if (!primaryRole) {
    return NextResponse.json({ jobs: [], count: 0, source: "none" });
  }

  const query: JobQuery = {
    profile: { role: primaryRole, skills, location: where },
    titles,
    days,
    work,
  };

  // 1) Adzuna (needs a free API key).
  const adzunaId = process.env.ADZUNA_APP_ID;
  const adzunaKey = process.env.ADZUNA_APP_KEY;
  if (adzunaId && adzunaKey && query.work !== "remote_only") {
    try {
      const res = await fetchAdzuna(query, adzunaId, adzunaKey);
      if (res.jobs.length) return NextResponse.json(res);
    } catch {
      /* fall through to the keyless source */
    }
  }

  // 2) Remotive (keyless). Remotive is remote-only, so skip it for on-site-only.
  if (query.work !== "onsite_only") {
    try {
      const res = await fetchRemotive(query);
      if (res.jobs.length) return NextResponse.json(res);
    } catch {
      /* fall through to empty -> client generates matches */
    }
  }

  return NextResponse.json({ jobs: [], count: 0, source: "none" });
}

/* ------------------------------------------------------------------ */
/* Shared helpers                                                     */
/* ------------------------------------------------------------------ */

/** Abort a fetch that takes longer than `ms` so the route never hangs. */
async function fetchJson(url: string, ms = 6000): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}

/** Strip HTML to readable plain text, keeping paragraph/bullet line breaks. */
function htmlToText(html: string): string {
  return html
    .replace(/<\/(p|div|li|h[1-6]|ul|ol|br)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<br\s*\/?>(?!\n)/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;|&rsquo;|&apos;/gi, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Relative "3h ago" / "5d ago" label from an ISO date string. */
function relativeTime(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "Recently";
  const mins = Math.max(1, Math.round((Date.now() - t) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.round(days / 30)}mo ago`;
}

/** Does the text read as a remote role? */
function isRemote(text: string): boolean {
  return /\bremote\b|work from home|wfh/i.test(text);
}

/** Best-effort seniority label from a title (mirrors the generated jobs). */
function seniorityFrom(title: string): string {
  const t = title.toLowerCase();
  if (/(vp|vice president|chief|head of|director)/.test(t)) return "Executive";
  if (/(senior|sr\.?|principal|staff|lead)/.test(t)) return "Senior";
  if (/(junior|jr\.?|associate|entry)/.test(t)) return "Entry";
  return "Mid";
}

/** ISO date -> epoch ms (or undefined if unparseable). */
function toEpoch(iso?: string): number | undefined {
  if (!iso) return undefined;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? undefined : t;
}

/* ------------------------------------------------------------------ */
/* Adzuna  (https://developer.adzuna.com - free app_id + app_key)     */
/* ------------------------------------------------------------------ */

interface AdzunaResult {
  id?: string | number;
  title?: string;
  description?: string;
  company?: { display_name?: string };
  location?: { display_name?: string };
  salary_min?: number;
  salary_max?: number;
  created?: string;
  redirect_url?: string;
  contract_time?: string;
  category?: { label?: string; tag?: string };
}

/** Clean an Adzuna category label ("Healthcare & Nursing Jobs" -> "Healthcare & Nursing"). */
function cleanIndustry(label?: string): string {
  return (label || "").replace(/\s*Jobs?$/i, "").trim();
}
interface AdzunaResponse {
  count?: number;
  results?: AdzunaResult[];
}

async function fetchAdzuna(
  query: JobQuery,
  appId: string,
  appKey: string
): Promise<{ jobs: JobPosting[]; count: number; source: string }> {
  const { profile, titles, days, work } = query;
  const country = (process.env.ADZUNA_COUNTRY || "us").toLowerCase();
  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    results_per_page: "30",
    "content-type": "application/json",
    sort_by: "relevance",
    max_days_old: String(days),
  });
  // OR-match every selected title so related roles still surface.
  if (titles.length > 1) params.set("what_or", titles.join(" "));
  else params.set("what", titles[0] || profile.role);
  if (profile.location) params.set("where", profile.location);
  const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params.toString()}`;

  const data = (await fetchJson(url)) as AdzunaResponse;
  const results = Array.isArray(data.results) ? data.results : [];

  let jobs: JobPosting[] = results.map((r, i) => {
    const title = r.title?.replace(/<[^>]+>/g, "").trim() || "Untitled role";
    const company = r.company?.display_name?.trim() || "Company";
    const location = r.location?.display_name?.trim() || (profile.location || "");
    const description = htmlToText(r.description || "");
    const remote = isRemote(`${title} ${location} ${description}`);
    return {
      id: `live-adz-${r.id ?? i}`,
      title,
      company,
      locationLabel: location || (remote ? "Remote" : "Not specified"),
      mode: remote ? "Remote" : "On-site",
      salaryLabel: salaryBand(r.salary_min, r.salary_max),
      postedLabel: r.created ? relativeTime(r.created) : "Recently",
      postedAt: toEpoch(r.created),
      seniority: seniorityFrom(title),
      industry: cleanIndustry(r.category?.label) || industryFor(`${title} ${description}`),
      matchScore: scoreText(`${title} ${description}`, profile),
      summary: `${title} at ${company}${location ? `, ${location}` : ""}.`,
      responsibilities: [],
      qualifications: [],
      source: "live",
      description,
      applyUrl: r.redirect_url,
    };
  });

  // On-site-only: drop anything that reads as remote.
  if (work === "onsite_only") jobs = jobs.filter((j) => j.mode !== "Remote");

  return {
    jobs: sortByScore(jobs),
    count: typeof data.count === "number" ? data.count : jobs.length,
    source: "adzuna",
  };
}

/** Format an Adzuna numeric salary range. */
function salaryBand(min?: number, max?: number): string {
  const fmt = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
  if (min && max) return `${fmt(min)} - ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  if (max) return `Up to ${fmt(max)}`;
  return "Salary not disclosed";
}

/* ------------------------------------------------------------------ */
/* Remotive  (https://remotive.com/api - keyless, remote jobs)        */
/* ------------------------------------------------------------------ */

interface RemotiveJob {
  id?: number;
  title?: string;
  company_name?: string;
  candidate_required_location?: string;
  salary?: string;
  url?: string;
  description?: string;
  publication_date?: string;
  category?: string;
}
interface RemotiveResponse {
  "job-count"?: number;
  jobs?: RemotiveJob[];
}

async function fetchRemotive(
  query: JobQuery
): Promise<{ jobs: JobPosting[]; count: number; source: string }> {
  const { profile, titles, days } = query;
  const params = new URLSearchParams({
    search: titles[0] || profile.role,
    limit: "30",
  });
  const url = `https://remotive.com/api/remote-jobs?${params.toString()}`;

  const data = (await fetchJson(url)) as RemotiveResponse;
  const results = Array.isArray(data.jobs) ? data.jobs : [];

  let jobs: JobPosting[] = results.map((j, i) => {
    const title = j.title?.trim() || "Untitled role";
    const company = j.company_name?.trim() || "Company";
    const location = j.candidate_required_location?.trim() || "Remote";
    const description = htmlToText(j.description || "");
    return {
      id: `live-rmt-${j.id ?? i}`,
      title,
      company,
      locationLabel: location,
      mode: "Remote" as const,
      salaryLabel: j.salary?.trim() || "Salary not disclosed",
      postedLabel: j.publication_date ? relativeTime(j.publication_date) : "Recently",
      postedAt: toEpoch(j.publication_date),
      seniority: seniorityFrom(title),
      industry: j.category?.trim() || industryFor(`${title} ${description}`),
      matchScore: scoreText(`${title} ${description}`, profile),
      summary: `${title} at ${company} (${location}).`,
      responsibilities: [],
      qualifications: [],
      source: "live" as const,
      description,
      applyUrl: j.url,
    };
  });

  // Respect the date filter (Remotive has no date param).
  const cutoff = Date.now() - days * 86400000;
  jobs = jobs.filter((j) => (j.postedAt ? j.postedAt >= cutoff : true));

  return {
    jobs: sortByScore(jobs),
    count: jobs.length,
    source: "remotive",
  };
}

/** Best match first. */
function sortByScore(jobs: JobPosting[]): JobPosting[] {
  return [...jobs].sort((a, b) => b.matchScore - a.matchScore);
}
