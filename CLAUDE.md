@AGENTS.md

# Resumewriter.ai — project overview

AI-assisted career toolkit (resume builder, cover/resignation letters, jobs,
interview prep). Next.js 16 (App Router, Turbopack) + React 19 + TypeScript +
Tailwind v4, Zustand state, Postgres-or-file-store persistence, Google Gemini
for AI, NextAuth, Stripe. Dev server runs on **port 3001**.

Core principle: every AI feature is grounded ONLY in the user's own resume (and,
for company-specific interview prep, the pasted job description and verified
company facts). Nothing about the candidate is invented — no employers, metrics,
tools, years, licences, or eligibility. Personal/eligibility facts (citizenship,
clearance, licence, salary) are surfaced as fill-in templates, never assumed.

Key areas:
- `src/app/api/ai/route.ts` — one Gemini-backed endpoint, task-dispatched
  (summary, bullets, skills, resume extraction, interview prep). Interview prep
  has a resume-only path and a company-specific (job + JD) path.
- `src/lib/interview/interview-prep.ts` — interview-prep client logic (blocking
  fetch, NDJSON streaming, heuristic fallback).
- `src/components/interview-prep/` — the interview-prep UI.
- `src/lib/store/` — Zustand stores (resume, documents, apply).

## Verify before pushing

`npx tsc --noEmit` and `python ../scripts/check_no_emoji.py <changed files>`.

## Changelog

### 2026-08-01 — Interview-prep prompts, resume upload, saved-resume picker

Resume-only "Just practicing" now has a dedicated, self-contained system prompt
per interview type, sent to Gemini as `systemInstruction` (the resume + operation
travel in a short task turn). Reference docs live in
`docs/interview-prep-with-only-resume-just-practice/` (full + "simple-" summaries).

- `SCREENING_SYSTEM_PROMPT`, `MANAGER_SYSTEM_PROMPT`, `TECHNICAL_SYSTEM_PROMPT`
  in `src/app/api/ai/route.ts`, each applying its spec's rules, task prompt, and
  tone spec (screening short/recruiter tips 6-14w; manager evidence-based tips
  7-16w with the problem/tools/result structure; technical tips-only, 2 tips,
  profession-matched, safety-aware). Shared `MORE_QUESTIONS_RULES` for "get more".
- Screening salary answer now gives an approximate, resume-tailored market range
  (role + seniority + location, local currency) with the opening style rotated
  server-side per request so it is not a canned line; availability/relocation/
  notice keep the safe template. Candidate `location` now reaches the AI.
- Streaming: temperature 0.7 (natural phrasing) with explicit "all seven"
  count-guards; client tops up Screening/Manager candidate questions to exactly 3
  when a streamed line is dropped.
- Resume upload: any section without a dedicated home (Projects, Certifications,
  Internships…) is grouped by heading into ONE Custom additional section (one
  entry per item), and an imported resume unlocks every section immediately.
  Sidebar numbers custom sections only when two share a title.
- Interview-prep landing is now a "Start with your resume" picker: choose a saved
  resume (listed from the account) or upload a new one, matching the reference UI.
- Editor: Professional Summary "Shorter" now meaningfully shortens (the 70-100
  word default yields to a shorten/lengthen instruction).

### 2026-07-31 — Interview prep: resume-only + company-specific Q/A

Applied the two interview-prep specs (resume-only "Just practicing", and
"Interview at a specific company" = resume + job description) to the Screening
Call, Meeting with a Manager, and Technical outputs.

- Per-type rules enforced in both flows: exactly 7 initial / exactly 3 "get
  more" questions; tips — screening 2-3, manager exactly 3, technical exactly 2;
  samples — screening short, manager when supported, technical none (tips-only);
  candidate questions — screening/manager 3, technical none.
- Company-specific flow: question order per spec (incl. "Why this company" and
  "Why this role"), eligibility (citizenship/clearance/licence) as honest
  fill-in templates, JD salary range as a safe answer, and company-overview
  counts (insights 3-5, key skills 8-10, values 5, mentions 4).
- Resume-only flow streams its questions as NDJSON so the first card paints in
  ~1.5s (thinking disabled for this structured task); other tasks unchanged.
- Interview cards match the reference format: bullet-free divider-separated
  coaching tips + the sample answer in its own subtle box.
- PDF/print: app chrome (top nav, footer, help pill) hidden in print, cards
  kept whole across page breaks, sensible page margins, print-only sheet title.
