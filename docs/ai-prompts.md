# AI Prompts Reference

A complete map of every AI generation in the application, with the exact prompt
used for each. Read-only documentation - generated from the source in
`src/app/api/ai/route.ts` and its client callers.

## How AI works in this app

The app does NOT use a separate "system prompt" (Gemini's `systemInstruction`
field is never used). Instead, ALL AI runs through a single server route,
`src/app/api/ai/route.ts`, where `buildPrompt(task, payload)` assembles ONE
prompt string per task (instructions + the user's data) and sends it as user
content to Gemini. So the per-task prompt template below is the effective system
prompt for each generation.

Shared config for every call (`gemini()` + `POST`):

- Model: `process.env.GEMINI_MODEL || "gemini-2.5-flash"`
- Temperature: 0.1 when a file is attached (faithful extraction), 0.8 otherwise
- `responseMimeType: application/json` for structured tasks
- 3 retries on transient errors (429/500/503)
- Returns `{ fallback: true }` when no `GEMINI_API_KEY` or on failure, so the
  client uses canned mock content instead of erroring
- A 10 MB size guard rejects oversized inline files before the model call

Client callers just POST `{ task, payload }` to `/api/ai`:

- `src/lib/ai/mock.ts` (generic `callAi` wrapper for the editor tasks)
- `src/lib/ai/parseResume.ts`, `src/lib/ai/job-posting.ts`
- `src/lib/cover-letter/ai.ts`, `src/lib/resignation-letter/ai.ts`
- `src/lib/interview/interview-prep.ts`, `src/lib/jobs/scoreboard.ts`

## Sections that use AI (17 tasks)

| # | Section / Feature | UI file | Task | Output |
|---|---|---|---|---|
| 1 | Professional Summary -> Generate | `editor/sections/professional-summary.tsx` | `summary` | text |
| 2 | Professional Summary -> Improve / AI-edit | same | `improveSummary` | text |
| 3 | Employment -> suggest bullets | `editor/sections/employment-history.tsx` | `bullets` | JSON[] |
| 4 | Employment -> improve bullets | same | `improveBullets` | JSON[] |
| 5 | Employment -> AI rewrite (Improve/More human/Shorter) | `sections/ai-edit.tsx` + employment | `rewriteBullets` | JSON[] |
| 6 | Skills -> suggest skills | `editor/sections/skills.tsx` | `skills` | JSON |
| 7 | Autocomplete fields + Jobs title filter | `sections/autocomplete-input.tsx`, `jobs/job-title-filter-input.tsx` | `suggest` | JSON[] |
| 8 | Cover Letter -> generate body | `lib/cover-letter/ai.ts` | `coverLetter` | text |
| 9 | Cover Letter -> parse resume for inputs | `lib/cover-letter/ai.ts` | `parseResume` | JSON |
| 10 | Upload Resume -> extract full resume | `lib/ai/parseResume.ts` (onboarding + interview-prep upload) | `extractResume` | JSON |
| 11 | Resignation Letter -> generate | `lib/resignation-letter/ai.ts` | `resignationLetter` | text |
| 12 | Resignation Letter -> improve a field | same | `improveText` | text |
| 13 | Tailor to job -> paste/extract posting | `dashboard/tailor-dialog.tsx` | `extractJobPosting` | text |
| 14 | Tailor to job -> tailored summary/keywords | `dashboard/tailor-dialog.tsx` | `tailor` | JSON |
| 15 | (helper) reorder chips by relevance | `lib/ai/mock.ts` | `rankChips` | JSON[] |
| 16 | Jobs -> match Scoreboard | `jobs/job-detail.tsx`, `job-card.tsx`, `job-search.tsx` | `scoreJob` | JSON |
| 17 | Interview Prep -> prep sheet | `interview-prep/interview-prep.tsx` | `interviewPrep` | JSON |

## The prompts (verbatim; `${...}` are runtime values)

### 1. `summary` - Professional Summary

```
Write a resume Professional Summary for the candidate below. Target role: ${role}. Tone: ${tone||"confident"}.

Build the summary from the STRONGEST available inputs, in this priority order:
1. The target role above.
2. The most recent job title and its achievements (from the employment history).
3. Skills and tools.
4. Education and background.
Lead with the higher-priority inputs; do not fall back to generic phrasing when real data exists.

Rules:
- 2 to 4 sentences. First-person implied (no "I"), plain prose - no markdown, headings, or lists.
- Start with the role and years of experience WHEN the employment dates make that inferable; otherwise start with the role.
- Weave in the 2-3 strongest skill themes the data supports.
- Include a measurable achievement ONLY if it appears in the bullets below. Do NOT invent companies, metrics, years of experience, certifications, or tools.
- Avoid buzzword-heavy generic filler.[+ if no data: write a solid but GENERIC summary, keep claims modest, do not fabricate specifics]

${employment/skills/education context block}

Return only the summary text.
```

### 2. `improveSummary`

```
Improve this resume Professional Summary. Keep it truthful to the candidate's resume data below - never invent employers, metrics, achievements, years of experience, certifications, or tools the data does not support.
Tone: ${tone}. 2-4 sentences, first-person implied (no "I", "my", or "me"), plain prose, no markdown.
Start with role and years of experience when inferable; highlight the 2-3 strongest skill themes.

Build from the STRONGEST available inputs, in priority order: (1) target role, (2) most recent job title and its achievements, (3) skills and tools, (4) education and background, (5) the user instruction. If the current summary text names a DIFFERENT role or conflicts with the resume data, prefer the target role and employment history over the existing text.
[+ optional user instruction, applied charitably but without inventing new facts]

${context block}
Target role: ${role}

Current summary:
"""${text}"""

Return only the improved summary text.
```

### 3. `bullets` - suggest employment bullets

```
Suggest 7 strong, achievement-oriented resume bullet points for a ${role} at ${company}
  [or, if no title: "that would suit any professional role, describing transferable impact (ownership, collaboration, process improvement, measurable results)"].
[+ if existing bullets: lists them and asks for 7 ADDITIONAL non-duplicate bullets reusing the same tools/metrics/domain/seniority]
Each bullet starts with a strong action verb and includes a concrete/quantified outcome where natural.
[+ on "regenerate": go for less obvious angles than the first ${page*7}]
Return a JSON array of 7 strings only. No markdown.
```

### 4. `improveBullets`

```
Rewrite these resume bullet points to be stronger, more action-driven, quantified, and ATS-friendly.
Keep the original meaning. Return a JSON array of strings (one per bullet). No markdown.

Bullets:
"""${text}"""
```

### 5. `rewriteBullets` - the "Improve / More human / Shorter" AI-edit actions

```
Rewrite the following resume bullet points for a ${role}.
Instruction: ${instruction}.
Rules: keep every fact truthful - do NOT invent companies, metrics, or responsibilities that aren't implied by the originals. Keep them ATS-friendly, each starting with a strong action verb, concrete and outcome-focused. Return a JSON array of strings (one rewritten bullet per original, or fewer if merging tightens them). No markdown, no numbering, no leading bullet glyphs.

Bullets:
${JSON bullets}
```

### 6. `skills`

```
Suggest resume skills for a ${role}.
Return JSON: { "hard": [7 technical/role-specific skills], "soft": [7 interpersonal skills] }.
Short skill names only (1-3 words). No duplicates with: ${exclude}.
[+ on refresh #n: avoid the most obvious picks, suggest less common but relevant skills]
```

### 7. `suggest` - field autocomplete

```
Autocomplete a resume "${kind}" field. The user has typed: "${query}".
Return up to 6 realistic ${label} that start with or closely match "${query}", ordered by relevance.
Each item: 1-6 words, correctly capitalized, real and commonly used, no duplicates, no numbering, no explanations.
Return a JSON array of strings only.
```

`kind` -> `label` mapping: jobTitle -> "professional job titles", location ->
"real city / location names (City, State or City, Country)", institution ->
"real universities, colleges or schools", degree -> "academic degrees or fields
of study", company -> "well-known real company names", language -> "human
languages", field -> "fields of study".

### 8. `coverLetter`

```
Write a professional cover letter body for a ${role}.
[targeted posting at ${company}  OR  general reusable letter (no specific company)]
Open with the greeting "${greeting}" on its own line.
Use these inputs:
- Top skills: ${skills}
- Strengths: ${strengths}
- Years of experience: ${experience}
- Recent role: ${recentJob}
- Education: ${education}
[+ job description if targeted]
Structure: greeting, an introduction stating interest in the ${role} role, a paragraph on experience, a paragraph weaving in the skills and strengths, a short paragraph on education, and an enthusiastic closing. End with a signature line of the candidate's full name.
Plain text only (no markdown, no headings, no placeholders like [Name]). 4-6 short paragraphs.
```

### 9. `parseResume` - resume to cover-letter inputs

```
Extract cover-letter inputs from the resume below.
Return JSON with EXACTLY these keys:
{
  "education": { "level": "college" | "highschool" | "student" | "none", "university": string, "field": string },
  "recentJob": { "jobTitle": string, "company": string },
  "experience": "~1" | "2" | ... | "10+",
  "skills": [3 most relevant hard skills as short strings],
  "strengths": [3 personality strengths/soft traits as single words or short phrases],
  "personal": { "firstName": string, "lastName": string, "email": string, "phone": string, "address": string }
}
Use "" for anything not present. "experience" must be one of the listed string values (estimate from work history; "10+" for senior). No markdown, no extra keys.

Resume:
"""${resumeText}"""
```

### 10. `extractResume` - Upload Resume parser (temperature 0.1, PDF attached inline)

This is the only prompt with an explicit "You are a..." persona line - the
closest thing to a classic system prompt in the app.

```
You are a precise resume parser. Extract the candidate's REAL information from the attached resume document (and/or the text below) into JSON with EXACTLY these keys:
{
  "firstName": string,
  "lastName": string,
  "jobTitle": string,            // current or most recent / target role
  "email": string,
  "phone": string,
  "linkedin": string,            // URL or handle if present
  "location": string,            // "City, ST" or "City, Country"
  "summary": string,             // the professional summary as plain text (no markdown)
  "employment": [ { "jobTitle", "company", "location", "startDate", "endDate", "bullets": [string] } ],  // most recent first
  "skills": [string],            // short skill names (1-4 words), de-duplicated
  "education": [ { "institution", "degree", "location", "startDate", "endDate", "description" } ],
  "courses": [ { "course", "institution", "startDate", "endDate" } ],
  "languages": [ { "language", "proficiency" } ],
  "hobbies": [string],
  "references": [ { "name", "company", "email", "phone" } ],
  "links": [ { "title", "url" } ]
}
Rules: COPY real data verbatim (names, companies, dates, bullet text) - do NOT invent, summarize away, or substitute placeholder/sample data. Use "" or [] for anything genuinely absent. Extract EVERY section present in the resume - courses, certifications, languages, hobbies/interests, references and links must each be captured into their key, not dropped or merged into skills. Merge "Core Skills", "Tools & Platforms" into skills if no dedicated skills list exists. Return JSON only, no markdown, no extra keys.

Resume text (may be empty if a document is attached):
"""${resumeText}"""
```

### 11. `resignationLetter`

```
Write the BODY of a professional, warm, and concise resignation letter as plain text.
Candidate full name: ${fullName}.
Open with this salutation on its own line: "${salutation}".
First paragraph: formally state resignation from the position of ${position} at ${company}, clearly stating the last working day is ${lastDay}.
[+ optional reason paragraph - kept gracious, never negative]
[+ optional gratitude paragraph]
[+ optional transition-help paragraph]
Close with a courteous sign-off (e.g. "Sincerely,") and the candidate's full name on the final line.
Plain text only - no markdown, no subject line, no recipient address block, no date line, no email. 3 to 5 short paragraphs.
```

### 12. `improveText` - resignation field polish

```
${instruction}. Keep it professional and warm. Return ONLY the revised text as plain text - no markdown, no preamble, no quotes, preserve paragraph breaks.

Text:
"""${text}"""
```

### 13. `extractJobPosting`

```
Extract the full text of the attached job posting (and/or the text below) as plain text.
Keep the job title, company, responsibilities, and requirements. Drop navigation, cookie banners, and unrelated page furniture.
Return ONLY the posting text - no markdown, no preamble, no commentary.

${text}
```

### 14. `tailor`

```
Tailor a resume to this job posting.
Return JSON: {
  "summary": "a rewritten 2-4 sentence professional summary aligned to the job (no markdown)",
  "keywords": [8 important ATS keywords/skills pulled from the job description to include],
  "achievements": [up to 3 of the candidate's OWN bullets rewritten to foreground what this posting asks for, or an empty array]
}.
Rules: every fact must stay truthful. Do NOT invent companies, metrics, tools, or responsibilities that are not already present in the candidate's material. Reframe and re-emphasise only. Preserve existing numbers exactly.
Job description: """${jobDescription}"""
Candidate's current summary: """${summary}"""
Candidate's real experience bullets: ${bullets}
```

### 15. `rankChips` (helper for skill/keyword ordering)

```
A candidate is applying for a "${role}" role. From the ${kind} list below, return the SAME strings reordered so the most relevant to a ${role} come first. Do not invent new items, do not drop any, keep exact spelling.
Return a JSON array of strings only (the full reordered list). No markdown.

${kind}:
${options}
```

### 16. `scoreJob` - Jobs match Scoreboard

```
You are a resume-to-job match analyst. Compare the candidate resume to the job posting and return an explainable match scoreboard as JSON with EXACTLY these keys:
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

CANDIDATE RESUME: role / skills / summary / experience
JOB POSTING: title / company / description
```

### 17. `interviewPrep` - Interview Prep sheet

```
Generate a job-specific interview-prep sheet as JSON with EXACTLY these keys:
{
  "company": { name, description, bullets[3-4 things to research], founded?, headquarters?, employees? },
  "role": { title, keySkills[6-12], summary },
  "values": [4-5 workplace qualities the employer values],
  "mentions": [3-5 strongest resume-grounded points, incl. honest gap-positioning],
  "questions": [ { question, guidance[2-3 lines], sample? } ],
  "candidateQuestions": [3 questions the candidate can ask]
}

First silently classify the occupation, industry, specialisation, seniority, work environment and whether the role is regulated/high-risk ...
${STRUCTURE[interviewType]}   // one of 4 fixed 7-question blueprints
Generate EXACTLY 7 (or 3-5 ADDITIONAL) question(s) ... Keep each question ~5-9 words, guidance 3-6 words.
Rules: Do NOT invent company facts (founded year, HQ, employees, clients, revenue). Base "mentions" and any "sample" answers ONLY on the candidate resume - never fabricate experience, metrics, employers, tools, licences or years. Treat a JD requirement as something to VERIFY, not as candidate experience. For regulated/high-risk roles never assert an active licence and never give unsafe procedural instructions. Return JSON only, no markdown.

JOB: title/company/location/salary/seniority/description
CANDIDATE: role/skills/summary/experience
```

It swaps in one of four interview-type blueprints (`STRUCTURE`):

- `screening` - recruiter-level 7-question set (tell me about yourself, why leaving, why this employer, role interest, top requirement, work conditions, salary)
- `manager` - depth, ownership, judgement (walk through current role, motivation, strongest verified achievement, behavioural competency, situational scenario)
- `technical` - occupation-aware; safety/compliance question is mandatory for regulated/high-risk roles (nursing, trades, electrical, aviation, lab)
- `other` - the user's custom instruction is the primary blueprint

## The common thread across every prompt

All prompts enforce the same anti-fabrication doctrine: never invent employers,
metrics, dates, tools, certifications, or licences - reframe/extract the user's
real data only. Structured tasks demand strict JSON with no markdown. Extraction
tasks (`extractResume`, `parseResume`) run at low temperature for faithfulness;
writing tasks run warmer.
