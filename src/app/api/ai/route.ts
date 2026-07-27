import { NextResponse } from "next/server";
import {
  base64ExceedsLimit,
  FILE_TOO_LARGE_MESSAGE,
  isAllowedUploadType,
  UNSUPPORTED_FILE_MESSAGE,
} from "@/lib/upload-validation";
import { aiBodySchema, type Task } from "@/lib/schemas";
import { limit, clientIp } from "@/lib/rate-limit";
import { auth } from "@/auth";

// Cap AI calls to prevent cost-abuse (denial-of-wallet). Two windows:
//  - per-minute burst, generous enough that normal typing/autocomplete and
//    regeneration are never throttled;
//  - per-user DAILY quota, a hard cost guardrail so a single account (or IP)
//    cannot drain the Gemini budget over a day.
const AI_LIMIT = Number(process.env.AI_RATE_LIMIT ?? 120);
const AI_WINDOW_MS = 60_000;
const AI_DAILY_LIMIT = Number(process.env.AI_DAILY_LIMIT ?? 300);
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Server-side Gemini bridge for all AI features.
 * Reads GEMINI_API_KEY from the environment (never exposed to the client).
 * If the key is missing or the call fails, returns { fallback: true } so the
 * client can use its canned mock content and the app keeps working.
 */

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const ENDPOINT = (key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;

/** Optional file (e.g. an uploaded PDF) sent inline to the model. */
interface InlineFile {
  mimeType: string;
  data: string; // base64 (no data: prefix)
}

/**
 * Calls Gemini's generateContent endpoint with an optional inline file and
 * returns the joined text. Lowers temperature when a file is attached (faithful
 * extraction) and requests JSON output when `json` is set.
 */
async function gemini(
  key: string,
  prompt: string,
  json: boolean,
  file?: InlineFile
) {
  const parts: Record<string, unknown>[] = [];
  if (file) parts.push({ inlineData: { mimeType: file.mimeType, data: file.data } });
  parts.push({ text: prompt });

  const res = await fetch(ENDPOINT(key), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        // Extraction must be faithful, not creative → low temperature for parsing.
        temperature: file ? 0.1 : 0.8,
        ...(json ? { responseMimeType: "application/json" } : {}),
      },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text: string =
    data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text).join("") ??
    "";
  return text.trim();
}

/**
 * Maps a Task plus its payload to the Gemini prompt string and whether a JSON
 * response is expected. One case per supported AI feature (summary, bullets,
 * cover/resignation letters, resume extraction, autocomplete, etc.).
 */
/**
 * Compact, prompt-friendly rendering of the structured resume data passed to the
 * summary tasks. Missing sections are labelled so the model treats them as
 * genuinely absent (and stays generic) rather than inventing details.
 */
function summaryContextBlock(p: Record<string, unknown>): {
  block: string;
  hasData: boolean;
} {
  type Emp = {
    jobTitle?: string;
    company?: string;
    startDate?: string;
    endDate?: string;
    bullets?: string[];
  };
  type Edu = { degree?: string; institution?: string };
  const emp = Array.isArray(p.employment) ? (p.employment as Emp[]) : [];
  const skills = Array.isArray(p.skills)
    ? (p.skills as string[]).filter(Boolean)
    : [];
  const edu = Array.isArray(p.education) ? (p.education as Edu[]) : [];

  const empLines = emp.length
    ? emp
        .map((e) => {
          const head = `- ${e.jobTitle || "Role"}${e.company ? ` at ${e.company}` : ""} (${e.startDate || "?"} - ${e.endDate || "?"})`;
          const bullets = Array.isArray(e.bullets) ? e.bullets.filter(Boolean) : [];
          return [head, ...bullets.map((b) => `   * ${b}`)].join("\n");
        })
        .join("\n")
    : "(none provided)";
  const eduLine = edu.length
    ? edu
        .map((e) => [e.degree, e.institution].filter(Boolean).join(", "))
        .filter(Boolean)
        .join("; ")
    : "(none provided)";

  const block = `Employment history (most recent first):
${empLines}

Skills: ${skills.length ? skills.join(", ") : "(none provided)"}
Education: ${eduLine}`;
  return {
    block,
    hasData: emp.length > 0 || skills.length > 0 || edu.length > 0,
  };
}

