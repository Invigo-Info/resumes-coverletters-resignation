/**
 * Resume-driven job search data.
 *
 * There is no live jobs API in this clone, so job results are *generated* from
 * the content of the user's resume: the target role drives the matching titles,
 * the listed skills feed the qualifications, and the resume's location is used
 * for on-site postings. The generator is fully deterministic (no Date.now /
 * Math.random) so the same resume always yields the same, stable list — which
 * keeps server and client render output identical (no hydration mismatch) and
 * lets saved/dismissed job ids stay valid across sessions.
 */

/** The slice of a resume that shapes job matches. */
export interface ResumeProfile {
  /** Target job title, e.g. "Senior Marketing Manager". */
  role: string;
  /** Skill names pulled from the resume's Skills section. */
  skills: string[];
  /** The resume's location (used for on-site postings). */
  location: string;
}

/** A single generated job posting. */
export interface JobPosting {
  id: string;
  title: string;
  company: string;
  /** Where the role is based, e.g. "Remote" or "Jefferson County, KY". */
  locationLabel: string;
  mode: "Remote" | "Remote and on-site" | "On-site";
  /** Pay range, e.g. "$110,000 - $130,000". */
  salaryLabel: string;
  /** Relative post age, e.g. "3h ago". */
  postedLabel: string;
  /** 0–100 fit score derived from the role/skill overlap. */
  matchScore: number;
  /** One-line role summary shown atop the detail panel. */
  summary: string;
  responsibilities: string[];
  qualifications: string[];
}

/* ------------------------------------------------------------------ */
/* Deterministic helpers                                              */
/* ------------------------------------------------------------------ */

