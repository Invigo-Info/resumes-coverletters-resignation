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
    "Is this a new role or a backfill?",
    "What does the interview process look like?",
    "When should I expect to hear back?",
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

/** All job-description prose, lower-cased, for occupation/condition detection. */
function jdText(job: JobPosting): string {
  return stripHtml(
    `${job.description ?? ""} ${job.summary ?? ""} ${job.responsibilities.join(
      " "
    )} ${job.qualifications.join(" ")}`
  ).toLowerCase();
}

/** True for a confidential / placeholder / practice company (no "Why [X]?"). */
function isPlaceholderCompany(c: string): boolean {
  return !c.trim() || /^(the company|your target company|confidential)/i.test(c.trim());
}

/**
 * Screening Question 5 - the single most important recruiter-level requirement,
 * chosen by scanning the JD in priority order: licence/certification, then years
 * of experience, then language, then the core skill. Never asserts a credential
 * the resume doesn't show (spec: licence/certification rule).
 */
function primaryRequirementQ(job: JobPosting, resume: ScoreResume): PrepQuestion {
  const jd = jdText(job);
  if (
    /\b(licen[cs]e|licensure|registration|registered|certified|certification|accredit|clearance|chartered)\b/.test(
      jd
    )
  ) {
    return {
      question: "Do you hold the licence or certification this role requires?",
      guidance: [
        "Name the exact credential and its current status - honestly.",
        "If yours needs renewal or local recognition, say so plainly.",
        "Never claim an active credential your resume doesn't show.",
      ],
    };
  }
  const yearsM = jd.match(/(\d{1,2})\s*\+?\s*years?/);
  if (yearsM) {
    const field = fieldFromRole(resume.role) || "this kind of work";
    return {
      question: `How many years of ${field} experience do you have?`,
      guidance: [
        `The posting looks for around ${yearsM[1]}+ years.`,
        "Give a straight number, then your most relevant recent example.",
      ],
    };
  }
  if (/\b(bilingual|fluent|multilingual|spanish|french|german|mandarin|arabic)\b/.test(jd)) {
    return {
      question: "Are you fluent in the language(s) this role needs?",
      guidance: [
        "State your real proficiency level for each language.",
        "Mention where you have used it professionally.",
      ],
    };
  }
  const skill = resume.skills[0] || topSkills(job, resume)[0];
  return skill
    ? {
        question: `Do you have hands-on experience with ${skill}?`,
        guidance: [
          `${skill} is central here - name the specific work you did with it.`,
          "Keep it recruiter-level: confirm suitability, save the deep dive for later.",
        ],
      }
    : {
        question: "Do you have the core experience this role calls for?",
        guidance: [
          "Point to the closest relevant experience you have.",
          "Be honest about where it is a direct vs. a transferable match.",
        ],
      };
}

/**
 * Screening Question 6 - the most important remaining work condition, chosen from
 * the JD: shift/on-call, travel, remote/time zone, driving, else start date. All
 * phrased at recruiter level and only when genuinely job-related (spec §25).
 */
