# Resume.co - Code Audit, Cleanup and Handover Execution Plan

Created 25 July 2026. This is the app-specific, step-by-step execution of the rules in
`SaaS_Code_Quality_Security_Audit_and_Handover_Guide.md`, mapped strictly to what this codebase
actually is. The source guide assumes a Supabase + admin-panel + file-storage SaaS; several of its
sections do not exist here and are marked N/A so no one wastes effort testing features the product
does not ship.

Companion documents (do not duplicate - this plan references them):
- `docs/security-and-testing-plan.md` - the master QA plan (6 phases).
- `Resume-co_Launch_and_Operations_Plan_2026-07-25.html` - go-live blockers, security risks, stack, ops.
- `Resume-co_Prelaunch_QA_and_GoLive_Guide_2026-07-25.html` - phase-by-phase QA runbook.

---

## Current-state snapshot (verified 25 July 2026)

- Stack: Next.js 16 (customized - see `AGENTS.md`), React 19, TypeScript, Tailwind v4, Zustand.
- Auth: NextAuth v5 beta, JWT strategy, Credentials (email + bcrypt) and Google (only when OAuth env set).
- AI: Gemini `gemini-2.5-flash` behind one route (`src/app/api/ai/route.ts`), server-only key, canned fallback.
- Payments: Stripe checkout (`/api/checkout/session`); no webhook, no server-side entitlement.
- Persistence: file-based JSON in `.data/` (`documents.json`, `users.json`) via `src/lib/documents.ts` and `src/lib/users.ts`.
- Secrets: `.env` / `.env.local` are present locally and NOT git-tracked (`.gitignore` has `.env*`). The Gemini key may still be in git history - must be verified and scrubbed.
- Tooling: `lint` = eslint, `test` = vitest (~57 tests). No Prettier, no `format`/`typecheck` scripts, no CI workflow.
- Docs: only `README.md` exists at root; the other handover docs are missing.
- Quality gate kit lives in the PARENT repo at `../scripts/` (run as `node ../scripts/<gate>.mjs`).

---

## How the guide maps to this app (applicability)

| Guide area | Guide assumes | This app reality | Verdict |
|---|---|---|---|
| Secret scan + rotate | Supabase/Stripe/AI keys in repo | `.env` untracked, but Gemini key likely in history | Applies |
| Environments (local/staging/prod) | Three envs | Only local + intended prod | Adapt - add staging on Vercel |
| Repo restructure | 2,000-line files, mixed logic | Already feature-organized (`src/lib`, `src/components`, `src/app/api`) | Adapt - light touch, do not churn |
| Supabase Row Level Security | Postgres + RLS policies | No DB yet (file store); Neon migration pending | N/A now -> becomes "ownership checks + parameterized SQL" after migration |
| Admin panel / admin authorization | Admin role + routes | No admin role or panel exists | N/A |
| Email verification / password reset | Full auth flows | Not implemented | N/A - document as "not built", do not test |
| File-storage buckets / signed URLs | Uploaded files persisted | Uploads sent inline to Gemini, never stored | Adapt - reduce to size + MIME checks |
| Multi-tenant company isolation | Org accounts | Single-user accounts only | Adapt - user-to-user isolation only |
| Background / scheduled jobs | Job queue | None | N/A |
| Payments webhook + entitlement | Stripe webhooks | Missing (P0) | Applies - top priority |
| Input/API validation | Server re-validates | Routes cast `as Body` with no runtime check | Applies - add Zod |
| AI generation security | Cost/usage limits, ownership | No rate limit / per-user cap | Applies |
| Automated scans + CI gate | CodeQL/Semgrep/ZAP/CI | No CI, no scans wired | Applies |
| Handover docs | 7+ docs | Only README | Applies |

---

## Step-by-step execution

Work on a dedicated branch, small commits, one concern per PR. Do not fold this into a single large commit.

```text
git checkout -b code-audit-and-cleanup
```

### Phase 0 - Protect the product first

1. Back up the repo and the file store before touching anything:
   ```text
   cp -r .data .data.backup
   git bundle create ../resume-co-backup-2026-07-25.bundle --all
   ```
2. Scan git history for secrets (do not trust that `.env` is untracked now - the key may be in an old commit):
   ```text
   gitleaks detect --source . --redact
   git log -p -- .env | grep -i gemini    # confirm whether the key was ever committed
   ```
3. If any real key is found in history: ROTATE it out of band (new key in Vercel env), then scrub history
   (`git filter-repo` or BFG) and force-push, or at minimum confirm the old key is revoked. Deleting the file is not enough.
4. Add `.env.example` at root with names only (no values). This app's real variables:
   ```env
   GEMINI_API_KEY=
   GEMINI_MODEL=
   AUTH_SECRET=
   AUTH_GOOGLE_ID=
   AUTH_GOOGLE_SECRET=
   STRIPE_SECRET_KEY=
   STRIPE_PUBLISHABLE_KEY=
   ADZUNA_APP_ID=
   ADZUNA_APP_KEY=
   DATABASE_URL=
   NEXTAUTH_URL=
   ```
   (Reconcile against the existing `.env.local.example`; keep one canonical example file.)
