# Handover - Resumewriter.ai production readiness

Branch: `handover/production-readiness` (forked from `stitch-design`)

You are picking this up to close the production-readiness gaps. The app is a
working Next.js 16 product; it has never been deployed. Everything below was
executed against a clean clone of this branch, not assumed.

---

## 1. Run it locally (5 minutes)

```bash
git clone <repo-url>
cd resume-co
git checkout handover/production-readiness
npm install --no-audit --no-fund
```

Create `.env.local` with the one variable that is genuinely required:

```bash
# generates a 32-byte base64 secret
node -e "console.log('AUTH_SECRET=' + require('crypto').randomBytes(32).toString('base64'))" > .env.local
```

Then:

```bash
npm run dev          # http://localhost:3001
```

**`AUTH_SECRET` is mandatory.** Without it the app still serves pages, but
`/api/auth/csrf` and `/api/auth/session` return 500 (`MissingSecret`) and you
cannot sign in, so every authenticated page is unreachable. This is the single
most common "it doesn't work" on first checkout.

Every other variable is optional - see `.env.example` and `.env.local.example`
for the full key list (templates carry placeholders only, no values).

### What works with no API keys at all

Verified on a clean clone with only `AUTH_SECRET` set:

| Surface | Behaviour |
| --- | --- |
| Public pages, login | Serve 200 |
| Register + credential login | Works end to end; session issued |
| User + document storage | Falls back to a JSON file store at `.data/` |
| AI features | Canned mock responses (no Gemini call) |
| Rate limiting | In-process memory (no Upstash) |
| Payments, email | Inert until Stripe / Resend keys are set |

`GET /api/health` reports which integrations are live:
`{"status":"ok","checks":{"database":false,"sharedRateLimit":false,"ai":false}}`

Add `DATABASE_URL` to switch from the file store to Postgres. Apply
`database/schema.sql` first (`node scripts/db-setup.mjs`).

---

## 2. What you are fixing

Open **`production-readiness-audit-2026-10-26.html`** in a browser. It is the
working checklist: 5 critical and 8 high findings, each with the evidence that
produced it and the smallest safe fix, plus a stage-by-stage readiness matrix
and a gated plan.

The five launch blockers, in the order the plan tackles them:

| ID | Blocker |
| --- | --- |
| C1 | Paywall is client-side only (`localStorage` + browser-side PDF export), so every paid feature is reachable for free. Needs a product decision before a code change. |
| C2 | Account deletion only removes the `users` row. Resumes, saved jobs, tailoring sessions and subscriptions survive; for OAuth accounts the delete is a complete no-op. The code comment claims a cascade that `schema.sql` explicitly drops. |
| C3 | No password reset and no email verification, combined with `allowDangerousEmailAccountLinking: true` - a lockout problem and an account-takeover path. |
| C4 | Checkout displays "$1.95 due" while Stripe is sent `unitAmount: 2995` + 7 trial days, so the customer is charged $0 now and $29.95 later. |
| C5 | No migration path - `database/migrations/` is empty and the schema is applied by hand. |

Verdict in the report is **NO-GO**. Do not deploy before C1-C5 are closed.

---

## 3. Project conventions

- Dev server runs on **port 3001** (`npm run dev`).
- Route protection lives in **`src/proxy.ts`**, not `middleware.ts` - Next 16
  renamed it. Searching for `middleware.ts` returns nothing and makes the app
  look unprotected when it is not.
- `next.config.ts` pins `turbopack.root` deliberately. Do not remove it.
- Feature code is grouped under `src/features/*`, side-effecting IO under
  `src/services/*`, cross-cutting library code under
  `src/{validation,permissions,config,utilities}`. Full map in
  `docs/architecture.md`.
- Every AI feature is grounded only in the user's own resume. Nothing about a
  candidate may be invented. See `CLAUDE.md` before touching any prompt.

## 4. Gates

```bash
npx tsc --noEmit     # clean
npm run test:run     # 113 tests / 16 files, all passing
npm run build        # succeeds
npm run lint         # currently FAILS - see below
```

**`npm run lint` is red (189 errors)** and CI runs it as a required gate, so CI
is failing on this branch today. Most of the volume is not application code -
ESLint is reading `ds-bundle/`, `design-ref/`, `.ds-sync/` and `agent-skills/`,
including a minified bundle. `npx eslint src` alone gives 62 errors, and those
are real (one `rules-of-hooks` violation, 38 `set-state-in-effect`). Fixing this
is finding H4 in the report: add the design-reference directories to
`globalIgnores` in `eslint.config.mjs`, then fix what remains in `src`.

Note: `CLAUDE.md` tells you to run `python ../scripts/check_no_emoji.py`. **That
script does not exist** anywhere in the repo or its parent. Either restore it or
correct the instruction; until then, check for emoji and em/en dashes by hand -
the codebase convention is to use plain hyphens.

## 5. Known local gotcha

If the dev server starts panicking with:

```
FATAL: An unexpected Turbopack error occurred
Failed to write app endpoint /(public)/page
Caused by: Next.js package not found
```

...and the page appears to shake or flicker in the browser, the Turbopack
incremental cache is stale. Each panic forces a full reload, which loops.

```bash
# stop the dev server first
rm -rf .next
npm run dev
```

This is triggered by switching branches (large-scale file renames bloat the
persistent cache - it reached 2.9 GB here before being cleared). It is not a
config fault: a fresh `next build` succeeds while `next dev` panics, because the
failure is in the HMR path only.

## 6. Testing gap to be aware of

`tests/end-to-end/` and `tests/integration/` are **empty**. Playwright is
installed and unused. The 113 passing tests are unit and isolation tests. No
user journey - signup, login, build a resume, download, checkout, delete account
- has ever been verified as a flow. Finding H7 covers this, and it is what keeps
C1 and C2 fixed once you fix them.

When writing Playwright specs, authenticate by setting cookie
`authjs.session-token` **and** stubbing `page.route("**/api/auth/session", ...)`
- NextAuth discards a forged cookie on reload, so the cookie alone is not enough.