function buildPrompt(task: Task, p: Record<string, unknown>): { prompt: string; json: boolean } {
  const role = (p.jobTitle as string) || "professional";
  switch (task) {
    case "summary": {
      const { block, hasData } = summaryContextBlock(p);
      return {
        json: false,
        prompt: `You are a certified professional resume writer and ATS optimization expert. Write a resume Professional Summary for the candidate below. Target role: ${role}. Tone: ${p.tone || "confident"}.

Build the summary from the STRONGEST available inputs, in this priority order:
1. The target role above.
2. The most recent job title and its achievements (from the employment history).
3. Skills and tools.
4. Education and background.
Lead with the higher-priority inputs; do not fall back to generic phrasing when real data exists.

Silent analysis first (do not print any of it):
- Infer career level from titles and tenure (0-1y entry, 2-4y early, 5-10y mid, 10-15y senior, 15y+ executive; a target role different from past titles means career change - emphasise transferable strengths).
- Choose ONE power adjective that fits the role (e.g. Strategic, Results-driven, Analytical, Innovative, Dynamic, Motivated) and open with it.

Rules:
- 2 to 4 sentences (about 70-100 words). Third person, active voice, no pronouns ("I", "my", "me"). Plain prose - no markdown, headings, or lists.
- Open with the power adjective plus the professional title; state years of experience WHEN the employment dates make it inferable, otherwise lead with the role.
- Weave in the 2-3 strongest skill themes the data supports and end with a value statement tied to the target role.
- Include a measurable achievement ONLY if it appears in the bullets below. Do NOT invent companies, metrics, years of experience, certifications, or tools. Quantify only when the data supports it; otherwise use qualitative impact.
- Avoid generic filler words (hardworking, dedicated) and buzzword-heavy phrasing.${hasData ? "" : "\n- Little structured data was provided: write a solid but GENERIC summary for the target role, keep claims modest, and do not fabricate specifics."}

${block}

Return only the summary text.`,
      };
    }
    case "improveSummary": {
      const { block } = summaryContextBlock(p);
      return {
        json: false,
        prompt: `You are a certified professional resume writer and ATS optimization expert. Improve this resume Professional Summary. Keep it truthful to the candidate's resume data below - never invent employers, metrics, achievements, years of experience, certifications, or tools the data does not support.
Tone: ${p.tone || "confident"}. 2-4 sentences (about 70-100 words), third person, active voice, no pronouns ("I", "my", or "me"), plain prose, no markdown.
Open with a power adjective plus the professional title; state years of experience when inferable; highlight the 2-3 strongest skill themes and end on value tied to the target role. Quantify only when the data supports it, otherwise use qualitative impact. Avoid generic words (hardworking, dedicated).

Build from the STRONGEST available inputs, in priority order: (1) target role, (2) most recent job title and its achievements, (3) skills and tools, (4) education and background, (5) the user instruction. If the current summary text names a DIFFERENT role or conflicts with the resume data, prefer the target role and employment history over the existing text.
${p.instruction ? `Also follow this free-form instruction from the user: "${p.instruction}". Interpret casual/imperfect wording charitably and apply exactly what the user asks - this is the user's OWN resume, so honour explicit edits such as a specific number of years of experience, a point to emphasise, the length, or the tone, even when it differs from the dates below. Do NOT, on your own initiative, invent additional employers, companies, metrics, achievements, tools, or certifications the user did not ask for and the data does not support.` : ""}

${block}
Target role: ${role}

Current summary:
"""${p.text || ""}"""

Return only the improved summary text.`,
      };
    }
    case "bullets": {
      // No job title on the entry -> generic, transferable bullets. We never
      // fall back to the candidate's desired job title: these suggestions
      // describe THIS job, not the one they are applying for.
      const titled = Boolean((p.jobTitle as string)?.trim());
      const page = Number(p.page ?? 0);
      const existing = Array.isArray(p.existing)
        ? (p.existing as string[]).map((b) => String(b).trim()).filter(Boolean)
        : [];
      const hasExisting = existing.length > 0;
      return {
        json: true,
        prompt: `You are a professional resume writer and hiring manager who reviews thousands of resumes daily. Suggest 7 strong, achievement-oriented resume bullet points ${
          titled
            ? `for a ${role}${p.company ? ` at ${p.company}` : ""}`
            : "that would suit any professional role, describing transferable impact (ownership, collaboration, process improvement, measurable results)"
        }.
${
  hasExisting
    ? `The candidate's resume ALREADY lists these bullets for this exact role:
${existing.map((b) => `- ${b}`).join("\n")}
Generate 7 ADDITIONAL bullets that clearly build on the experience above: reuse the same tools, platforms, metrics, domain and seniority shown, cover responsibilities or achievements NOT already mentioned, and never duplicate or lightly reword an existing bullet.`
    : ""
}
Silent analysis first: infer the career level and industry from the job title and company, and match verbs and keywords to them.
Construction rules for every bullet:
- Begin with a strong action verb; one concise line of 10-20 words.
- Structure: [Action Verb] + [What You Did] + [How You Did It] + [Purpose or Outcome].
- Focus on responsibilities and real contributions; include a concrete or quantified outcome only where it is natural and supported - never invent numbers, employers, or tools.
- Present tense for a current role, past tense for previous roles. No pronouns (I, my, me). No filler ("responsible for", "helped with"). Vary the action verbs and include role/industry keywords for ATS.
${page > 0 ? `These must be different from the first ${page * 7} you would normally give - go for less obvious angles.` : ""}
Return a JSON array of 7 strings only. No markdown.`,
      };
    }
    case "improveBullets":
      return {
        json: true,
        prompt: `You are a professional resume writer and ATS optimization specialist. Rewrite these resume bullet points to be stronger, more action-driven, and ATS-friendly, keeping the original meaning.
Rules:
- Each bullet starts with a strong action verb; format [Action Verb] + [What You Did] + [Outcome/Impact]; one line, 10-15 words.
- Condense duplicate or near-identical bullets into one sharper statement; remove filler ("successfully", "responsible for", "worked to").
- Present tense for current roles, past tense for previous ones. Preserve any numbers the candidate already included; never invent new numbers, tools, or employers.
Return a JSON array of strings (roughly one per original bullet; merge only true duplicates). No markdown.

Bullets:
"""${p.text || ""}"""`,
      };
    case "skills": {
      // `seed` increments with each "Regenerate", so ask for a genuinely
      // different set instead of returning the same obvious seven.
      const round = Number(p.seed ?? 0);
      return {
        json: true,
        prompt: `You are a professional resume writer and ATS optimization expert. Suggest resume skills for a ${role}.
Silent analysis first: infer the role type and industry from the title and choose the skills a hiring manager for this role actually screens for.
Return JSON: { "hard": [7 technical/role-specific skills], "soft": [7 interpersonal/strategic skills] }.
Rules: Title Case, 1-3 words each, no commas inside a skill, no duplicates, and no generic filler buzzwords ("Team Player", "MS Office", "Multitasking"). Do not repeat any skill in this exclude list: ${JSON.stringify(p.exclude || [])}.
${round > 0 ? `This is refresh number ${round}: avoid the most obvious picks you would normally list first, rotate between interchangeable synonyms, and suggest less common but still relevant skills.` : ""}`,
      };
    }
    case "suggest": {
      const kind = (p.kind as string) || "jobTitle";
      const query = (p.query as string) || "";
      const KIND_LABEL: Record<string, string> = {
        jobTitle: "professional job titles",
        location: "real city / location names (City, State or City, Country)",
        institution: "real universities, colleges or schools",
        degree: "academic degrees or fields of study (e.g. \"Bachelor of Science in Computer Science\")",
        company: "well-known real company names",
        language: "human languages",
        field: "fields of study",
      };
      const label = KIND_LABEL[kind] || "relevant options";
      return {
        json: true,
        prompt: `Autocomplete a resume "${kind}" field. The user has typed: "${query}".
Return up to 6 realistic ${label} that start with or closely match "${query}", ordered by relevance.
Each item: 1-6 words, correctly capitalized, real and commonly used, no duplicates, no numbering, no explanations.
Return a JSON array of strings only.`,
      };
    }
    case "coverLetter": {
      const targeted = !!p.hasSpecificJob;
      const company = (p.companyName as string) || "";
      const hiringManager = (p.hiringManagerName as string) || "";
      const greeting = hiringManager ? `Dear ${hiringManager},` : "Dear Hiring Manager,";
      return {
        json: false,
        prompt: `Write a professional cover letter body for a ${role}.
${targeted ? `It targets a specific posting${company ? ` at ${company}` : ""}.` : "It is a general, reusable letter (no specific company)."}
Open with the greeting "${greeting}" on its own line.
Use these inputs:
- Top skills: ${JSON.stringify(p.skills || [])}
- Strengths: ${JSON.stringify(p.strengths || [])}
- Years of experience: ${p.experience || "unspecified"}
- Recent role: ${JSON.stringify(p.recentJob || {})}
- Education: ${JSON.stringify(p.education || {})}
${targeted && p.jobDescription ? `- Job description:\n"""${p.jobDescription}"""` : ""}
Structure: greeting, an introduction stating interest in the ${role} role, a paragraph on experience, a paragraph weaving in the skills and strengths, a short paragraph on education, and an enthusiastic closing. End with a signature line of the candidate's full name.
Plain text only (no markdown, no headings, no placeholders like [Name]). 4-6 short paragraphs.`,
      };
    }
    case "parseResume": {
      return {
        json: true,
        prompt: `Extract cover-letter inputs from the resume below.
Return JSON with EXACTLY these keys:
{
  "education": { "level": "college" | "highschool" | "student" | "none", "university": string, "field": string },
  "recentJob": { "jobTitle": string, "company": string },
  "experience": "~1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10+",
  "skills": [3 most relevant hard skills as short strings],
  "strengths": [3 personality strengths/soft traits as single words or short phrases],
  "personal": { "firstName": string, "lastName": string, "email": string, "phone": string, "address": string }
}
Use "" for anything not present. "experience" must be one of the listed string values (estimate from work history; "10+" for senior). No markdown, no extra keys.

Resume:
"""${(p.resumeText as string) || (p.resumeTitle as string) || ""}"""`,
      };
    }
    case "extractResume": {
      return {
        json: true,
        prompt: `You are a precise resume parser. Extract the candidate's REAL information from the attached resume document (and/or the text below) into JSON with EXACTLY these keys:
{
  "firstName": string,
  "lastName": string,
  "jobTitle": string,            // current or most recent / target role
  "email": string,
  "phone": string,
  "linkedin": string,            // URL or handle if present
  "location": string,            // "City, ST" or "City, Country"
  "summary": string,             // the professional summary as plain text (no markdown)
  "employment": [                // most recent first
    {
      "jobTitle": string,
      "company": string,
      "location": string,
      "startDate": string,       // exactly as written, e.g. "2020" or "Mar 2021"
      "endDate": string,         // e.g. "Present"
      "bullets": [string]        // each responsibility/achievement, plain text, no leading bullet glyphs
    }
  ],
  "skills": [string],            // short skill names (1-4 words), de-duplicated
  "education": [
    {
      "institution": string,
      "degree": string,          // e.g. "Bachelor of Business Administration (BBA), Marketing"
      "location": string,
      "startDate": string,
      "endDate": string,
      "description": string      // plain text, "" if none
    }
  ],
  "courses": [                   // courses, certifications, training - [] if none
    {
      "course": string,          // course / certification name
      "institution": string,     // provider, e.g. "Coursera", "HubSpot Academy"
      "startDate": string,       // "" if none
      "endDate": string          // "" if none
    }
  ],
  "languages": [                 // spoken languages - [] if none
    {
      "language": string,        // e.g. "English"
      "proficiency": string      // e.g. "Native", "Highly proficient", "" if none
    }
  ],
  "hobbies": [string],           // interests / hobbies as short phrases - [] if none
  "references": [                // referees - [] if none
    {
      "name": string,
      "company": string,         // company / relationship
      "email": string,
      "phone": string
    }
  ],
  "links": [                     // websites / portfolio / social links (NOT the main LinkedIn above) - [] if none
    {
      "title": string,           // e.g. "Portfolio", "GitHub"
      "url": string
    }
  ]
}
Rules: COPY real data verbatim (names, companies, dates, bullet text) - do NOT invent, summarize away, or substitute placeholder/sample data. Use "" or [] for anything genuinely absent. Extract EVERY section present in the resume - courses, certifications, languages, hobbies/interests, references and links must each be captured into their key, not dropped or merged into skills. Merge "Core Skills", "Tools & Platforms" into skills if no dedicated skills list exists. Return JSON only, no markdown, no extra keys.

Resume text (may be empty if a document is attached):
"""${(p.resumeText as string) || ""}"""`,
      };
    }
    case "rewriteBullets": {
      const instruction =
        (p.instruction as string) || "Make them stronger and more impactful";
      const bullets = (p.bullets as string[]) || [];
      return {
        json: true,
        prompt: `Rewrite the following resume bullet points for a ${role}.
Instruction: ${instruction}.
Rules: keep every fact truthful - do NOT invent companies, metrics, or responsibilities that aren't implied by the originals. Keep them ATS-friendly, each starting with a strong action verb, concrete and outcome-focused. Return a JSON array of strings (one rewritten bullet per original, or fewer if merging tightens them). No markdown, no numbering, no leading bullet glyphs.

Bullets:
${JSON.stringify(bullets)}`,
      };
    }
    case "rankChips": {
      const kind = (p.kind as string) || "skills";
      const options = (p.options as string[]) || [];
      return {
        json: true,
        prompt: `A candidate is applying for a "${role}" role. From the ${kind} list below, return the SAME strings reordered so the most relevant to a ${role} come first. Do not invent new items, do not drop any, keep exact spelling.
Return a JSON array of strings only (the full reordered list). No markdown.

${kind}:
${JSON.stringify(options)}`,
      };
    }
    case "resignationLetter": {
      const fullName = (p.fullName as string) || "the employee";
      const company = (p.companyName as string) || "";
      const position = (p.position as string) || "my position";
      const salutation = (p.salutation as string) || "Dear Hiring Manager,";
      const lastDay = (p.lastWorkingDay as string) || "my final working day";
      const reason = (p.reason as string) || "";
      const reasonText = (p.reasonText as string) || "";
      const gratitude = (p.gratitude as string[]) || [];
      const gratitudeText = (p.gratitudeText as string) || "";
      const assistance = !!p.assistance;
      const assistanceText = (p.assistanceText as string) || "";
      return {
        json: false,
        prompt: `Write the BODY of a professional, warm, and concise resignation letter as plain text.
Candidate full name: ${fullName}.
Open with this salutation on its own line: "${salutation}".
First paragraph: formally state resignation from the position of ${position}${company ? ` at ${company}` : ""}, clearly stating the last working day is ${lastDay}.
${
  reasonText
    ? `Use the following reason paragraph as the second paragraph, preserving its meaning and keeping the tone positive and professional (light polishing only): "${reasonText}".`
    : reason
      ? `Include one brief, positive, professional sentence referencing the reason for leaving: "${reason}". Keep it gracious - never negative.`
      : ""
}
${
  gratitudeText
    ? `Use the following gratitude paragraph, preserving its meaning and warm, professional tone (light polishing only): "${gratitudeText}".`
    : gratitude.length
      ? `Add a sincere paragraph of gratitude touching on: ${gratitude.join(", ")}.`
      : ""
}
${
  assistance && assistanceText
    ? `Use the following paragraph offering transition help, preserving its meaning and professional tone (light polishing only): "${assistanceText}".`
    : assistance
      ? `Add a short paragraph offering to help ensure a smooth transition (e.g. training a replacement, wrapping up pending work).`
      : ""
}
Close with a courteous sign-off (e.g. "Sincerely,") and the candidate's full name on the final line.
Plain text only - no markdown, no subject line, no recipient address block, no date line, no email. 3 to 5 short paragraphs.`,
      };
    }
    case "improveText": {
      const instruction =
        (p.instruction as string) || "Improve the writing while keeping the original meaning";
      return {
        json: false,
        prompt: `${instruction}. Keep it professional and warm. Return ONLY the revised text as plain text - no markdown, no preamble, no quotes, preserve paragraph breaks.

Text:
"""${(p.text as string) || ""}"""`,
      };
    }
    case "extractJobPosting":
      return {
        json: false,
        prompt: `Extract the full text of the attached job posting (and/or the text below) as plain text.
Keep the job title, company, responsibilities, and requirements. Drop navigation, cookie banners, and unrelated page furniture.
Return ONLY the posting text - no markdown, no preamble, no commentary.

${(p.text as string) || ""}`,
      };
    case "tailor": {
      // Achievements must be REFRAMED from the candidate's real bullets, never
      // invented - so they are only requested when real bullets were supplied.
      const bullets = (p.bullets as string[]) || [];
      return {
        json: true,
        prompt: `You are a professional resume writer and ATS optimization expert. Tailor a resume to this job posting.
Return JSON: {
  "summary": "a rewritten 2-4 sentence professional summary aligned to the job (no markdown)",
  "keywords": [8 important ATS keywords/skills pulled from the job description to include],
  "achievements": [${
    bullets.length
      ? "up to 3 of the candidate's OWN bullets below, rewritten to foreground what this posting asks for"
      : "leave this an empty array"
  }]
}.
Rules: every fact must stay truthful. Mirror the job posting's own terminology and keywords, and frame each rewritten achievement with the STAR logic (situation/task, action, result) using ONLY what the candidate already provided. For a career change (target role far from past titles), emphasise transferable strengths. Do NOT invent companies, metrics, tools, or responsibilities that are not already present in the candidate's material. Reframe and re-emphasise only. Preserve existing numbers exactly.
Job description:
"""${p.jobDescription || ""}"""
Candidate's current summary:
"""${p.summary || ""}"""
Candidate's real experience bullets:
${JSON.stringify(bullets)}`,
      };
    }
    case "scoreJob": {
      const resume =
        (p.resume as {
          role?: string;
          skills?: string[];
          summary?: string;
          experience?: string;
        }) || {};
      const job =
        (p.job as { title?: string; company?: string; description?: string }) || {};
      return {
        json: true,
        prompt: `You are a resume-to-job match analyst. Compare the candidate resume to the job posting and return an explainable match scoreboard as JSON with EXACTLY these keys:
{
  "score": number,            // 0-100 overall match
  "label": string,            // one of "Perfect match","Strong match","Good match","Partial match","Low match"
  "summary": string,          // 2-3 sentences: why it's a match and the main gap. Specific, not generic.
  "categories": [
    { "name": "Position", "items": [ { "label": string, "matched": boolean } ] },
    { "name": "Requirements", "items": [ { "label": string, "matched": boolean } ] },
    { "name": "Responsibilities", "items": [ { "label": string, "matched": boolean } ] }
  ],
  "mainGaps": [string]        // labels of the most important missing items
}
Rules: 4-6 items per category, drawn from the job posting. Set "matched": true only when the resume shows clear evidence (a named skill, a matching title, or described experience). Base "score" on weighted fit (Position 30%, Requirements 35%, Responsibilities 25%, bonus 10%). Keep "summary" specific to this candidate and job, never generic. Return JSON only, no markdown.

CANDIDATE RESUME:
role: ${resume.role || ""}
skills: ${JSON.stringify(resume.skills || [])}
summary: """${resume.summary || ""}"""
experience: """${(resume.experience || "").slice(0, 4000)}"""

JOB POSTING:
title: ${job.title || ""}
company: ${job.company || ""}
description: """${(job.description || "").slice(0, 4000)}"""`,
      };
    }
    case "interviewPrep": {
      const job =
        (p.job as {
          title?: string;
          company?: string;
          location?: string;
          salary?: string;
          seniority?: string;
          description?: string;
        }) || {};
      const resume =
        (p.resume as {
          role?: string;
          skills?: string[];
          summary?: string;
          experience?: string;
        }) || {};
      const type = (p.interviewType as string) || "screening";
      const custom = (p.customDetail as string) || "";
      const exclude = (p.exclude as string[]) || [];
      const more = exclude.length > 0;

      // Universal, occupation-independent question structure per interview type.
      // Each keeps a FIXED purpose per position; wording adapts to the occupation,
      // seniority and evidence. Colours/layout are set by the app, never by the AI.
      const STRUCTURE: Record<string, string> = {
        screening: `SCREENING CALL - universal recruiter-level 7-question structure (keep this order and purpose):
1) "Tell me about yourself."
2) "Why are you looking for a new role?" (positive, future-focused)
3) "Why <ACTUAL EMPLOYER>?" - use the real hiring company; if it is confidential/unknown use "What interests you about this opportunity?"
4) "What interests you about this role?"
5) The single most important job-specific requirement, chosen in priority order: mandatory licence/certification/registration/clearance, else required years/type of experience, else a critical language, else the core skill/tool. NEVER state a licence is active unless the resume confirms it.
6) The most important remaining work condition: work authorisation, location/relocation, remote/hybrid/on-site, shift/weekend/on-call, travel, driving licence, or start date/notice.
7) "What are your salary expectations?" - if a range is published reference it; never invent a market figure.
Keep every question recruiter-level; do NOT turn this into a technical exam.`,
        manager: `MEETING WITH A MANAGER - 7-question manager-stage structure (depth, ownership, judgement):
