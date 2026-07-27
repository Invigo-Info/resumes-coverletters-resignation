# Resume.co - Project Structure and Audit Plan (Supabase)

Created 25 July 2026. Executes the 8-phase code-quality / security / handover rules against this
codebase, with **Supabase as the single database**. It is a plan + target structure, not a feature
change: the purpose is to understand, restructure, secure, test, and document the existing system so
another programmer can run and deploy it.

## Scope decisions (read first)

- **"Use only Supabase" = Supabase is the one database (managed Postgres) for all persistence**, plus
  Supabase Storage *if/when* uploads are ever persisted (today they are not - resume/JD files stream
  to Gemini and are discarded).
- **Auth stays NextAuth.** These rules forbid adding features or changing behaviour; replacing NextAuth
  with Supabase Auth is a behaviour change and is out of scope here. Supabase is simply the Postgres
  that the NextAuth user store lives in. Adopting Supabase Auth is a separate, explicit decision.
- **Concrete code consequence of choosing Supabase:** the current DB code uses the Neon-only driver
  (`@neondatabase/serverless`), which does NOT connect to Supabase. It must be swapped to a
  Supabase-compatible driver (`postgres` / postgres.js). This is a small, contained change in
  `src/lib/db.ts` plus minor adjustments in `users.ts` / `documents.ts`; public signatures stay
  identical so `auth.ts` and the routes are untouched.

## Working rules being followed

- Back up the repo + database before changes; work on a branch (`code-audit-and-cleanup`); never touch
  production directly; never expose real secrets.
- Small, clearly explained commits and PRs - not one large commit.
- Do not change behaviour without documenting why.
- Report any Critical/High security finding immediately.

> Restructuring moves files, which breaks imports if done carelessly. Do it **incrementally**: one
> feature/folder per PR, update the `@/` path imports, run `tsc --noEmit` + tests green after each,
> merge, repeat. Do not attempt the whole move in one commit.

---

## Phase 1: System Inventory