/** Stable 32-bit string hash (FNV-1a) — used to seed every pseudo-random pick. */
function hashStr(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Normalize any (possibly negative) seed into a valid array index. */
function indexFor(seed: number, len: number): number {
  return ((Math.trunc(seed) % len) + len) % len;
}

/** Deterministically pick one item from a list using a numeric seed. */
function pick<T>(arr: T[], seed: number): T {
  return arr[indexFor(seed, arr.length)];
}

/** Title up to N items from a list, starting at a seeded offset (no repeats). */
function rotate<T>(arr: T[], seed: number, count: number): T[] {
  const out: T[] = [];
  const start = indexFor(seed, arr.length);
  for (let i = 0; i < count && i < arr.length; i++) {
    out.push(arr[(start + i) % arr.length]);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Role parsing                                                       */
/* ------------------------------------------------------------------ */

// Words that describe seniority rather than the field of work — stripped when
// finding the "head" word of a role ("Senior Marketing Manager" -> "Marketing").
const SENIORITY = new Set([
  "senior",
  "junior",
  "lead",
  "principal",
  "staff",
  "head",
  "chief",
  "vp",
  "svp",
  "evp",
  "director",
  "sr",
  "jr",
  "associate",
  "entry",
  "mid",
  "global",
  "intern",
  "of",
  "the",
  "and",
  "a",
]);

// Recognised role nouns, so a generated title keeps a sensible job-type word.
const ROLE_NOUNS = new Set([
  "manager",
  "engineer",
  "designer",
  "analyst",
  "specialist",
  "developer",
  "consultant",
  "director",
  "coordinator",
  "lead",
  "architect",
  "scientist",
  "strategist",
  "administrator",
  "officer",
  "executive",
  "representative",
  "accountant",
  "writer",
  "editor",
  "planner",
  "nurse",
  "marketer",
]);

interface ParsedRole {
  /** The original role, cleaned of extra whitespace. */
  full: string;
  /** First field-bearing word, e.g. "Marketing". */
  head: string;
  /** Field + noun, e.g. "Marketing Manager". */
  core: string;
  /** The job-type noun, e.g. "Manager". */
  noun: string;
}

/** Break a role string into the pieces used to build related job titles. */
function parseRole(role: string): ParsedRole {
  const cleaned = role.replace(/\s+/g, " ").trim();
  const words = cleaned.split(" ").filter(Boolean);
  const norm = (w: string) => w.toLowerCase().replace(/[^a-z]/g, "");

  const significant = words.filter((w) => !SENIORITY.has(norm(w)));
  const head = significant[0] || words[0] || "Business";

  // Last word that is a known role noun, else fall back to a sensible default.
  let noun = "Specialist";
  for (let i = words.length - 1; i >= 0; i--) {
    if (ROLE_NOUNS.has(norm(words[i]))) {
      noun = words[i];
      break;
    }
  }

  const core =
    significant.length > 1 ? significant.slice(0, 2).join(" ") : `${head} ${noun}`;

  return { full: cleaned || "Professional", head, core, noun };
}

/** De-duplicate, trim, and collapse whitespace in a list of titles. */
function cleanTitles(titles: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of titles) {
    const v = t.replace(/\s+/g, " ").trim();
    if (v && !seen.has(v.toLowerCase())) {
      seen.add(v.toLowerCase());
      out.push(v);
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Pools                                                              */
/* ------------------------------------------------------------------ */

const COMPANIES = [
  "Ladders",
  "Vantage",
  "Meridian",
  "Catalyst Labs",
  "Brightwave",
  "Summit Partners",
  "NorthStar",
  "Apex Group",
  "Wellspring",
  "Lumen",
  "Orbit",
  "BrightHire",
  "TalentWorks",
  "Greenfield",
  "Harborview",
  "Crestline",
];

const CITIES = [
  "Jefferson County, KY",
  "Austin, TX",
  "Denver, CO",
  "Chicago, IL",
  "Atlanta, GA",
  "Seattle, WA",
  "Boston, MA",
  "Charlotte, NC",
  "Phoenix, AZ",
  "Columbus, OH",
];

const MODES: JobPosting["mode"][] = ["Remote", "Remote and on-site", "On-site"];

/* ------------------------------------------------------------------ */
/* Generator                                                          */
/* ------------------------------------------------------------------ */

/** Build a varied set of related titles around the parsed role. */
function buildTitles(r: ParsedRole): string[] {
  const { head, core, noun } = r;
  return cleanTitles([
    r.full,
    `Senior ${core}`,
    core,
    `Director of ${head}`,
    `Head of ${head}`,
    `Lead ${core}`,
    `${head} Director`,
    `Principal ${core}`,
    `VP of ${head}`,
    `${head} Program ${noun}`,
    `Associate ${core}`,
    `Global ${core}`,
    `${head} Team Lead`,
    `${core} II`,
    `Staff ${core}`,
    `${head} ${noun}, Remote`,
  ]);
}

/** Responsibility bullet templates (interpolate the field + skills). */
function buildResponsibilities(head: string, skills: string[], seed: number): string[] {
  const h = head.toLowerCase();
  const skillA = skills[0] || `${h} tools`;
  const pool = [
    `Define and lead the ${h} strategy across the organization`,
    `Translate complex requirements into clear, actionable plans`,
    `Oversee planning, production, and delivery across teams`,
    `Collaborate with cross-functional partners to drive measurable outcomes`,
    `Implement scalable systems and processes that improve efficiency`,
    `Own ${h} program budgets and key vendor partnerships`,
    `Mentor and grow a team of ${h} professionals`,
    `Apply ${skillA} to ship high-quality, on-time work`,
    `Report on performance and present results to senior leadership`,
    `Identify opportunities for ${h} improvement and lead the change`,
  ];
  return rotate(pool, seed, 7);
}

/** Qualification bullet templates (interpolate years + skills). */
function buildQualifications(
  head: string,
  skills: string[],
  years: number,
  seed: number
): string[] {
  const h = head.toLowerCase();
  const pool: string[] = [
    `Bachelor's degree in a related field; Master's degree preferred`,
    `${years}+ years of experience in ${h} or a closely related role`,
    `Proven track record of leading ${h} initiatives end to end`,
    `Strong communication and stakeholder-management skills`,
    `Comfortable working in a fast-paced, cross-functional environment`,
    `A portfolio of measurable results and successful projects`,
  ];
  if (skills.length) {
    const list =
      skills.length >= 3
        ? `${skills[0]}, ${skills[1]}, and ${skills[2]}`
        : skills.join(" and ");
    pool.splice(2, 0, `Hands-on experience with ${list}`);
  }
  return rotate(pool, seed, 5);
}

/** Format a salary band from a seniority offset + seed. */
function buildSalary(seniorBoost: number, seed: number): string {
  const low = 70 + (seed % 9) * 10 + seniorBoost; // 70k..150k (+boost)
  const high = low + (seed % 2 === 0 ? 20 : 30);
  const fmt = (k: number) => `$${(k * 1000).toLocaleString("en-US")}`;
  return `${fmt(low)} - ${fmt(high)}`;
}

/** Format a relative "posted" label from a seed. */
function buildPosted(seed: number): string {
  const h = seed % 24;
  if (h < 12) return `${h + 1}h ago`;
  return `${(seed % 13) + 1}d ago`;
}

const SENIOR_HINT = /(senior|director|head|vp|principal|chief|lead|staff)/i;

/**
 * Generate the recommended job list for a resume profile. Deterministic: the
 * same profile (role + skills) always returns the same jobs in the same order.
 */
export function generateJobs(profile: ResumeProfile): JobPosting[] {
  const role = profile.role.trim() || "Professional";
  const parsed = parseRole(role);
  const titles = buildTitles(parsed);
  const baseSeed = hashStr(role.toLowerCase());

  return titles.map((title, i) => {
    // Unsigned: XOR yields a signed int, which would make `% length` negative.
    const seed = (hashStr(`${title}|${i}`) ^ baseSeed) >>> 0;
    const mode = pick(MODES, seed >>> 3);
    const isRemote = mode === "Remote";
    const city = pick(CITIES, seed >>> 5);
    const locationLabel = isRemote ? "Remote" : city;
    const seniorBoost = SENIOR_HINT.test(title) ? 40 : 0;
    const years = 3 + (seed % 8);

    // Match score: exact role match scores highest, related titles a little
    // lower; a resume with more listed skills nudges everything up.
    const skillBonus = Math.min(profile.skills.length, 6);
    const base = i === 0 ? 90 : 86 - (seed % 16);
    const matchScore = Math.max(62, Math.min(96, base + skillBonus - (i % 3)));

    return {
      id: `job-${hashStr(`${title}|${parsed.full}|${i}`).toString(36)}`,
      title,
      company: pick(COMPANIES, seed),
      locationLabel,
      mode,
      salaryLabel: buildSalary(seniorBoost, seed),
      postedLabel: buildPosted(seed),
      matchScore,
      summary: `Own and grow the ${parsed.head.toLowerCase()} function as a ${title} at ${pick(
        COMPANIES,
        seed
      )}.`,
      responsibilities: buildResponsibilities(parsed.head, profile.skills, seed),
      qualifications: buildQualifications(parsed.head, profile.skills, years, seed),
    } satisfies JobPosting;
  });
}

/** A large, stable "N jobs found" count for a role (display only). */
export function jobCountFor(role: string): number {
  return 4200 + (hashStr(role.toLowerCase()) % 14000);
}

/** Label + accent for the match-score badge. */
export function matchMeta(score: number): { label: string; strong: boolean } {
  return { label: score >= 80 ? "Strong match" : "Good match", strong: score >= 80 };
}