function workConditionQ(job: JobPosting): PrepQuestion {
  const jd = jdText(job);
  const mode = `${job.mode ?? ""} ${job.locationLabel ?? ""}`.toLowerCase();
  if (/\b(night|overnight|shift|weekend|on-call|on call|rotating|rota|roster)\b/.test(jd)) {
    return {
      question: "Are you comfortable with the required shift or on-call schedule?",
      guidance: [
        "Confirm the specific pattern - nights, weekends, or rotation.",
        "Be honest about any hard constraints up front.",
      ],
    };
  }
  if (/\b(travel|site visits?|field work|fieldwork|on-site visits?)\b/.test(jd)) {
    return {
      question: "Are you able to travel to sites as the role requires?",
      guidance: [
        "Confirm your travel radius and any limits.",
        "Mention reliable transport or a driving licence if relevant.",
      ],
    };
  }
  if (/\b(driv(e|ing)|driver'?s? licen[cs]e|valid driver)\b/.test(jd)) {
    return {
      question: "Do you hold a valid driving licence and reliable transport?",
      guidance: [
        "Confirm your licence class and current status.",
        "Only relevant when the job genuinely needs it.",
      ],
    };
  }
  if (/remote|hybrid|time ?zone/.test(`${mode} ${jd}`)) {
    return {
      question: "What time zone are you in, and can you cover the required hours?",
      guidance: [
        "State your location or time zone plainly.",
        "Confirm overlap with the team's core hours.",
      ],
    };
  }
  return {
    question: "When could you start, and what is your notice period?",
    guidance: [
      "Share your notice period honestly.",
      "Signal flexibility where you genuinely have it.",
    ],
  };
}

/**
 * Screening-call questions: the universal seven-question recruiter structure -
 * introduction, motivation for change, employer interest, role interest, the
 * primary job-specific requirement, a work condition, and compensation last.
 * Q3 and Q5/Q6 adapt to the employer and job description; nothing is fabricated.
 */
function buildScreeningQuestions(job: JobPosting, resume: ScoreResume): PrepQuestion[] {
  const confidential = isPlaceholderCompany(job.company);
  const published =
    job.salaryLabel && job.salaryLabel !== "Salary not disclosed" ? job.salaryLabel : "";

  return [
    {
      question: "Tell me about yourself.",
      guidance: [
        "Keep it to 60-120 seconds - this is a screening call.",
        "Lead with your current role or most relevant training, plus one real result.",
        "Close by connecting your background to why this role fits.",
      ],
    },
    {
      question: "Why are you looking for a new role?",
      guidance: [
        "Stay positive and future-focused - never criticise a current employer.",
        "Frame it around growth, scope, or alignment with your goals.",
      ],
    },
    confidential
      ? {
          question: "What interests you about this opportunity?",
          guidance: [
            "Tie the role's purpose to what you genuinely want next.",
            "Ask the recruiter about the employer if it is not yet named.",
          ],
        }
      : {
          question: `Why ${job.company}?`,
          guidance: [
            `Give one specific, genuine reason ${job.company} appeals to you.`,
            "Look up their product, mission, or recent news before the call.",
          ],
        },
    {
      question: "What interests you about this role?",
      guidance: [
        "Connect your supported background to the role's main duties.",
        "Show you understand what the job is actually for.",
      ],
    },
    primaryRequirementQ(job, resume),
    workConditionQ(job),
    {
      question: "What are your salary expectations?",
      guidance: [
        published
          ? `The posting lists ${published} - aim to stay reasonably aligned while weighing the whole package.`
          : "Ask the recruiter for the approved range first, then give a range - not a single number.",
        "Never quote a market figure you cannot back up.",
      ],
    },
  ];
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
  const confidential = isPlaceholderCompany(job.company);

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
      question: "How do you see your professional development going forward?",
      guidance: [
        `Name a specific direction that fits ${job.title}.`,
        confidential
          ? "Connect it to the scope this role would give you."
          : `Connect it to ${job.company}'s scale or focus.`,
        "Frame this role as the logical next step, not a lateral move.",
      ],
    },
    m0
      ? {
          question: `You delivered ${lower1(m0)} - what did you actually change?`,
          guidance: [
            "Walk through the situation, your action, and the result.",
            "Own your personal contribution, not just the team's.",
          ],
        }
      : {
          question: "Tell me about a project or responsibility you are most proud of.",
          guidance: [
            "Pick one with real scope and a clear outcome.",
            "Explain what you owned and how you knew it worked.",
          ],
        },
    {
      question: "How do you align stakeholders and drive a decision through?",
      guidance: [
        "Give one concrete cross-functional example.",
        teamPhrase
          ? `Show how you led ${teamPhrase} to a shared outcome.`
          : "Show how you built agreement, then owned the result.",
      ],
    },
    {
      question: "How would you handle competing priorities when a deadline is at risk?",
      guidance: [
        "Walk through how you'd triage, decide, and keep people informed.",
        `Ground it in a real example from your ${roleTitle} work.`,
      ],
    },
    confidential
      ? {
          question: "What attracts you to this team and environment?",
          guidance: [
            "Tie the mission or the work to what you want to own.",
            "Show you have thought about the fit, not just the title.",
          ],
        }
      : {
          question: `Why ${job.company}?`,
          guidance: [
            `Give a specific, genuine reason ${job.company} fits your goals.`,
            "Connect their mission or scale to the work you want to own.",
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
function buildTechnicalQuestions(
  job: JobPosting,
  resume: ScoreResume,
  acc: Accomplishments
): PrepQuestion[] {
  const field = fieldFromRole(resume.role);
  // Only weave the domain into phrasing when it's one clean word ("marketing"),
  // else fall back to generic wording so multi-word titles don't read awkwardly.
  const singleField = field && !field.includes(" ") ? field : "";
  const skills = resume.skills.filter(Boolean);
  const s3 = skills[2];
  const toolLike = skills.find((s) =>
    /crm|software|analytics|platform|tool|suite|excel|sql|tableau|salesforce|hubspot|automation|reporting|figma|cloud|autocad|epic|sap/i.test(
      s
    )
  );
  const skillForSetup = toolLike || skills[0];
  const m0 = acc.metrics[0];
  // Regulated / high-risk work gets a mandatory safety-and-compliance question
  // (spec §8); everything else gets a quality/accuracy question at that position.
  const regulated =
    /\b(safety|hazard|patient|clinical|electr|voltage|gas|pressure|scaffold|licen|complian|regulat|\bcode\b|osha|aviation|laborator|hygiene|sterile|infection)\b/.test(
      `${jdText(job)} ${resume.role.toLowerCase()}`
    );

  // Seven short, plain questions in the technical spec order: knowledge, process,
  // tools, troubleshooting, safety/quality, collaboration, measurement. Kept
  // deliberately short; non-engineering roles never default to coding.
  return [
    {
      question: singleField ? `How do you stay current in ${singleField}?` : "How do you stay current in your field?",
      guidance: ["Name one real source.", "An example you applied.", "Show you keep improving."],
    },
    {
      question: "Walk me through a recent project.",
      guidance: ["State the goal.", s3 ? `Mention ${s3}.` : "Name your main tools.", "Share the outcome."],
    },
    toolLike
      ? {
          question: `How do you use ${toolLike}?`,
          guidance: [`${toolLike} is on your resume.`, "Name the exact features.", "Give a quick example."],
        }
      : skillForSetup
        ? {
            question: `How do you apply ${skillForSetup}?`,
            guidance: [`${skillForSetup} is on your resume.`, "Name the techniques.", "Give a quick example."],
          }
        : {
            question: "Which tools are you strongest in?",
            guidance: ["Match the job's tools.", "Back each with an example.", "Keep it honest."],
          },
    {
      question: "How do you troubleshoot a problem?",
      guidance: ["Your checks, in order.", "One real example.", "How you confirmed the fix."],
    },
    regulated
      ? {
          question: "How do you keep work safe and compliant?",
          guidance: ["Follow procedures and codes.", "Escalate, don't cut corners.", "Only cite standards you use."],
        }
      : {
          question: "How do you keep your work accurate?",
          guidance: ["Name your checks.", "Give a real example.", "How you catch mistakes."],
        },
    {
      question: "How do you work with your team?",
      guidance: ["Who you coordinate with.", "How you avoid dropped handoffs.", "Keep everyone informed."],
    },
    {
      question: "How do you measure success?",
      guidance: ["The metrics you track.", m0 ? `Anchor in your ${lower1(m0)}.` : "Show a before/after.", "Why those metrics matter."],
    },
  ];
}

/**
 * Other-mode questions: the custom instruction is the whole blueprint, so the
 * seven questions all orbit the requested topic across different facets (setup,
 * process, tools, a real example, troubleshooting, measurement, communication).
 * The JD/resume supply context and evidence; nothing about the candidate is
 * assumed just because the topic names a tool.
 */
function buildOtherQuestions(customDetail?: string): PrepQuestion[] {
  const t = (customDetail || "").trim().replace(/\s+/g, " ").slice(0, 80);
  if (!t) {
    return [
      {
        question: "Walk me through how you'd approach this interview format.",
        guidance: ["Structure your answer clearly.", "Tie it back to the role and company."],
      },
      ...TYPE_QUESTIONS.other,
    ];
  }
  return [
    {
      question: `How would you get set up for ${t} from scratch?`,
      guidance: [
        "Name the first steps and what you'd put in place.",
        "Keep it grounded in what you have actually done.",
      ],
    },
    {
      question: `Walk me through your end-to-end process for ${t}.`,
      guidance: ["Explain your approach stage by stage.", "Show the outcome you aim for."],
    },
    {
      question: `Which tools or methods do you rely on for ${t}?`,
      guidance: ["Name the specific ones you know.", "Only claim what your resume supports."],
    },
    {
      question: `Tell me about a real example of ${t} you worked on.`,
      guidance: ["Pick one with a clear situation and result.", "Own your personal contribution."],
    },
    {
      question: `Something goes wrong midway through ${t} - how do you handle it?`,
      guidance: [
        "Describe how you diagnose and correct it.",
        "Show judgement, not a memorised script.",
      ],
    },
    {
      question: `How do you measure success for ${t}?`,
      guidance: ["Give the metrics or checks you'd use.", "Tie them to the outcome that matters."],
    },
    {
      question: `How do you keep others informed while working on ${t}?`,
      guidance: ["Name who you'd coordinate with.", "Show how you avoid dropped handoffs."],
    },
  ];
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
  customDetail?: string,
  resumeOnly = false
): InterviewPrep {
  const skills = topSkills(job, resume);
  const acc = extractAccomplishments(resume);
  const desc = stripHtml(job.description || job.summary || "");
  const roleSummary =
    desc.slice(0, 220) ||
    `${job.title} at ${job.company}. Prepare to connect your experience to this role's needs.`;

  const questions =
    type === "screening"
      ? buildScreeningQuestions(job, resume)
      : type === "manager"
        ? buildManagerQuestions(job, acc)
        : type === "technical"
          ? buildTechnicalQuestions(job, resume, acc)
          : buildOtherQuestions(customDetail);

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
    // Other mode omits the "questions to ask" section by default (spec §11).
    // Technical omits it too - both the resume-only and the company-specific
    // specs state Technical has no candidate-to-interviewer questions.
    candidateQuestions:
      type === "other" || type === "technical" ? [] : TYPE_CANDIDATE_QS[type],
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
  exclude: string[] = [],
  resumeOnly = false
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
          resumeOnly,
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

/** Hybrid entry point: AI prep when available, heuristic otherwise.
 *  `fast` skips the (multi-second) AI call and returns the instant heuristic -
 *  used for generic "Just practicing" prep, where the AI adds little over the
 *  built-in structure but would make the page wait 5-10s on the model. */
export async function getInterviewPrep(
  job: JobPosting,
  resume: ScoreResume,
  type: InterviewType,
  customDetail?: string,
  fast = false,
  resumeOnly = false
): Promise<InterviewPrep> {
  if (fast) return buildHeuristicPrep(job, resume, type, customDetail, resumeOnly);
  const ai = await callPrepAi(job, resume, type, customDetail, [], resumeOnly);
  return ai ?? buildHeuristicPrep(job, resume, type, customDetail, resumeOnly);
}

/** Callbacks for streamed practice questions (Option B). */
export interface PrepStreamHandlers {
  onQuestion: (q: PrepQuestion) => void;
  onCandidates: (items: string[]) => void;
}

/**
 * Stream resume-only ("Just practicing") questions so the UI paints each card as
 * it arrives, instead of waiting for the whole sheet. Returns the number of
 * questions received - 0 means nothing usable (no key, rate limit, network or
 * parse failure), and the caller should fall back to the blocking path.
 */
export async function streamInterviewPrep(
  job: JobPosting,
  resume: ScoreResume,
  type: InterviewType,
  handlers: PrepStreamHandlers,
  customDetail?: string
): Promise<number> {
  let count = 0;
  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task: "interviewPrep",
        payload: {
          job: { title: job.title, company: job.company },
          resume,
          interviewType: type,
          customDetail: customDetail || "",
          exclude: [],
          resumeOnly: true,
          stream: true,
        },
      }),
    });
    // No readable stream (no key / rate limited / server fell back to JSON) ->
    // signal the caller to use the blocking path.
    if (!res.ok || !res.body) return 0;
    if ((res.headers.get("content-type") || "").includes("application/json")) return 0;

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    // Enforce the spec's tip cap: Technical is exactly 2; Screening/Manager/Other
    // are at most 3. The model occasionally over-delivers, so cap it here.
    const tipCap = type === "technical" ? 2 : 3;

    // Candidate questions the model streamed on its final line (if any). Screening
    // and Manager must show EXACTLY 3; the streamed final line is occasionally
    // dropped or under-filled, so we reconcile against this after the stream ends.
    let candidatesSeen: string[] = [];

    const handleLine = (raw: string) => {
      const line = raw.trim();
      if (!line || line === "```" || /^```(?:json)?$/i.test(line)) return;
      let obj: unknown;
      try {
        obj = JSON.parse(line);
      } catch {
        return; // a partial or non-JSON line - skip it
      }
      if (!obj || typeof obj !== "object") return;
      const o = obj as Record<string, unknown>;
      if (o.type === "question" && typeof o.question === "string" && o.question.trim()) {
        count++;
        handlers.onQuestion({
          question: o.question.trim(),
          guidance: Array.isArray(o.guidance)
            ? o.guidance.map(String).filter(Boolean).slice(0, tipCap)
            : [],
          sample:
            typeof o.sample === "string" && o.sample.trim() ? o.sample.trim() : undefined,
        });
      } else if (o.type === "candidates" && Array.isArray(o.items)) {
        candidatesSeen = o.items.map(String).filter(Boolean).slice(0, 3);
        handlers.onCandidates(candidatesSeen);
      }
    };

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf("\n")) >= 0) {
        handleLine(buffer.slice(0, nl));
        buffer = buffer.slice(nl + 1);
      }
    }
    if (buffer.trim()) handleLine(buffer);

    // Guarantee the spec's count: Screening and Manager must show EXACTLY 3
    // candidate questions. When the stream drops or under-fills the final line,
    // top up from the standard set (deduped). Technical/Other have none by design.
    if (type === "screening" || type === "manager") {
      if (candidatesSeen.length < 3) {
        const filled = [...candidatesSeen];
        for (const q of TYPE_CANDIDATE_QS[type]) {
          if (filled.length >= 3) break;
          if (!filled.some((x) => x.toLowerCase() === q.toLowerCase())) filled.push(q);
        }
        handlers.onCandidates(filled.slice(0, 3));
      }
    }
    return count;
  } catch {
    return count;
  }
}

/** Fetch an additional batch of questions (for "Get more questions"). */
export async function getMoreQuestions(
  job: JobPosting,
  resume: ScoreResume,
  type: InterviewType,
  existing: string[],
  customDetail?: string,
  resumeOnly = false
): Promise<PrepQuestion[]> {
  const ai = await callPrepAi(job, resume, type, customDetail, existing, resumeOnly);
  if (ai) {
    return ai.questions.filter((q) => !existing.includes(q.question));
  }
  // Heuristic: rotate the pool, skipping ones already shown.
  return buildHeuristicPrep(job, resume, type, customDetail, resumeOnly).questions.filter(
    (q) => !existing.includes(q.question)
  );
}
