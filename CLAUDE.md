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

Key areas (full purpose-grouped layout: `docs/architecture.md`):
- `src/app/api/ai/route.ts` — one Gemini-backed endpoint, task-dispatched
  (summary, bullets, skills, resume extraction, interview prep). Interview prep
  has a resume-only path and a company-specific (job + JD) path.
- `src/features/*` — each feature owns its `components/`, `lib/`, and `store/`
  (resume-builder, cover-letter, resignation-letter, jobs, interview-prep,
  dashboard, authentication, onboarding, billing, user-profile, marketing).
  E.g. `src/features/interview-prep/{components,lib/interview-prep.ts,store}`.
- `src/services/*` — ai, database, payments, email, storage (side-effecting IO).
- `src/{validation,permissions,config,utilities}` — cross-cutting library code.
- `src/components/{common,forms,layout}` — shared, feature-agnostic UI.
- Routes live under `src/app/(public|authenticated)/` route groups (the
  parentheses do NOT change URLs); `api/` and the root layout stay at the app root.

## Verify before pushing

`npx tsc --noEmit` and `python ../scripts/check_no_emoji.py <changed files>`.

## Changelog

### 2026-08-03 — Manager prompt: evidence/gap/regulated rules + question length

Folded the new-prompts Meeting-with-a-Manager spec (`Meeting_with_a_Manager_
System_Prompt.docx`) into `MANAGER_SYSTEM_PROMPT` as rules only (NDJSON output
unchanged - the doc's plain-text format was not adopted). Added: evidence-priority
order; career-gap rules; regulated/high-risk role handling (licences only as
shown, no invented incidents, coach-to-explain-own-protocol); a personal-
preference note (manager normally does not ask salary/availability; safe template
if unavoidable); sample-answer tone (not a cover letter, no promotional language,
no metric overload); question length raised to about 8-18 words (never over 22,
system prompt + task turn); and candidate questions kept to 8-15 words (max 18).

### 2026-08-03 — Screening Call prompt: scoped salary + evidence/gap rules

Folded the new-prompts Screening Call spec (`Screening_Call_System_Prompt_with_
Salary_Override.docx`) into `SCREENING_SYSTEM_PROMPT` as rules only - the output
shape (NDJSON question/guidance/sample) is unchanged so the client renders the
same. Added: an explicit scoped salary exception (salary is the only never-invent
exception, and only the range + pay type may be estimated); an evidence-priority
order; career-gap rules (mention only when relevant, never invent the reason);
and a salary fallback that asks for the employer's budgeted range instead of
inventing a figure when no reliable location/currency exists. The doc's Part B
structured schema (answer_mode/evidence_ids) was NOT adopted - it would change
the response shape and break the interview-prep UI.

### 2026-08-03 — Architecture restructure to a purpose-grouped layout

Moved the codebase onto the structure in `docs/architecture.md` with **no
behaviour, URL, or API change** - verified by `tsc --noEmit` and a clean
production build after every phase (on the `restructure` branch):

- `lib` split into `services/{ai,payments,database,email,storage}`, `validation`,
  `permissions`, `config`, `utilities`; `src/lib` removed.
- `app` routes wrapped in URL-safe route groups `(public)` / `(authenticated)`;
  `api/`, the root layout, `robots`, `sitemap` stay at the app root.
- `features/*` extracted (resume-builder, cover-letter, resignation-letter, jobs,
  interview-prep, dashboard, authentication, onboarding, billing, user-profile,
  marketing) - each owns its `components/`, `lib/`, and `store/`.
- Shared UI -> `components/{common,forms,layout}`.
- Root scaffolding added: `database/`, `tests/`, `docs/*.md`, `SECURITY.md`,
  `CHANGELOG.md`. Held LinkedIn work kept out (local `_held-linkedin-backup`).

### 2026-08-03 — Interview-prep questions matched to competitor style

Tuned the resume-only Screening / Manager / Technical prompts so the generated
questions read like the reference competitor's: short, plain, single-ask, and
canonical where the question is fixed.

- Screening: 7-question blueprint + short-question cap restated in the task turn
  (models weight it most); Q1/Q2/Q6/Q7 pinned to canonical wording; Q3-Q5 short
  single-topic checks. Salary answer now always lands in `sample` (never leaks
  into `guidance`, never empty).
- Manager: blueprint + short-question cap in the task turn; evidence-anchored
  questions stay crisp ("You grew revenue from 35% to 55% - how?") instead of a
  multi-clause recap; fixed an intermittent bug where every question came back
  guidance-only (sample now required except for an unsupported behavioural Q).
- Technical: questions name a concrete resume tool/skill (HubSpot, GA4, the
  $750K budget) instead of abstract phrasing; the 2 coaching tips are now short
  and name real facts (tools, metric, employer) instead of generic advice.
- All three live-verified against sample resumes (question word counts, sample
  presence, tip specificity) before shipping. Output shapes unchanged - client
  renders the same.

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
  (role + seniority + location, local currency) as a confident two-sentence spoken
  answer (35-50 words), first person ("my" not "your"): sentence 1 opens in a rotated
  style (experience/background/leadership/qualification/experience-drawn/
  direct-range-first) with the range + pay type, sentence 2 a rotated flexibility
  close. Uses only SPECIFIC resume evidence (no vague filler like "hardworking"),
  names the pay type (base/hourly/monthly/contract/OTE, incl. "$90K base with
  $140K-$160K OTE"), widens the range when role or location is unclear, bans canned
  lines ("I'm after the market rate", "full compensation picture", "according to
  current market data", etc.), and never claims live market data. Availability/
  relocation/notice keep the safe
  template. Candidate `location` reaches the AI. Reference:
  `docs/interview-prep-with-only-resume-just-practice/simple-salary-question-prompt.md`.
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