1) "Tell me about yourself." (entry-level: lead with projects/placements)
2) Current or most relevant experience: "Walk me through your current role at <employer>." (or most recent / a key project)
3) Motivation and development (age- and level-neutral)
4) Deep-dive on the STRONGEST VERIFIED achievement/project from the resume - convert a real metric into a follow-up ("You did X - what changed?"); if no metric, ask about a project they are proud of. Never invent a number.
5) A behavioural ownership/collaboration/leadership competency drawn from the JD (specific enough to produce a real example).
6) A role-specific SITUATIONAL scenario built from a central JD responsibility (planning/judgement/prioritisation - not technical trivia).
7) Company motivation ("Why <employer>?") or the most important uncovered competency.
Avoid salary, work-authorisation and simple logistics (those belong to screening).`,
        technical: `TECHNICAL / PRACTICAL - 7 open-ended, non-duplicate questions covering the role's real competencies:
1) Professional knowledge / staying current in the field.
2) The core end-to-end process the role performs.
3) A key tool, equipment, software or method from the JD/resume.
4) A troubleshooting / practical scenario (diagnose then correct).
5) Safety, compliance, code or quality/accuracy - for regulated or high-risk work (nursing, trades, electrical, construction, aviation, lab) this MUST be a safety/compliance question; otherwise a quality/verification question.
6) Collaboration, handoff or stakeholder coordination.
7) Measurement, results or verification.
This is occupation-aware: for a nurse use clinical process/safety, a plumber uses diagnosis/codes/pressure-testing, an engineer uses design/calculations/standards - NEVER default to software/coding unless the role is software. Prefer "guidance" points over long scripted "sample" answers (a memorised technical answer encourages unsupported claims). Never invent a licence, tool, procedure or metric.`,
        other: `OTHER (custom) - the user's custom instruction below is the PRIMARY blueprint. Custom instruction: "${custom || "(none given - use a general practical set)"}".
