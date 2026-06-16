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
  | "rewriteBullets"
  | "rankChips"
  | "resignationLetter"
  | "improveText";

/** Optional file (e.g. an uploaded PDF) sent inline to the model. */
interface InlineFile {
  mimeType: string;
  data: string; // base64 (no data: prefix)
}

interface Body {
  task: Task;
  payload: Record<string, unknown>;
}

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
Make it more impactful, ATS-friendly, ${p.tone || "confident"} in tone, 2-4 sentences, no markdown.
Return only the improved summary text.

Current summary:
"""${p.text || ""}"""`,
      };
    case "bullets":
      return {
        json: true,
        prompt: `Suggest 4 strong, achievement-oriented resume bullet points for a ${role}${
          p.company ? ` at ${p.company}` : ""
        }.
Each bullet starts with a strong action verb and includes a concrete/quantified outcome where natural.
Return a JSON array of 4 strings only. No markdown.`,
      };
    case "improveBullets":
      return {
        json: true,
        prompt: `Rewrite these resume bullet points to be stronger, more action-driven, quantified, and ATS-friendly.
Keep the original meaning. Return a JSON array of strings (one per bullet). No markdown.

Bullets:
"""${p.text || ""}"""`,
      };
    case "skills":
      return {
        json: true,
        prompt: `Suggest resume skills for a ${role}.
Return JSON: { "hard": [7 technical/role-specific skills], "soft": [7 interpersonal skills] }.
Short skill names only (1-3 words). No duplicates with: ${JSON.stringify(p.exclude || [])}.`,
      };
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
    case "tailor":
      return {
        json: true,
        prompt: `Tailor a resume to this job posting.
Return JSON: {
  "summary": "a rewritten 2-4 sentence professional summary aligned to the job (no markdown)",
  "keywords": [8 important ATS keywords/skills pulled from the job description to include]
}.
Job description:
"""${p.jobDescription || ""}"""
Candidate's current summary:
"""${p.summary || ""}"""`,
      };
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
