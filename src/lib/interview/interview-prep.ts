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
  company: { name: string; description: string; bullets: string[] };
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

/** Deterministic interview prep from the job + resume (AI fallback). */
export function buildHeuristicPrep(
  job: JobPosting,
  resume: ScoreResume,
  type: InterviewType,
  customDetail?: string
): InterviewPrep {
  const skills = topSkills(job, resume);
  const desc = stripHtml(job.description || job.summary || "");
  const roleSummary =
    desc.slice(0, 220) ||
    `${job.title} at ${job.company}. Prepare to connect your experience to this role's needs.`;

  const questions =
    type === "other" && customDetail
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

  return {
    company: {
      name: job.company,
      description: `${job.company} is hiring for ${job.title}${
        job.locationLabel ? ` (${job.locationLabel})` : ""
      }.`,
      bullets: [
        "Research the company's recent news and products before the call.",
        `Be ready to explain why ${job.company} specifically appeals to you.`,
        "Have one thoughtful question about their goals or team.",
      ],
    },
    role: {
      title: job.title,
      keySkills: skills,
      summary: roleSummary,
    },
    values: [
      "Clear communication and collaboration",
      "Ownership and follow-through",
      "Measurable impact over activity",
    ],
    mentions: [
      ...(resume.skills.slice(0, 3).map((s) => `Your experience with ${s}`) || []),
      "A concrete result with a number attached",
      "Why this role fits your trajectory",
    ].slice(0, 4),
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
  return {
    company: {
      name: String(company.name ?? job.company),
      description: String(company.description ?? ""),
      bullets: arr(company.bullets),
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