Generate 7 non-duplicate questions that cover the requested topic/subtopics and format across facets (setup, process, tools, a real scenario, troubleshooting, measurement, communication). Use the JD only for realistic role context and terminology, and the resume only for verified evidence. Do NOT claim the candidate has used a tool just because the instruction names it. Include short "sample" answers only if the instruction asks for them. Return "candidateQuestions": [] for this type.`,
      };

      return {
        json: true,
        prompt: `Generate a job-specific interview-prep sheet as JSON with EXACTLY these keys:
{
  "company": { "name": string, "description": string, "bullets": [3-4 short things to know / research before the call], "founded": "optional - only if reliably known", "headquarters": "optional", "employees": "optional" },
  "role": { "title": string, "keySkills": [6-12 key skills/requirements for this role], "summary": string },
  "values": [4-5 workplace qualities the employer values - separate from skills],
  "mentions": [3-5 strongest resume-grounded points to mention, incl. honest gap-positioning when a key requirement is missing],
  "questions": [ { "question": string, "guidance": [2-3 short coaching lines], "sample": "optional short first-person sample answer grounded ONLY in the resume" } ],
  "candidateQuestions": [3 questions the candidate can ask the interviewer]
}

First silently classify the occupation, industry, specialisation, seniority, work environment and whether the role is regulated/high-risk, so wording never borrows marketing/software/office language for an unrelated job.

