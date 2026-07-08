/**
 * Job-specific interview preparation.
 *
 * Generates a practical prep sheet for the exact job the user is applying to,
 * using the job context + the candidate's resume. Hybrid: `getInterviewPrep`
 * asks Gemini (via /api/ai `interviewPrep`) when available and falls back to a
 * deterministic heuristic - mirroring the Scoreboard's hybrid model. Never
 * fabricates company facts or candidate experience.
 */

import type { JobPosting } from "@/lib/jobs/job-search";
import type { ScoreResume } from "@/lib/jobs/scoreboard";

/** The four interview formats the user can prepare for. */
export type InterviewType = "screening" | "manager" | "technical" | "other";

export const INTERVIEW_TYPES: {
  id: InterviewType;
  title: string;
  subtitle: string;
}[] = [
  { id: "screening", title: "Screening call", subtitle: "Basics and expectations" },
  { id: "manager", title: "Meeting with a manager", subtitle: "Your background and skills" },
  { id: "technical", title: "Technical", subtitle: "Problem-solving and hard skills" },
  { id: "other", title: "Other", subtitle: "Share any details and we'll tailor your prep" },
];

/** One interview question with coaching lines and an optional sample answer. */
export interface PrepQuestion {
  question: string;
  guidance: string[];
  sample?: string;
}

/** The generated interview-prep content. */
export interface InterviewPrep {
  company: {
    name: string;
    description: string;
    /** "Get to know the company" bullets the user can mention. */
    bullets: string[];
    /** Best-effort website domain (e.g. "pwc.com") for a quick reference link. */
    website?: string;
    /** LinkedIn company link (or search). */
    linkedin?: string;
    /** Founded year / HQ / employee count - only when known (never fabricated). */
    founded?: string;
    headquarters?: string;
    employees?: string;
  };
  role: { title: string; keySkills: string[]; summary: string };
  values: string[];
  mentions: string[];
  questions: PrepQuestion[];
  candidateQuestions: string[];
}

/* ------------------------------------------------------------------ */
/* Heuristic fallback                                                 */
/* ------------------------------------------------------------------ */

const stripHtml = (s: string) => s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

/** Best-effort website domain from a company name (mirrors the logo resolver).
 *  A wrong guess simply 404s in the browser - it is a link, not a stated fact. */
function guessDomain(company: string): string | null {
  const slug = company
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\b(inc|incorporated|llc|ltd|limited|corp|corporation|group|the)\b/g, " ")
    .replace(/[^a-z0-9]/g, "");
  return slug ? `${slug}.com` : null;
}