5. Add a staging environment on Vercel and stop testing on production data.

Acceptance: no secret in history (or key confirmed revoked); `.env.example` present; `.env*` still gitignored.

### Phase 1 - System inventory and data-flow

Most of this is already captured; consolidate rather than rewrite.
1. Confirm the inventory in `README.md` / `docs/` covers: frontend, backend, DB (file store today), auth, payments, AI, external APIs (Adzuna/Remotive), no background jobs, no admin, hosting (Vercel).
2. Add a data-flow diagram to a new `ARCHITECTURE.md` (Phase 7):
   ```text
   User -> Next.js (RSC + client) -> /api/* route handlers
        -> file store (.data/*.json)  [-> Neon Postgres after migration]
        -> Gemini (AI)  -> Stripe (checkout)  -> Adzuna / Remotive (jobs)
   ```

### Phase 2 - Repository structure

The repo is already grouped by purpose, so do a light audit, not a reorg.
1. Verify separation holds: routes in `src/app`, data access in `src/lib`, UI in `src/components`, stores in `src/lib/store`, AI prompt logic in `src/app/api/ai`.
2. Only split a file if it genuinely mixes concerns or exceeds readability (for example if any route mixes UI, data, and payment logic). Do not churn working structure for cosmetic reasons.
3. When the DB migration lands, add a `database/` folder (schema.sql, migrations, seed) per the guide.

### Phase 3 - Code cleanup and tooling

1. Add the missing tooling scripts to `package.json`:
   ```json
   "typecheck": "tsc -p tsconfig.json --noEmit",
   "format": "prettier --write .",
   "format:check": "prettier --check ."
   ```
   Install Prettier; keep ESLint (`eslint-config-next` is present). One convention, enforced.
2. Run the cleanup sweep and fix:
   - Unused files, imports, dead/commented code, and unused dependencies (`npx depcheck`).
   - Console logs that could carry user data (search `console.log` in `src/`).
   - Replace magic values with named constants. Concrete example: the free-plan "3 documents of each type" limit should be a named constant, not an inline `3` in multiple places.
   - Consistent error handling and API-response shape across `src/app/api/*` (today they differ - some return `{ fallback: true }`, some `{ error }`, some throw).
3. Gate it:
   ```text
   npm run typecheck    # expect exit 0
   npm run lint
   npm run format:check
   ```

### Phase 4 - Security audit (mapped to this app)

Test only what exists. Record every finding with: name, severity, file/endpoint, impact, fix, status, verification.

Authentication
- Registration, login, logout, session expiry, Google (if enabled), bcrypt hashing. Add: minimum password policy and failed-login throttling.
- N/A (document as not built): email verification, password reset, MFA, social beyond Google.

Authorization (highest priority for this app)
- User-to-user isolation: confirm user B cannot read or write user A's documents via `/api/documents` or `/api/account`. Owner must be derived from the verified session only, never a client-supplied id/email.
- Paid-feature access must be enforced on the server (see Payments) - not the localStorage flag.
- N/A: admin routes, company-to-company (no such concepts).

