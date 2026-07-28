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

// Skill / qualification phrases identified by a domain suffix (e.g. "Wound care",
// "Project management"). Reliable - unlike broad Title-Case, it won't grab random
// capitalised sentence fragments. `matchAll` clones the regex, so sharing is safe.
const SKILL_SUFFIX =
  /([A-Za-z][A-Za-z0-9.+#'&/-]*(?:\s+[A-Za-z0-9.+#'&/-]+){0,2}\s+(?:certifications?|licen[sc]es?|degree|diploma|management|analysis|strategy|planning|scheduling|budgeting|forecasting|design|care|procedures?|documentation|assessments?|compliance|reporting|operations?|records?|histories|medications?|therapy|treatment|education|training|research|development|engineering|marketing|accounting|administration|coordination|communication|leadership|software|systems?|databases?)\b)/gi;
// Acronyms (BLS, ACLS, RN, CRNA, SQL, HTML, CSS, ...).
const ACRONYM = /\b([A-Z]{2,6})\b/g;

/** Normalise a candidate phrase (trim junk, drop a leading connector, bound
 *  length). Null if unusable. */
function cleanPhrase(raw: string): string | null {
  const p = raw
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[^A-Za-z]+/, "")
    .replace(/[^A-Za-z0-9)+#]+$/, "")
    // "and medication administration" -> "medication administration".
    .replace(/^(?:and|or|the|with|in|of|for|a|an|to|on|at|as|by)\s+/i, "");
  return p.length < 3 || p.length > 30 ? null : p;
}

/**
 * Curated, cross-domain skill/keyword dictionary. A posting's keyword chips are
 * the recognisable terms from this list found in the job text - which keeps chips
 * clean and meaningful ("Growth Marketing", "Patient Care", "SQL") instead of the
 * random sentence fragments a broad Title-Case scan grabs ("Where Nursing Meets").
 */
const SKILL_DICTIONARY: string[] = [
  // Marketing & growth
  "Growth Marketing", "Digital Marketing", "Digital Strategy", "Content Marketing",
  "Content Strategy", "SEO", "SEM", "PPC", "Paid Media", "Paid Search", "Paid Social",
  "Social Media", "Social Media Marketing", "Email Marketing", "Marketing Automation",
  "Brand Marketing", "Brand Strategy", "Demand Generation", "Lead Generation",
  "Conversion Optimization", "Conversion Rate Optimization", "Google Analytics",
  "Google Ads", "CRM", "B2B Marketing", "B2C Marketing", "Omnichannel", "Media Buying",
  "Product Marketing", "Performance Marketing", "Campaign Management", "Copywriting",
  "Market Research", "Marketing Strategy", "Marketing Analytics", "Influencer Marketing",
  "Affiliate Marketing", "Public Relations", "Event Marketing", "HubSpot", "Marketo",
  "Account Management", "Agency Management", "Growth Strategy", "Go-to-market",
  "Analytics", "Data Analytics", "Web Analytics", "Team Leadership",
  // Sales
  "Sales Strategy", "Sales Management", "Business Development", "Pipeline Management",
  "Account Executive", "Customer Success", "B2B Sales", "SaaS Sales", "Cold Calling",
  "Negotiation", "Salesforce", "Territory Management",
  // Software & data
  "JavaScript", "TypeScript", "React", "React Native", "Node.js", "Next.js", "Python",
  "Java", "Ruby", "PHP", "Swift", "Kotlin", "SQL", "NoSQL", "PostgreSQL", "MongoDB",
  "AWS", "Azure", "GCP", "Docker", "Kubernetes", "CI/CD", "REST API", "GraphQL",
  "Machine Learning", "Deep Learning", "Data Science", "Data Analysis", "Data Engineering",
  "Data Visualization", "Cloud Computing", "DevOps", "Agile", "Scrum", "Git", "HTML",
  "CSS", "Microservices", "TensorFlow", "Linux", "Terraform", "Power BI", "Tableau",
  "Excel", "ETL", "API Integration",
  // Design
  "UX Design", "UI Design", "Product Design", "User Research", "Wireframing",
  "Prototyping", "Figma", "Design Systems", "Interaction Design", "Visual Design",
  "Graphic Design", "Adobe Creative Suite", "Photoshop", "Illustrator",
  // Healthcare & nursing
  "Patient Care", "Acute Care", "Critical Care", "Emergency Care", "Wound Care",
  "Home Care", "Long-term Care", "Medication Administration", "Patient Assessment",
  "Patient Advocacy", "Care Coordination", "Care Planning", "Clinical Documentation",
  "Vital Signs", "IV Therapy", "Infection Control", "BLS", "ACLS", "PALS", "CPR",
  "HIPAA", "Electronic Health Records", "EHR", "EMR", "Telemetry", "Phlebotomy",
  "Triage", "Discharge Planning", "Rehabilitation", "Case Management",
  // Finance & accounting
  "Financial Modeling", "Financial Analysis", "Financial Reporting", "Accounting",
  "Auditing", "GAAP", "Accounts Payable", "Accounts Receivable", "Forecasting",
  "Budgeting", "QuickBooks", "Payroll", "Tax Preparation",
  // Business & operations
  "Project Management", "Program Management", "Product Management", "Team Leadership",
  "People Management", "Budget Management", "Strategic Planning", "Stakeholder Management",
  "Process Improvement", "Change Management", "Cross-functional Leadership",
  "Vendor Management", "Risk Management", "Operations Management", "Customer Service",
  "Business Analysis", "KPI Reporting", "Supply Chain", "Inventory Management",
  "Quality Assurance", "Compliance", "Problem Solving", "Leadership",
];

// Whole-word/phrase containment (handles "Node.js", "C/C++", "CI/CD" without regex
// escaping headaches): the match must be bounded by non-alphanumerics or string ends.
function containsPhrase(hayLow: string, needleLow: string): boolean {
  let from = 0;
  for (;;) {
    const i = hayLow.indexOf(needleLow, from);
    if (i < 0) return false;
    const before = i === 0 ? " " : hayLow[i - 1];
    const after =
      i + needleLow.length >= hayLow.length ? " " : hayLow[i + needleLow.length];
    if (!/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after)) return true;
    from = i + 1;
  }
}

/**
 * Pull the salient JOB keywords out of a posting (display-cased, de-duped). Uses
 * the curated dictionary first (clean, recognisable terms actually present in the
 * posting), then domain-suffix skill phrases and acronyms for anything the
 * dictionary misses - deliberately NOT a broad Title-Case scan, which grabs
 * capitalised sentence fragments.
 */
function extractKeywords(job: JobPosting): string[] {
  const text = [
    job.title,
    job.summary ?? "",
    ...(job.responsibilities ?? []),
    ...(job.qualifications ?? []),
    job.description ?? "",
  ].join("\n");
  const low = text.toLowerCase();

  const companyWords = new Set(
    (job.company ?? "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
  );

  const seen = new Map<string, string>();
  const add = (raw: string) => {
    const p = cleanPhrase(raw);
    if (!p) return;
    const lo = p.toLowerCase();
    if (seen.has(lo)) return;
    const words = lo.split(" ");
    if (words.every((w) => GENERIC.has(w) || companyWords.has(w))) return;
    seen.set(lo, p);
  };

  // 1) Curated dictionary terms actually present in the posting.
  for (const skill of SKILL_DICTIONARY) {
    if (containsPhrase(low, skill.toLowerCase())) add(skill);
  }
  // 2) Skill / qualification phrases identified by a domain suffix.
  for (const m of text.matchAll(SKILL_SUFFIX)) add(m[1]);
  // 3) Acronyms (BLS, ACLS, RN, CRNA, SQL, HTML, CSS, ...).
  for (const m of text.matchAll(ACRONYM)) add(m[1]);

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