| Concern | This application |
|---|---|
| Frontend framework | Next.js 16 (App Router, customized - see `AGENTS.md`), React 19, TypeScript, Tailwind v4 |
| Backend framework | Next.js route handlers (`src/app/api/*`) + server modules in `src/lib` |
| Database | **Supabase (managed Postgres)** - via `postgres` (postgres.js) using the pooled connection string |
| Authentication | NextAuth v5 beta, JWT strategy, Credentials (email + bcrypt) and Google (only when OAuth env set) |
| File storage | None persisted today. Uploads stream inline to Gemini. Supabase Storage is the option if this changes. |
| Payment system | Stripe checkout (`/api/checkout/session`). No webhook / server-side entitlement yet (P0). |
| Email provider | None today (no verification/receipts). Resend is the recommended add. |
| AI providers | Google Gemini `gemini-2.5-flash` behind one route (`/api/ai`), server-only key, canned fallback |
| External APIs | Adzuna + Remotive (jobs search); LinkedIn public page fetch; Dropbox Chooser (client) |
| Background jobs | None |
| Scheduled jobs | None |
| Webhooks | None yet (Stripe webhook is a required P0 addition) |
| Analytics | None yet (PostHog recommended) |
| Admin functions | None - there is no admin role or admin UI |
| Hosting | Vercel (serverless) |
| Deployment process | Push to `main` -> Vercel build/deploy (staging environment to be added) |
| Environment variables | `GEMINI_API_KEY`, `GEMINI_MODEL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID/SECRET`, `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `ADZUNA_APP_ID/KEY`, `NEXT_PUBLIC_DROPBOX_APP_KEY`, and (new) `DATABASE_URL` |

### Data-flow diagram

```text
                 +-------------------------------+
   Browser ----> |  Next.js App Router (RSC + client)  |
   (user)        |  src/app/**  +  src/components/**    |
                 +---------------+---------------------+
                                 |  fetch /api/*
                                 v
                 +-------------------------------+
                 |  Route handlers  src/app/api/*  |
                 +---+------+------+------+--------+
                     |      |      |      |
        session/authz|      |AI    |pay   |jobs/linkedin
                     v      v      v      v
                NextAuth  Gemini  Stripe  Adzuna / Remotive / LinkedIn
                     |
                     v
             Supabase Postgres  (users, documents, + roadmap tables)
             [Supabase Storage - only if uploads are ever persisted]
```

### Supabase connection notes
- On Vercel serverless use the **pooled/transaction connection string** (Supavisor, port `6543`), not
  the direct one (5432) - direct connections exhaust under serverless.
- If a migration tool is added later, it needs a **direct** URL (`DIRECT_URL`, port 5432) alongside the
  pooled `DATABASE_URL`.
- The `service_role` key (if Supabase Storage / supabase-js is ever used) must live **server-side only**,
  never in client code.

---

## Phase 2: Repository Restructuring (the target structure)

Your `src/components/**` and `src/app/**` are already feature-organized and mostly match the target.
The real work is splitting the `src/lib` grab-bag so UI, DB access, payment, AI, validation, and
permissions are not mixed. Target layout (adapted to Next.js App Router):

```text
resume-co/
|-- src/
|   |-- app/                      # routes only (App Router)
|   |   |-- (public)/             # route group: login, marketing, legal (Terms/Privacy)
|   |   |-- (app)/                # route group: authenticated screens (dashboard, builder, jobs...)
|   |   `-- api/                  # route handlers (thin - delegate to services)
|   |
|   |-- components/               # reusable UI (ALREADY well-organized - keep)
|   |   |-- ui/                   # primitives (was: components/ui) = "common"
|   |   |-- layout/               # shells, nav, footer, help-pill
|   |   `-- <feature>/            # editor, dashboard, jobs, cover-letter, ... (keep)
|   |
|   |-- features/                 # domain logic per feature (client + hooks + stores)
|   |   |-- resume/  cover-letter/  resignation-letter/  jobs/  interview/  tailoring/
|   |
|   |-- services/                 # external-system access (server-side)
|   |   |-- database/             # db.ts (Supabase client) + users.ts + documents.ts
|   |   |-- payments/             # stripe/ (checkout, webhook, entitlement)
|   |   |-- ai/                   # gemini bridge, prompt builders, mock fallback
|   |   |-- email/                # (new) Resend, when added
|   |   `-- storage/              # (only if Supabase Storage is adopted)
|   |
|   |-- validation/               # schemas.ts + field validators (contact/name/photo/upload/url/title-case)
|   |-- permissions/              # session -> owner checks, paid-feature gates
|   |-- security/                 # rate-limit.ts (+ future headers/csp helpers)
|   |-- config/                   # section-routes, themes, font-pairs, templates
|   |-- types/                    # shared TS types
|   |-- utilities/                # utils.ts, pdf-export, download-pdf, docx-text, image, html-spacing
|   |-- constants/                # named constants (free-plan limits, enums)
|   `-- store/                    # cross-feature Zustand stores (or per-feature under features/)
|
|-- database/                     # Supabase SQL as source of truth
|   |-- migrations/               # ordered, versioned SQL
|   |-- policies/                 # Row Level Security policies (if RLS adopted)
|   |-- functions/                # SQL functions/triggers (if any)
|   `-- seed/                     # optional seed data
|
|-- tests/                        # or co-located *.test.ts (current pattern) + e2e/
|   |-- unit/  integration/  e2e/  security/
|
|-- scripts/                      # db-setup.mjs, import-json-to-db.mjs, ops scripts
|-- docs/                         # README/ARCHITECTURE/DATABASE/API/SECURITY/DEPLOYMENT/TESTING/...
|-- .github/workflows/            # ci.yml (quality gate)
`-- .env.example
```

### Current -> target mapping (do these as small PRs; KEEP = already fine)

| Current | Target | Action |
|---|---|---|
| `src/components/**` | `src/components/**` | KEEP (already feature-organized; `ui/` = common) |
| `src/app/**` routes | `src/app/(public)/**`, `src/app/(app)/**` | OPTIONAL - add route groups; no URL change |
| `src/lib/db.ts`, `users.ts`, `documents.ts` | `src/services/database/` | MOVE |
| `src/lib/stripe/` | `src/services/payments/` | MOVE |
| `src/lib/ai/`, `mock-data.ts`, `suggestions.ts` | `src/services/ai/` | MOVE |
| `src/lib/schemas.ts`, `contact-validate.ts`, `validate-name.ts`, `photo-policy.ts`, `upload-validation.ts`, `url.ts`, `title-case.ts` | `src/validation/` | MOVE |
| `src/lib/rate-limit.ts` | `src/security/` | MOVE |
| `src/lib/section-routes.ts`, `resume-themes.ts`, `font-pairs.ts`, `templates.ts` | `src/config/` | MOVE |
| `src/lib/utils.ts`, `download-pdf.ts`, `pdf-export.ts`, `docx-text.ts`, `downscale-image.ts`, `html-spacing.ts`, `dropbox.ts` | `src/utilities/` | MOVE |
| `src/lib/jobs/`, `interview/`, `tailoring/`, `cover-letter/`, `resignation-letter/` | `src/features/<name>/` | MOVE (domain logic) |
| `src/lib/store/` | `src/store/` (or per-feature) | OPTIONAL |
| free-plan "3 docs" literal, other magic values | `src/constants/` | MOVE (extract constants) |

### Explanation of every major folder
- **app/** - only routing + thin handlers; delegates to `services`/`features`.
- **components/** - presentational + interactive UI, grouped by feature; `ui/` are primitives, `layout/` are shells.
- **features/** - client-side domain logic and hooks per product area (resume, jobs, interview, ...).
- **services/** - the only place that talks to external systems: Supabase (database), Stripe (payments), Gemini (ai), Resend (email), Supabase Storage. Keeps DB/payment/AI code out of UI.
- **validation/** - all input schemas and field validators in one place (Zod + the pure validators).
- **permissions/** - authorization helpers: derive the owner from the session, gate paid features. One place to audit access control.
- **security/** - rate limiting and header/CSP helpers.
- **config/ / constants/ / types/ / utilities/** - configuration, named constants (no magic values), shared types, and pure helpers.
- **database/** - Supabase schema as source of truth: ordered migrations, RLS policies, functions, seed.
- **tests/** - unit / integration / e2e / security (or co-located, current pattern).
- **scripts/**, **docs/**, **.github/workflows/** - ops scripts, handover docs, CI gate.

> Rule enforced by this structure: never mix UI, DB queries, payment logic, and permission checks in
> one file. A route handler validates input (validation/), checks permission (permissions/), calls a
> service (services/), and returns - nothing more.

---

## Phase 3: Code Cleanup
Resolve, in small PRs: duplicate/dead code, unused files/imports/deps (`npx depcheck`), commented-out
and debug code, hard-coded values (extract to `constants/`), hard-coded credentials (none should
exist), oversized files/functions (split), unclear names, inconsistent API responses (standardize a
`{ data } | { error }` shape across `src/app/api/*`), inconsistent error handling, missing validation
(cover with Zod), missing types, unhandled promises, silent failures, excessive `console.log`, and any
PII in logs. Tooling is in place: `npm run typecheck`, `npm run lint`, `npm run format` /
`format:check` (Prettier). Do a one-time `npm run format` on a clean tree, then make it a required gate.

## Phase 4: Security Audit (OWASP Top 10 / ASVS) - mapped to this app + Supabase
- **Authentication:** registration, login, logout, session expiry, Google (if enabled), bcrypt. Add a
  password policy + failed-login throttling. N/A (document as not built): password reset, email
  verification, MFA.
- **Authorization (top priority):** user-to-user isolation - user B must not read/modify/delete user
  A's documents; owner is derived from the verified session only. Paid-feature access enforced
  server-side (see Payments). N/A: admin authorization, company-to-company (single-user accounts).
- **Database (Supabase):** if the app connects only server-side with a privileged connection string,
  **RLS is optional but recommended as defense-in-depth**; if any browser ever uses the Supabase anon
  key, RLS becomes mandatory. Keep the `service_role` key server-side only. Version migrations; test
  backup/restore (Supabase provides automated backups + PITR on paid plans).
- **Input/API:** SQL injection (use parameterized queries only - postgres.js tagged templates are safe;
  never string-concatenate SQL), XSS (render model output as text, never HTML), SSRF/path traversal
  (the LinkedIn fetch validates the URL - keep it strict), invalid JSON (guarded), input + rate limits
  (rate limiting is live on `/api/ai` and `/api/register`), API auth (session-gated routes), excessive
  data exposure (never return password hashes).
- **File uploads:** enforce size (present) + a MIME allowlist; reject executables. Buckets/signed
  URLs/expiration are N/A unless Supabase Storage is adopted - then add Storage policies + owner checks.
- **Payments (P0):** signature-verified Stripe webhook; server-side entitlement; idempotent duplicate/
  retried events; failed payments remove access; prices from trusted server config; no client price id.
- **AI:** keys server-side (true); usage + cost caps; ownership of generations; no double-charge on
  failed jobs; prompt input limits + the decoded-size re-check.

## Phase 5: Automated Security Checks
Run and archive reports: static analysis (Semgrep or CodeQL), secret scan incl. history (Gitleaks),
dependency scan (OSV-Scanner / `npm audit`), licence review, and a running-app scan (ZAP baseline)
against **staging**. Container/infra scans: N/A (no containers). For each finding record: name,
severity, file/endpoint, explanation, impact, recommended fix, fix status, verification. Do not mark
anything a false positive without a documented reason.

## Phase 6: Testing
Extend the Vitest suite (currently green) and add a Playwright harness. Cover: unit (validators,
limits, entitlement math), integration (register -> Supabase row; Stripe webhook -> entitlement;
account delete cascades documents), permission (user B cannot touch user A's documents - the isolation
test exists at the data layer; add the HTTP-level e2e), payment, upload, API, and failure/retry.
Identities to exercise: unauthenticated visitor, User A, User B, paid user, expired/cancelled user.
(No administrator - none exists.)

## Phase 7: Documentation
Create/update: `README.md`, `ARCHITECTURE.md`, `DATABASE.md` (Supabase tables, RLS, migration, backup/
restore), `API.md` (the 8 routes), `SECURITY.md`, `DEPLOYMENT.md` (Vercel + Supabase, env, migration
order, rollback), `TESTING.md`, `TROUBLESHOOTING.md`, `CHANGELOG.md`, and `.env.example` (Supabase
`DATABASE_URL` + the rest; names only, no secrets). README must let a new programmer clone, install,
configure env, set up the Supabase DB, run, test, build, and deploy to staging.

## Phase 8: CI/CD Quality Gate
`.github/workflows/ci.yml` already runs typecheck, lint, format-check, build, tests, plus secret and
dependency scans. Once the one-time `npm run format` lands, make `format:check` a required (blocking)
check. Protect `main`; require human review; no direct pushes to production. Any change touching auth,
billing, the database, or security is high-risk and always reviewed.

---

## Suggested execution order (small PRs)
```text
0. Branch + backups (repo bundle + Supabase snapshot)
1. Swap DB driver Neon -> postgres.js for Supabase; keep signatures; tsc + tests green
2. Extract src/lib -> services/ + validation/ + security/ (one group per PR)
3. constants/ + config/ + utilities/ splits; standardize API response + error shape
4. Payments P0: Stripe webhook + server-side entitlement
5. Security audit fixes (authz, upload MIME, RLS if adopted) + scans
6. Tests: HTTP-level permission e2e + payment + upload
7. Docs (Phase 7) + make format:check required
```

Companion files: `docs/code-audit-cleanup-and-handover-plan.md` (the same audit mapped generically),
`Resume-co_Launch_and_Operations_Plan_2026-07-25.html` (go-live + ops), and
`docs/security-and-testing-plan.md` (QA phases).