Data layer (replaces the guide's Supabase/RLS section)
- Today: file store keyed by normalized email; verify every read/write scopes to the session user.
- After Neon migration: use parameterized SQL only (no string interpolation), scope every query by the session email, and add ownership checks equivalent to RLS in the data layer.

Input and API security
- Add Zod validation at every route boundary (all handlers that do `as Body`): `/api/ai`, `/api/documents`, `/api/register`, `/api/account`, `/api/checkout/session`, `/api/linkedin`. Return 400 on mismatch.
- Keep the server-side upload size check in `/api/ai`; add a MIME allowlist. Never render LLM output as HTML.
- Add rate limiting (Upstash Redis / Vercel KV) to `/api/ai` and `/api/register`.

File uploads (reduced scope - uploads are not persisted)
- Enforce max size (present) and an extension/MIME allowlist; reject executables; do not persist raw uploads.
- N/A: buckets, signed URLs, expiration, randomized filenames (nothing is stored).

Payments and subscriptions (P0)
- Add a signature-verified Stripe webhook; store entitlement server-side; check it on the server for every gated action.
- Handle duplicate/retried webhook events idempotently; failed payments must remove access.
- Prices come from trusted server config; a client cannot pass a price id to change what they are charged.

AI-generation security
- Keys stay server-side (already true). Add per-user usage/cost caps and a global spend alarm.
- One user cannot retrieve another user's generations (tie any stored output to the session user).
- Failed jobs must not double-charge; control duplicate requests; keep the retry/backoff that exists.

Logs and personal data
- Ensure logs never contain passwords, tokens, full API keys, payment data, or raw resume PII.

### Phase 5 - Automated scans

Run and archive reports:
```text
gitleaks detect --source . --redact          # secrets, incl. history
osv-scanner scan source -r .                  # dependency vulnerabilities
npm audit                                     # quick dependency pass
npx semgrep --config auto                     # static analysis (or CodeQL in CI)
# ZAP baseline against STAGING (never production):
docker run --rm -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t https://<staging-url> -r zap-report.html
```
Then manual review - scanners miss business-logic flaws (subscription bypass, user-to-user access). For every finding record severity and fix status; do not silently mark items false-positive.

### Phase 6 - Tests

Extend the existing Vitest + Playwright suite (auth stub: cookie `authjs.session-token=dev` + `**/api/auth/session`).
- Unit: the free-plan limit constant, validators (already covered), entitlement logic, any credit/usage math.
- Integration: register creates the right store record; the Stripe webhook flips entitlement; account deletion cascades to the user's documents.
- Security/permission: user B cannot read/modify/delete user A's documents (the key test); unauthenticated access to a builder redirects to login.
- End-to-end identities to cover: unauthenticated visitor, User A, User B, paid user, expired/cancelled user. (No admin.)
- Failure/retry: `/api/ai` transient failure falls back to canned content; oversized upload is rejected with 413.

Run: `npm run test:run`, `npm run typecheck`, `node ../scripts/accuracy_report.mjs`.

### Phase 7 - Handover documentation

Create these at root (only `README.md` exists today). Keep real secrets out of all of them.
- `README.md` - update: clone, install, `.env` setup, run dev, run tests, build, deploy.
- `ARCHITECTURE.md` - modules, the data-flow diagram, external services, auth/authz model.
- `DATABASE.md` - after migration: tables, columns, relationships, ownership rules, migration + backup/restore. Until then, document the `.data/*.json` shapes.
- `API.md` - one block per route (method, URL, auth required, input, output, errors, rate limit) for the 8 `/api/*` routes.
- `SECURITY.md` - where secrets live, roles (visitor/free/paid), permission model, scanning, how to report a vulnerability, sensitive data, incident response.
- `DEPLOYMENT.md` - staging + production deploy, env vars, migration order, rollback, webhooks, monitoring.
- `TESTING.md` - how to run each test layer and the auth stub.
- `TROUBLESHOOTING.md` - common issues and fixes.
- `CHANGELOG.md` and `.env.example` (from Phase 0).

### Phase 8 - CI/CD quality gate

There is no CI today. Add `.github/workflows/ci.yml` that runs on every PR:
```text
typecheck (tsc --noEmit)  ->  lint (eslint)  ->  format:check (prettier)
->  build  ->  unit + integration tests (vitest)
->  secret scan (gitleaks)  ->  dependency scan (osv-scanner / npm audit)
->  static scan (semgrep or CodeQL)
```
A PR must not merge if any required check fails. Protect `main`; require human review; no direct pushes to production. Any change touching auth, billing, the data layer, or security is high-risk and always reviewed.

---

## Tailored acceptance checklist (ready for handover)

```text
[ ] No real secret in the repo or git history; Gemini key rotated or confirmed revoked
[ ] .env.example present; .env* still gitignored
[ ] typecheck exit 0; lint clean; format:check clean; build succeeds
[ ] Prettier + format/typecheck scripts added; CI runs them on every PR
[ ] User-to-user document isolation verified by an automated test
[ ] Stripe webhook + server-side entitlement live (no localStorage-only paywall)
[ ] Zod validation on all /api/* bodies; rate limiting on /api/ai and /api/register
[ ] Database migration done (Neon); .data/ retired; backup + tested restore
[ ] Critical user journeys have automated tests; the 5 identities covered
[ ] Handover docs written (README, ARCHITECTURE, DATABASE, API, SECURITY, DEPLOYMENT, TESTING, TROUBLESHOOTING, CHANGELOG)
[ ] Staging and production separated; rollback documented
[ ] No unresolved Critical/High security finding; known issues recorded, not hidden
[ ] A new programmer can run and deploy using the docs, without the AI conversation
```

## Explicitly NOT applicable (do not spend time here)

- Supabase Row Level Security, storage-bucket policies, service-role keys (no Supabase).
- Admin panel / admin authorization (no admin role).
- Email verification, password reset, MFA (not implemented - document as absent).
- Signed URLs, file expiration, randomized filenames (uploads are never stored).
- Company-to-company / multi-tenant isolation (single-user accounts).
- Background/scheduled job safety (none exist).

---

## Suggested order (fastest safe path)

```text
Phase 0 (secrets + backup)  ->  Phase 8 CI skeleton + Phase 3 tooling (cheap, high leverage)
->  Phase 4 authz + Payments + Zod (the real risk)  ->  DB migration (unblocks DATABASE.md + persistence)
->  Phase 6 tests  ->  Phase 5 scans  ->  Phase 7 docs  ->  final acceptance
```
```
