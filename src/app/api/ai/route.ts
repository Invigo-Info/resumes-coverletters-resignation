import { NextResponse } from "next/server";

/**
 * Server-side Gemini bridge for all AI features.
 * Reads GEMINI_API_KEY from the environment (never exposed to the client).
 * If the key is missing or the call fails, returns { fallback: true } so the
 * client can use its canned mock content and the app keeps working.
 */

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const ENDPOINT = (key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;

type Task =
  | "summary"
  | "improveSummary"
  | "bullets"
  | "improveBullets"
  | "skills"
  | "tailor"
  | "suggest"
  | "coverLetter"
  | "parseResume"
  | "extractResume"
  | "extractJobPosting"
  | "rewriteBullets"
  | "rankChips"
  | "resignationLetter"
  | "improveText"
  | "scoreJob"
  | "interviewPrep";

/** Optional file (e.g. an uploaded PDF) sent inline to the model. */
interface InlineFile {
  mimeType: string;
  data: string; // base64 (no data: prefix)
}

interface Body {
  task: Task;
  payload: Record<string, unknown>;
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
function buildPrompt(task: Task, p: Record<string, unknown>): { prompt: string; json: boolean } {
  const role = (p.jobTitle as string) || "professional";
  switch (task) {
    case "summary":
      return {
        json: false,
        prompt: `Write a concise, ATS-friendly resume professional summary for a ${role}.
Tone: ${p.tone || "confident"}. 2-4 sentences, first-person implied (no "I"), no markdown, no headings.
Focus on impact, key skills, and years of experience. Return only the summary text.`,
      };
    case "improveSummary":
      return {
        json: false,
        prompt: `Improve and tighten this resume professional summary while keeping the facts.
Never invent employers, metrics, or achievements that are not already in the text.
Make it more impactful, ATS-friendly, ${p.tone || "confident"} in tone, 2-4 sentences, no markdown.
${p.instruction ? `Follow this instruction from the user: ${p.instruction}` : ""}
Return only the improved summary text.

Current summary:
"""${p.text || ""}"""`,
      };
    case "bullets": {
      // No job title on the entry -> generic, transferable bullets. We never
      // fall back to the candidate's desired job title: these suggestions
      // describe THIS job, not the one they are applying for.
      const titled = Boolean((p.jobTitle as string)?.trim());
      const page = Number(p.page ?? 0);
      return {
        json: true,
        prompt: `Suggest 4 strong, achievement-oriented resume bullet points ${
          titled
            ? `for a ${role}${p.company ? ` at ${p.company}` : ""}`
            : "that would suit any professional role, describing transferable impact (ownership, collaboration, process improvement, measurable results)"
        }.
Each bullet starts with a strong action verb and includes a concrete/quantified outcome where natural.
${page > 0 ? `These must be different from the first ${page * 4} you would normally give - go for less obvious angles.` : ""}
Return a JSON array of 4 strings only. No markdown.`,
      };
    }
    case "improveBullets":
      return {
        json: true,
        prompt: `Rewrite these resume bullet points to be stronger, more action-driven, quantified, and ATS-friendly.
Keep the original meaning. Return a JSON array of strings (one per bullet). No markdown.

Bullets:
"""${p.text || ""}"""`,
      };
    case "skills": {
      // `seed` increments with each "Regenerate", so ask for a genuinely
      // different set instead of returning the same obvious seven.
      const round = Number(p.seed ?? 0);
      return {
        json: true,
        prompt: `Suggest resume skills for a ${role}.
Return JSON: { "hard": [7 technical/role-specific skills], "soft": [7 interpersonal skills] }.
Short skill names only (1-3 words). No duplicates with: ${JSON.stringify(p.exclude || [])}.
${round > 0 ? `This is refresh number ${round}: avoid the most obvious picks you would normally list first and suggest less common but still relevant skills.` : ""}`,
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
  ]
}
Rules: COPY real data verbatim (names, companies, dates, bullet text) — do NOT invent, summarize away, or substitute placeholder/sample data. Use "" or [] for anything genuinely absent. Merge "Core Skills", "Tools & Platforms" and "Certifications" into skills if no dedicated skills list exists. Return JSON only, no markdown, no extra keys.

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
Rules: keep every fact truthful — do NOT invent companies, metrics, or responsibilities that aren't implied by the originals. Keep them ATS-friendly, each starting with a strong action verb, concrete and outcome-focused. Return a JSON array of strings (one rewritten bullet per original, or fewer if merging tightens them). No markdown, no numbering, no leading bullet glyphs.

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
      ? `Include one brief, positive, professional sentence referencing the reason for leaving: "${reason}". Keep it gracious — never negative.`
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
Plain text only — no markdown, no subject line, no recipient address block, no date line, no email. 3 to 5 short paragraphs.`,
      };
    }
    case "improveText": {
      const instruction =
        (p.instruction as string) || "Improve the writing while keeping the original meaning";
      return {
        json: false,
        prompt: `${instruction}. Keep it professional and warm. Return ONLY the revised text as plain text — no markdown, no preamble, no quotes, preserve paragraph breaks.

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
        prompt: `Tailor a resume to this job posting.
Return JSON: {
  "summary": "a rewritten 2-4 sentence professional summary aligned to the job (no markdown)",
  "keywords": [8 important ATS keywords/skills pulled from the job description to include],
  "achievements": [${
    bullets.length
      ? "up to 3 of the candidate's OWN bullets below, rewritten to foreground what this posting asks for"
      : "leave this an empty array"
  }]
}.
Rules: every fact must stay truthful. Do NOT invent companies, metrics, tools, or responsibilities that are not already present in the candidate's material. Reframe and re-emphasise only. Preserve existing numbers exactly.
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
      return {
        json: true,
        prompt: `Generate a job-specific interview-prep sheet as JSON with EXACTLY these keys:
{
  "company": { "name": string, "description": string, "bullets": [3-4 short things to know / research before the call] },
  "role": { "title": string, "keySkills": [4-6 key skills for this role], "summary": string },
  "values": [3-4 things the employer likely values in people],
  "mentions": [3-4 things the candidate should be sure to mention, grounded in their resume],
  "questions": [ { "question": string, "guidance": [2-3 short coaching lines], "sample": "optional short sample answer grounded in the resume" } ],
  "candidateQuestions": [3-5 questions the candidate can ask the interviewer]
}
Interview type: "${type}"${custom ? ` (custom details: "${custom}")` : ""}.
Tailor questions + guidance to that type: screening = basics/expectations/availability/salary framing; manager = leadership/impact/fit; technical = hard-skill proof/process/tools; other = use the custom details.
Generate 5-6 questions.${exclude.length ? ` Do NOT repeat any of these already-shown questions: ${JSON.stringify(exclude)}.` : ""}
Rules: Do NOT invent company facts (founded year, HQ, employees, clients, revenue) - if unknown, use research prompts like "Ask about this in the interview". Base "mentions" and any "sample" answers ONLY on the candidate resume - never fabricate experience, metrics, employers, or tools. Return JSON only, no markdown.

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
 * POST /api/ai — runs one AI task. Returns { fallback: true } whenever the key
 * is missing or generation ultimately fails, so the client uses canned content
 * instead of erroring. Parses JSON-mode replies (stripping ```json fences).
 */
export async function POST(req: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ fallback: true });

  try {
    const { task, payload } = (await req.json()) as Body;
    const { prompt, json } = buildPrompt(task, payload);
    const file = payload.file as InlineFile | undefined;
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