${STRUCTURE[type] ?? STRUCTURE.screening}

Generate ${more ? "3-5 ADDITIONAL" : "EXACTLY 7"} question(s).${more ? ` Do NOT repeat or paraphrase any of these already-shown questions: ${JSON.stringify(exclude)}.` : ""} No two questions may test the same thing with different wording.
Keep it SHORT and simple: each "question" is one plain line of about 5-9 words (no compound "and ... and" questions), and each "guidance" line is 3-6 words in everyday language. Short beats thorough here.
Rules: Do NOT invent company facts (founded year, HQ, employees, clients, revenue) - omit them if unknown. Base "mentions" and any "sample" answers ONLY on the candidate resume - never fabricate experience, metrics, employers, tools, licences or years. Treat a JD requirement as something to VERIFY, not as candidate experience. For regulated/high-risk roles never assert an active licence and never give unsafe procedural instructions. Return JSON only, no markdown.

JOB:
title: ${job.title || ""}
company: ${job.company || ""}
location: ${job.location || ""}
salary: ${job.salary || ""}
seniority: ${job.seniority || ""}
description: """${(job.description || "").slice(0, 3500)}"""

CANDIDATE:
role: ${resume.role || ""}
skills: ${JSON.stringify(resume.skills || [])}
summary: """${(resume.summary || "").slice(0, 1200)}"""
experience: """${(resume.experience || "").slice(0, 2500)}"""`,
      };
    }
  }
}

/** Health check: GET /api/ai verifies the key + configured model can generate. */
export async function GET() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ hasKey: false, ok: false, model: MODEL });
  try {
    const sample = await gemini(key, "Reply with the single word OK.", false);
    return NextResponse.json({ hasKey: true, ok: true, model: MODEL, sample });
  } catch (err) {
    return NextResponse.json({
      hasKey: true,
      ok: false,
      model: MODEL,
      error: err instanceof Error ? err.message.slice(0, 200) : String(err),
    });
  }
}

/**
 * POST /api/ai - runs one AI task. Returns { fallback: true } whenever the key
 * is missing or generation ultimately fails, so the client uses canned content
 * instead of erroring. Parses JSON-mode replies (stripping ```json fences).
 */