/** Salient keywords from text (used to surface role skills). */
function topSkills(job: JobPosting, resume: ScoreResume): string[] {
  const fromResume = resume.skills.slice(0, 8);
  if (fromResume.length >= 4) return fromResume.slice(0, 6);
  // Otherwise pull capitalised/known terms from the description.
  const text = `${job.description ?? ""} ${job.qualifications.join(" ")}`;
  const found = Array.from(
    new Set(
      (text.match(/\b([A-Z][a-zA-Z0-9+.#]{2,}(?:\s[A-Z][a-zA-Z0-9]+)?)\b/g) || [])
        .map((s) => s.trim())
        .filter((s) => s.length > 2)
    )
  ).slice(0, 6);
  return [...new Set([...fromResume, ...found])].slice(0, 6);
}

const TYPE_QUESTIONS: Record<InterviewType, PrepQuestion[]> = {
  screening: [
    { question: "Tell me about yourself.", guidance: ["Keep it to 60-90 seconds.", "Lead with your current role and one relevant win.", "End with why this role interests you."] },
    { question: "Walk me through your recent role.", guidance: ["Focus on scope and outcomes, not tasks.", "Name one measurable result."] },
    { question: "What are your salary expectations?", guidance: ["Ask the recruiter for the range first.", "Give a range, not a single number."] },
    { question: "What's your availability / notice period?", guidance: ["Be honest and specific.", "Signal flexibility where you can."] },
    { question: "Why are you interested in this role?", guidance: ["Tie your background to the job's core need.", "Mention the company by name."] },
  ],
  manager: [
    { question: "Walk me through your most recent role and its impact.", guidance: ["Use one strong example with numbers.", "Connect it to this job's responsibilities."] },
    { question: "Tell me about a time you led through a difficult decision.", guidance: ["Use situation -> action -> result.", "Show judgement and ownership."] },
    { question: "How do you align stakeholders?", guidance: ["Give a concrete cross-functional example.", "Show communication and follow-through."] },
    { question: "How do you develop your team?", guidance: ["Mention coaching, feedback, or growth you drove.", "Keep it specific to real people/outcomes."] },
    { question: "Why are you a fit for this role?", guidance: ["Map your top two strengths to the job's needs.", "Avoid generic claims - use evidence."] },
  ],
  technical: [
    { question: "Walk me through your process for a recent project.", guidance: ["Explain the goal, your approach, and the outcome.", "Name the tools you used."] },
    { question: "How do you measure success in your work?", guidance: ["Give the specific metrics you track.", "Show a before/after improvement."] },
    { question: "Describe a tradeoff you had to make.", guidance: ["Explain the options and why you chose one.", "Show practical judgement."] },
    { question: "How do you troubleshoot when something isn't working?", guidance: ["Describe your diagnostic steps.", "Give a real example."] },
    { question: "What tools/frameworks are you strongest in?", guidance: ["Match to the job's stack.", "Back each with a quick example."] },
  ],
  other: [
    { question: "Walk me through how you'd approach this format.", guidance: ["Structure your answer clearly.", "Tie it back to the role and company."] },
    { question: "What outcome are you aiming for in this conversation?", guidance: ["State your goal.", "Show you've prepared."] },
  ],
};

const TYPE_CANDIDATE_QS: Record<InterviewType, string[]> = {
  screening: [
    "What does the interview process look like from here?",
    "What's the expected timeline for this hire?",
    "How would you describe the team I'd be joining?",
  ],
  manager: [
    "What would success in this role look like in the first 90 days?",
    "How is performance measured on your team?",
    "What are the biggest challenges facing the team right now?",
  ],
  technical: [
    "What tools and workflows does the team rely on day to day?",
    "How do you balance speed and quality here?",
    "What does the review/feedback process look like?",
  ],
  other: [
    "What matters most to you in the person you hire for this?",
    "What would make someone exceptional in this role?",
    "What are the next steps after this conversation?",
  ],
};

const lower1 = (s: string) => (s ? s[0].toLowerCase() + s.slice(1) : s);
const upper1 = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** The candidate's strongest REAL accomplishments, pulled from their resume for
 *  manager-interview coaching. Nothing is invented - only figures/team sizes the
 *  resume actually states are surfaced. */
interface Accomplishments {
  years: string | null; // "8+ years"
  team: string | null; // "5"
  metrics: string[]; // real clauses containing a % or $ figure
  role: string; // recent role title
}

function extractAccomplishments(resume: ScoreResume): Accomplishments {
  const text = stripHtml(`${resume.summary} ${resume.experience}`);
  const yearsM = text.match(/(\d{1,2})\s*\+?\s*years?/i);
  const teamM = text.match(
    /team of (\d+)|(\d+)[-\s]person team|managed (?:a )?team of (\d+)/i
  );
  const team = teamM ? teamM[1] || teamM[2] || teamM[3] || null : null;
  // A % or $ figure plus up to 4 following words (the outcome), stopping before a
  // connector - yields tight clauses like "42% increase in qualified leads".
  const metrics: string[] = [];
  const seen = new Set<string>();
  const re =
    /(\d{1,3}\s?%|\$\s?[\d.,]+\s?[mbk]?)((?:\s+(?!and\b|while\b|but\b|then\b|to\b|by\b)[A-Za-z][\w-]*){0,4})/gi;
  for (const m of text.matchAll(re)) {
    const clause = `${m[1]}${m[2]}`.replace(/\s+/g, " ").trim();
    const low = clause.toLowerCase();
    if (clause.length >= 3 && clause.length <= 60 && !seen.has(low)) {
      seen.add(low);
      metrics.push(clause);
    }
    if (metrics.length >= 3) break;
  }
  return { years: yearsM ? `${yearsM[1]}+ years` : null, team, metrics, role: resume.role };
}

/**
 * Manager-interview questions: manager-style prompts whose guidance and sample
 * answers weave in the candidate's REAL accomplishments (metrics, team size,
 * years) and coach them to connect examples to this exact role - per the
 * manager-interview content rules. Falls back to non-numeric phrasing when the
 * resume states no figures (never invents one).
 */
function buildManagerQuestions(job: JobPosting, acc: Accomplishments): PrepQuestion[] {
  const roleTitle = acc.role || "your most recent role";
  const roleLc = (acc.role || "your field").toLowerCase();
  const m0 = acc.metrics[0];
  const teamPhrase = acc.team ? `a team of ${acc.team}` : null;

  const opener = acc.years
    ? `${acc.years} in ${roleLc}, most recently as ${roleTitle}`
    : `Most recently ${acc.role ? `a ${roleTitle}` : roleTitle}`;
  const aboutSample =
    `${opener}` +
    `${teamPhrase ? `, leading ${teamPhrase}` : ""}` +
    `${m0 ? `, with ${lower1(m0)}` : ""}. ` +
    `I'd bring that same focus to ${job.company}.`;

  return [
    {
      question: "Tell me about yourself.",
      guidance: [
        "Aim for 2-3 minutes - this audience wants depth, not a headline.",
        `Go chronological and linger on your ${roleTitle} experience.`,
        `Close by connecting your background to why ${job.title} makes sense.`,
      ],
      sample: aboutSample,
    },
    {
      question: "Walk me through your most recent role.",
      guidance: [
        m0
          ? `Lead with ${lower1(m0)}.`
          : "Lead with your single strongest measurable result.",
        teamPhrase
          ? `Name ${teamPhrase} and the partners you aligned across functions.`
          : "Name the cross-functional partners you aligned.",
        `Tie the scope directly to what ${job.title} needs.`,
      ],
      sample: acc.metrics.length
        ? `I owned ${lower1(
            acc.metrics.slice(0, 2).join(" and ")
          )} - by aligning the team and stakeholders behind one plan.`
        : undefined,
    },
    {
      question: "How do you align stakeholders and drive decisions?",
      guidance: [
        "Give one concrete cross-functional example.",
        "Show how you built agreement, then owned the outcome.",
      ],
    },
    {
      question: "Tell me about a decision you led under pressure.",
      guidance: [
        "Use situation, then action, then result.",
        "Show judgement and that you owned the call.",
      ],
    },
    {
      question: "How do you develop and lead your team?",
      guidance: [
        teamPhrase
          ? `Reference leading ${teamPhrase} - coaching, feedback, growth.`
          : "Reference coaching, feedback, or growth you drove.",
        "Keep it to real people and real outcomes.",
      ],
    },
    {
      question: "How do you see your professional development going forward?",
      guidance: [
        `Name a specific direction that fits ${job.title}.`,
        `Connect it to ${job.company}'s scale or focus.`,
        "Frame this role as the logical next step, not a lateral move.",
      ],
    },
  ];
}

/** The candidate's domain from their role title (seniority + title-noun removed).
 *  "Senior Marketing Manager" -> "marketing". Empty when nothing clean remains. */
function fieldFromRole(role: string): string {
  return role
    .toLowerCase()
    .replace(
      /\b(senior|junior|lead|principal|staff|entry|level|associate|assistant|chief|head|vp|svp|evp|director|manager|specialist|coordinator|officer|executive|analyst|consultant|representative|rep|agent|engineer|developer|designer|scientist|architect|technician|programmer|administrator|accountant)\b/g,
      " "
    )
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Technical-interview questions: hard-skill PROOF anchored to the candidate's
 * actual skills/tools - process, tooling, measurement, tradeoffs, results (not
 * just definitions). For non-engineering roles this stays practical domain skill
 * and never defaults to coding. All guidance is grounded in the user profile and
 * never invents a project or a metric.
 */
function buildTechnicalQuestions(resume: ScoreResume, acc: Accomplishments): PrepQuestion[] {
  const field = fieldFromRole(resume.role);
  // Only weave the domain into phrasing when it's one clean word ("marketing"),
  // else fall back to generic wording so multi-word titles don't read awkwardly.
  const singleField = field && !field.includes(" ") ? field : "";
  const skills = resume.skills.filter(Boolean);
  const s3 = skills[2];
  const toolLike = skills.find((s) =>
    /crm|software|analytics|platform|tool|suite|excel|sql|tableau|salesforce|hubspot|automation|reporting|figma|cloud/i.test(
      s
    )
  );
  const skillForSetup = toolLike || skills[0];
  const hasReporting = skills.some((s) =>
    /report|analytic|measurement|performance|metric|data|kpi/i.test(s)
  );
  const m0 = acc.metrics[0];
  const qs: PrepQuestion[] = [];

  qs.push({
    question: singleField
      ? `How do you keep your ${singleField} knowledge current?`
      : "How do you keep your skills current for this role?",
    guidance: [
      "Name a real source - tool updates, industry blogs, or a certification.",
      "Tie it to something you actually applied, not theory.",
    ],
  });

  if (skillForSetup) {
    qs.push(
      toolLike
        ? {
            question: `Walk me through your ${toolLike} setup and how you use it.`,
            guidance: [
              `${toolLike} is in your skills - name the specific platform and tools.`,
              "Connect it to the workflows and results you built, not the definition.",
            ],
          }
        : {
            question: `Walk me through how you apply ${skillForSetup} in your day-to-day work.`,
            guidance: [
              `${skillForSetup} is in your skills - name the specific techniques or protocols.`,
              "Connect it to the outcomes you drove, not the definition.",
            ],
          }
    );
  }

  qs.push(
    hasReporting
      ? {
          question: "How do you build a performance reporting framework?",
          guidance: [
            "The posting values measurement and data-informed decisions.",
            m0
              ? `Anchor in your ${lower1(m0)} - what did you track to get there?`
              : "Name the exact metrics you track, and why those.",
          ],
        }
      : {
          question: "How do you measure the impact of your work?",
          guidance: [
            "Give the specific metrics you own, not vanity numbers.",
            m0 ? `Anchor in your ${lower1(m0)}.` : "Show a before/after improvement.",
          ],
        }
  );

  qs.push({
    question: singleField
      ? `Walk me through your process on a recent ${singleField} project.`
      : "Walk me through your process on a recent project.",
    guidance: [
      "Explain the goal, your approach, and the outcome - proof over theory.",
      s3 ? `Show where ${s3} fit into the work.` : "Name the tools you reached for.",
    ],
  });

  qs.push({
    question: "Describe a tradeoff or tough problem you worked through.",
    guidance: [
      "Lay out the options and why you chose one.",
      "Show practical judgement, grounded in a real example.",
    ],
  });

  return qs;
}

/** Type-specific "what they value in people" (generic but on-tone; the AI path
 *  supplies company-specific values when available). */
const VALUES_BY_TYPE: Record<InterviewType, string[]> = {
  screening: [
    "Clear communication and collaboration",
    "Ownership and follow-through",
    "Measurable impact over activity",
  ],
  manager: [
    "Leadership that connects work to strategy",
    "Credibility with senior stakeholders",
    "Coaching and growing the people around them",
    "A high bar for measurement, not just execution",
  ],
  technical: [
    "Depth of real hard-skill knowledge",
    "Proof of execution over theory",
    "Sound judgement under real constraints",
    "Rigor in process and measurement",
  ],
  other: [
    "Clear communication and collaboration",
    "Ownership and follow-through",
    "Measurable impact over activity",
  ],
};

/** "Worth mentioning" points - real accomplishment clauses first, then top real
 *  skills framed as owned work. Truthful (drawn from the resume). */
function buildMentions(resume: ScoreResume, acc: Accomplishments): string[] {
  const out: string[] = [];
  for (const m of acc.metrics.slice(0, 2)) out.push(upper1(m));
  for (const s of resume.skills.slice(0, 3)) out.push(`Your hands-on work with ${s}`);
  if (!out.length) out.push("A concrete result with a number attached");
  out.push("Why this role fits your trajectory");
  return out.slice(0, 4);
}

/** Deterministic interview prep from the job + resume (AI fallback). */
export function buildHeuristicPrep(
  job: JobPosting,
  resume: ScoreResume,
  type: InterviewType,
  customDetail?: string
): InterviewPrep {
  const skills = topSkills(job, resume);
  const acc = extractAccomplishments(resume);
  const desc = stripHtml(job.description || job.summary || "");
  const roleSummary =
    desc.slice(0, 220) ||
    `${job.title} at ${job.company}. Prepare to connect your experience to this role's needs.`;

  const questions =
    type === "manager"
      ? buildManagerQuestions(job, acc)
      : type === "technical"
        ? buildTechnicalQuestions(resume, acc)
        : type === "other" && customDetail
          ? [
            {
              question: `Prepare for: ${customDetail.slice(0, 120)}`,
              guidance: [
                "Structure a clear, specific answer.",
                "Tie your points to this job and company.",
              ],
            },
            ...TYPE_QUESTIONS.other,
          ]
        : TYPE_QUESTIONS[type];

  const domain = guessDomain(job.company);
  return {
    company: {
      name: job.company,
      description: `${job.company} is hiring for ${job.title}${
        job.locationLabel ? ` in ${job.locationLabel}` : ""
      }. Read up on what they do before the call.`,
      website: domain ?? undefined,
      linkedin: `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(
        job.company
      )}`,
      // Facts (founded/HQ/employees) are only shown when the AI supplies them -
      // the heuristic never fabricates them.
      bullets: [
        "Look up their recent news, products, or funding before the call.",
        `Have a clear reason why ${job.company} specifically appeals to you.`,
        "Skim their mission or values so you can echo them naturally.",
      ],
    },
    role: {
      title: job.title,
      keySkills: skills,
      summary: roleSummary,
    },
    values: VALUES_BY_TYPE[type],
    mentions: buildMentions(resume, acc),
    questions,
    candidateQuestions: TYPE_CANDIDATE_QS[type],
  };
}

/* ------------------------------------------------------------------ */
/* Hybrid (AI first, heuristic fallback)                              */
/* ------------------------------------------------------------------ */

function normalizeAi(data: unknown, job: JobPosting): InterviewPrep | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? v.map(String).filter(Boolean) : [];
  const company = (d.company ?? {}) as Record<string, unknown>;
  const role = (d.role ?? {}) as Record<string, unknown>;
  const questions = (Array.isArray(d.questions) ? d.questions : [])
    .map((q) => {
      const qq = q as Record<string, unknown>;
      return {
        question: String(qq.question ?? "").trim(),
        guidance: arr(qq.guidance),
        sample: typeof qq.sample === "string" ? qq.sample : undefined,
      };
    })
    .filter((q) => q.question);
  if (!questions.length) return null;
  const str = (v: unknown): string | undefined =>
    typeof v === "string" && v.trim() ? v.trim() : undefined;
  return {
    company: {
      name: String(company.name ?? job.company),
      description: String(company.description ?? ""),
      bullets: arr(company.bullets),
      website: str(company.website),
      linkedin: str(company.linkedin),
      founded: str(company.founded),
      headquarters: str(company.headquarters ?? company.hq),
      employees: str(company.employees),
    },
    role: {
      title: String(role.title ?? job.title),
      keySkills: arr(role.keySkills),
      summary: String(role.summary ?? ""),
    },
    values: arr(d.values),
    mentions: arr(d.mentions),
    questions,
    candidateQuestions: arr(d.candidateQuestions),
  };
}

async function callPrepAi(
  job: JobPosting,
  resume: ScoreResume,
  type: InterviewType,
  customDetail?: string,
  exclude: string[] = []
): Promise<InterviewPrep | null> {
  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task: "interviewPrep",
        payload: {
          job: {
            title: job.title,
            company: job.company,
            location: job.locationLabel,
            salary: job.salaryLabel,
            seniority: job.seniority,
            description:
              job.description ||
              [job.summary, ...job.responsibilities, ...job.qualifications].join("\n"),
          },
          resume,
          interviewType: type,
          customDetail: customDetail || "",
          exclude,
        },
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.fallback || !json.data) return null;
    return normalizeAi(json.data, job);
  } catch {
    return null;
  }
}

/** Hybrid entry point: AI prep when available, heuristic otherwise. */
export async function getInterviewPrep(
  job: JobPosting,
  resume: ScoreResume,
  type: InterviewType,
  customDetail?: string
): Promise<InterviewPrep> {
  const ai = await callPrepAi(job, resume, type, customDetail);
  return ai ?? buildHeuristicPrep(job, resume, type, customDetail);
}

/** Fetch an additional batch of questions (for "Get more questions"). */
export async function getMoreQuestions(
  job: JobPosting,
  resume: ScoreResume,
  type: InterviewType,
  existing: string[],
  customDetail?: string
): Promise<PrepQuestion[]> {
  const ai = await callPrepAi(job, resume, type, customDetail, existing);
  if (ai) {
    return ai.questions.filter((q) => !existing.includes(q.question));
  }
  // Heuristic: rotate the pool, skipping ones already shown.
  return buildHeuristicPrep(job, resume, type, customDetail).questions.filter(
    (q) => !existing.includes(q.question)
  );
}
