# Resumewriter.ai

An AI-assisted career toolkit: build a resume, generate matching cover and
resignation letters, browse and tailor to jobs, and prepare for interviews —
all grounded in the user's own resume, never invented content.

## Features

- **Resume builder** — guided, section-by-section editor with a live preview,
  multiple templates, colors and fonts, and PDF export.
- **AI assistance** — professional-summary generation, employment-bullet
  improvement (tense-aware), skill suggestions, and resume extraction from an
  uploaded PDF/DOCX. All AI output is fact-checked against the resume; it never
  fabricates employers, metrics, tools, or years.
- **Cover & resignation letters** — generated from the resume and target role.
- **Jobs** — search, score against the resume, and tailor.
- **Interview prep** — two modes:
  - *Interview at a specific company* — paste a company + job description; get a
    company/role overview and Screening, Manager, and Technical question sets.
  - *Just practicing* — resume-only questions when there is no target job.
  Each set follows fixed per-type rules (question counts, coaching-tip counts,
  sample-answer lengths, "questions you can ask") and streams in as it generates.

## Tech stack

- **Next.js 16** (App Router, Turbopack) — note: this is a customized Next.js;
  see `AGENTS.md` and read `node_modules/next/dist/docs/` before changing
  framework-level code.
- **React 19**, **TypeScript**, **Tailwind CSS v4**
- **Zustand** for client state (persisted under the `resume-co:` namespace)
- **NextAuth** for auth
- **Postgres** (via `postgres.js`) when `DATABASE_URL` is set, else a local
  `.data/*.json` file store for development
- **Google Gemini** for AI generation
- **Stripe** for billing

## Getting started

```bash
npm install
npm run dev        # http://localhost:3001
```

### Environment

Create `.env.local` (never commit it):

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | AI generation (summary, bullets, skills, interview prep, extraction). Without it, features fall back to canned/heuristic content. |
| `GEMINI_MODEL` | Optional model override (default `gemini-2.5-flash`). |
| `DATABASE_URL` | Postgres connection. Omit to use the local file store in dev. |
| `AUTH_SECRET` | NextAuth session secret. |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Billing. |

## Quality gates

Run before pushing:

```bash
npx tsc --noEmit                                   # type-check
python ../scripts/check_no_emoji.py <changed files># no emoji in UI/output
```

CI runs token, contrast, component-spec, and test gates on push/PR.

## Project docs

See `CLAUDE.md` for the project overview and changelog, and `AGENTS.md` for the
"this is a customized Next.js" note.