export async function POST(req: Request) {
  // Identity for rate limiting: the signed-in account when available (so limits
  // follow the user across IPs), else the client IP. Anonymous use is still
  // allowed - AI features work before sign-in - but is capped per IP.
  const session = await auth();
  const identity = session?.user?.email ?? clientIp(req);

  // Per-minute burst cap.
  const perMinute = await limit(`ai:min:${identity}`, AI_LIMIT, AI_WINDOW_MS);
  if (!perMinute.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(perMinute.resetMs / 1000)) },
      }
    );
  }

  // Per-user daily quota (the Gemini cost guardrail).
  const perDay = await limit(`ai:day:${identity}`, AI_DAILY_LIMIT, DAY_MS);
  if (!perDay.ok) {
    return NextResponse.json(
      {
        error: "daily_limit",
        message:
          "You have reached today's AI usage limit. Please try again tomorrow.",
      },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(perDay.resetMs / 1000)) },
      }
    );
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ fallback: true });

  try {
    // Validate the body at the trust boundary: reject an unknown task or a
    // malformed shape with a 400 instead of letting it fall through buildPrompt.
    const parsed = aiBodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }
    const { task, payload } = parsed.data;
    const file = payload.file as InlineFile | undefined;

    // Upload safety: only accept the document types the pickers offer (PDF /
    // Word / text). Reject anything else - an executable, an archive, a spoofed
    // image - before it is forwarded inline to the model. 415 Unsupported.
    if (file?.data && !isAllowedUploadType(file.mimeType)) {
      return NextResponse.json(
        { error: "UNSUPPORTED_FILE_TYPE", message: UNSUPPORTED_FILE_MESSAGE },
        { status: 415 }
      );
    }

    // Defence in depth: the client blocks oversized files, but re-check the
    // decoded size here so a bypassed frontend can't push a huge upload to the
    // model. 413 with a plain-language message (never a raw byte count).
    if (file?.data && base64ExceedsLimit(file.data)) {
      return NextResponse.json(
        { error: "FILE_TOO_LARGE", message: FILE_TOO_LARGE_MESSAGE },
        { status: 413 }
      );
    }

    const { prompt, json } = buildPrompt(task, payload);
    const inline = file?.data ? file : undefined;

    // Retry with backoff on transient failures (rate limit / overload / timeout)
    // before falling back, so a single throttled window doesn't break the edit.
    let text = "";
    let lastErr: unknown = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        text = await gemini(key, prompt, json, inline);
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
        const msg = e instanceof Error ? e.message : String(e);
        const transient = /\b(429|500|503)\b|RESOURCE_EXHAUSTED|UNAVAILABLE|overloaded/i.test(msg);
        if (!transient || attempt === 2) break;
        await new Promise((r) => setTimeout(r, 900 * (attempt + 1)));
      }
    }
    if (lastErr) throw lastErr;
    if (json) {
      const cleaned = text.replace(/^```json\s*|\s*```$/g, "");
      return NextResponse.json({ data: JSON.parse(cleaned) });
    }
    return NextResponse.json({ data: text });
  } catch (err) {
    console.error("[/api/ai]", err);
    return NextResponse.json({ fallback: true });
  }
}
