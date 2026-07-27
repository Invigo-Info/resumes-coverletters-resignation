# Resume.co - Full QA Plan (Security, Testing, Responsive, UI/UX, Content)

This is the single QA checklist for the project. It is worked through four professional
lenses: **Resume Writer** (content + ATS), **Validator** (input validation), **Tester**
(user-side flows + mobile), and **Resume UI Designer** (visual + a11y + responsive).

## Context

The app (`resume-co/`, Next.js 16 / React 19 / TS / Tailwind v4) has these problems this
plan addresses:

1. **A leaked secret is committed to git.** `.env` is git-tracked and contains a live
   `GEMINI_API_KEY`. It is in history, so the key must be rotated, not just untracked.
2. **There are zero automated tests** - no test runner, no `test` script, no config,
   no test files. The codebase has a large surface of pure, deterministic logic
   (validators, resume-progress math) that is high-value and cheap to cover.
3. **Mobile/responsive is only partially covered** - 48 of 107 component files (~45%)
   use breakpoints; the rest are unverified at phone widths.
4. **User-side validation is wired in 7 components** but has no automated proof it
   displays errors and blocks progress.
5. **No design/a11y/content quality gate** runs against the ~25 user-facing routes.

Deployment target is **Vercel/serverless**, which means the file-based JSON store
(`.data/*.json`) will break in production (read-only + ephemeral FS). That database
migration is documented as a required follow-up (Phase 6) so it isn't forgotten.

### The surface being tested
- **~25 user-facing routes**: builder, builder/template, cover-letter (builder/new/preview/
  review), resignation-letter, resumes/cover-letters/resignation write sections, jobs,
  tailoring, interview-prep (4 tracks), dashboard, account, login, payment (checkout/success),
  resume-creation-menu, apply, style-guide.
- **Validation components (7)**: `contact-information.tsx`, `personal-details.tsx`,
  `additional-section.tsx`, `resume-onboarding.tsx`, cover-letter `steps.tsx`,
  resignation `steps.tsx`, `prep-resume-upload.tsx`.

Intended outcome: the leaked key is neutralized; `npm test` runs a green Vitest suite;
the critical flows are proven on desktop and mobile; and the top screens pass a scored
design + a11y + content review.

---

## Tooling map (what automates each check)

| Need | Use (already available) |
|---|---|
| Drive app, e2e, mobile screenshots | `webapp-testing` skill (Playwright) |
| No mobile overflow at 280/320/414 | `scripts/verify_responsive.mjs` |
| WCAG / axe / states / contrast | `resume-co:a11y-audit`, `scripts/axe_audit.mjs`, `verify_states.mjs`, `contrast.py` |
| One-command all gates | `scripts/accuracy_report.mjs` |
| Scored UI/UX design audit | `resume-co:design-review`, `ux-audit`, `uxui-principles` |
| Iterative UI fixing (screenshot loop) | agents `ce-design-iterator`, `ce-design-implementation-reviewer` |
| Frontend race / timing bugs | agent `ce-julik-frontend-races-reviewer` |
| Production QA (Next.js build/routes/SEO) | `vibecode-production-qa-validator` skill |
| Copy / error / microcopy quality | `resume-co:ux-writing`, `ux-copy` |
| Unit tests for validators/logic | Vitest (Phase 2) |
| Parallel fan-out across all 25 routes | `Workflow` multi-agent runner (opt-in) |

---

## Phase 1 - Security: neutralize the leaked `.env` (P0)

Untracking alone does NOT undo exposure - the key sits in git history. Rotation is the fix.

Steps (run in `resume-co/`):
1. **Rotate the key** in Google AI Studio: revoke the current `GEMINI_API_KEY`, generate a
   new one.
2. **Stop tracking the file:** `git rm --cached .env` then commit. `.gitignore` already
   lists `.env*`, so it stays ignored going forward.
3. **Put the new key in the untracked env file:** add `GEMINI_API_KEY=<new key>` to
   `.env.local` (already gitignored; `.env.local.example` already documents it - no doc change needed).
4. **Set the key in Vercel** project env vars (Production + Preview) so serverless has it.
5. *(Optional, only if the repo history must be scrubbed)* purge `.env` from history with
   `git filter-repo` (or BFG) + force-push. Rotation already makes the old key useless, so
   treat this as cleanup, not a blocker. Coordinate before force-pushing shared history.

Verification: `git ls-files | grep '^\.env$'` returns nothing; app boots and the AI health
check `GET /api/ai` returns `{ hasKey: true, ok: true }` with the new key.

---

## Phase 2 - Vitest unit tests (first pass)

### 2a. Install + configure

Add dev deps: `vitest`, `vite-tsconfig-paths` (to honor the `@/*` -> `./src/*` alias from
`tsconfig.json`), and `jsdom` (only for the storage tests in 2c).

Create `resume-co/vitest.config.ts`:
- `plugins: [tsconfigPaths()]` so `@/lib/...` imports resolve.
- Default `environment: 'node'`; use Vitest **projects** or `environmentMatchGlobs` so
  `*.dom.test.ts` runs under `jsdom` and everything else under node.

Add to `package.json` scripts: `"test": "vitest"`, `"test:run": "vitest run"`.

Note (from `AGENTS.md`): this is a customized Next 16.2.7. The pure `lib/*` helpers and the
`getProgress*` functions import cleanly without React/Next, so standard Vitest works for them -
no Next test harness needed. If any import unexpectedly pulls Next internals, check
`node_modules/next/dist/docs/` before assuming the standard setup.

### 2b. Pure-logic tests (node env) - the core of this pass

Colocate as `*.test.ts` next to each source file under `src/lib/`. Target the pure,
dependency-free exports the exploration confirmed:

- `contact-validate.test.ts` - `emailError`, `phoneError`, `formatPhone`, `detectCountry`
  (longest-dial-code-first: +1 vs +91), `isLinkedInProfile`. Boundary cases: 7/15-digit E.164
  edges, exact TLD.
- `validate-name.test.ts` - `nameError`, `sanitizeName` (O'Brien, Jean-Luc, digits rejected).
- `upload-validation.test.ts` - `validateUploadFile` (stub a `File`-shaped object),
  `base64ExceedsLimit` at the **decimal** 10,000,000-byte boundary (10_000_000 ok, 10_000_001 rejected;
  `=`/`==` padding).
- `photo-policy.test.ts` - `hidesPhoto`: "Dublin, Ireland" true; "Irelandia", "Ohio",
  "Latin America" false (whole-word regex).
- `title-case.test.ts` - `titleCase` word boundaries incl. `-` and `/` ("UI/UX", "New Hampshire-Main").
- `url.test.ts` - `normalizeUrl`, `displayUrl`, `urlError`.
- `resume-store.progress.test.ts` - the three pure derivations in
  `src/lib/store/resume-store.ts` (all take a `ResumeState`, no store instance):
  - `getProgress`: empty resume -> 12; fully complete -> 100; earnable weights sum to 88;
    removing a value drops points; HTML-only summary (`<p></p>`) counts as not-done.
  - `getProgressItems`: 12 items with the documented per-field weights + `done` derivation.
  - `getImproveSuggestions`: staged scoring differs from `getProgressItems` - assert the stages.

Build small `ResumeState` fixtures by hand; import the functions directly (they're exported).

### 2c. Storage test (jsdom env) - high value, one file

- `safe-storage.dom.test.ts` - `src/lib/store/safe-storage.ts`: `isQuotaError` detection
  (codes 22/1014, Firefox `NS_ERROR_DOM_QUOTA_REACHED`) and the **reclaim-once-then-retry**
  path on `setItem`, using a mock `StateStorage` that throws a quota error. Assert writes never
  throw and state falls back to in-memory when storage stays full.

### Deliberately out of scope for the unit pass (covered later)
- API-route tests, `documents.ts`/`users.ts` (fs) tests, `documents-sync.ts` fetch-mock tests.
  (When added, note: every protected route shares one `auth()` -> email gate, so one mock covers all.)
- End-to-end flows and mobile are Phase 3, not here.

---

## Phase 3 - Responsive + e2e flows (Tester hat)

Goal: prove the critical journeys work, on desktop and phone widths.

### 3a. Responsive sweep (automated, fast)
Run `node scripts/verify_responsive.mjs src/app` (gate: no horizontal overflow at
280/320/414px). Triage every failing route; the ~55% of components without breakpoints are
the prime suspects. Fix with mobile-first Tailwind utilities. Re-run until clean.

### 3b. e2e critical flows (Playwright via `webapp-testing`)
Drive the app on `localhost:3001`. Cover, once at desktop and once at mobile viewport
(e.g. 390x844):
- **Auth:** login (Credentials) reaches dashboard.
- **Build:** create resume -> fill required fields -> progress bar reaches 100 -> download PDF.
- **Validation display:** enter a bad email/phone/name/url in `contact-information.tsx` /
  `personal-details.tsx` and assert the error text renders and blocks progress.
- **Upload:** an over-limit file is rejected with the size message (`prep-resume-upload.tsx`).
- **Checkout:** Download -> Stripe checkout returns via the validated `next` param.
- **Cross-device sync:** a saved document round-trips through `/api/documents`.

Auth trap (from build conventions): set cookie `authjs.session-token=dev` AND stub
`page.route("**/api/auth/session", ...)` - NextAuth deletes the forged cookie on reload.
Keep harness scripts inside `resume-co/` (ESM resolution); clean up every `tmp-*.mjs`/`tmp-*.png`.

Also worth running once: agent `ce-julik-frontend-races-reviewer` over the async builder/save
code for UI-timing/race bugs (StrictMode double-effect seeding is a known trap here).

---

## Phase 4 - Design review + accessibility (Resume UI Designer hat)

Goal: a scored, criterion-referenced quality bar on the highest-traffic screens
(builder, dashboard, cover-letter builder, jobs) - not all 25 at once.

- Run `resume-co:design-review` per screen: 6 weighted dimensions (hierarchy, consistency,
  a11y, usability, responsiveness, performance) + Nielsen heuristics + prioritized findings.
- Run the a11y gates on the same screens, **light and dark**:
  `node scripts/verify_states.mjs <file> [--dark]` (real computed contrast in default/hover/focus),
  `node scripts/axe_audit.mjs <file>` (WCAG 2.2 A/AA), `python ../scripts/contrast.py <fg> <bg>`.
- For screens that miss the mark, use agent `ce-design-iterator` (screenshot -> analyze ->
  improve loop) rather than one-shot edits.
- Before declaring done, run `node scripts/accuracy_report.mjs` (all gates, light + dark).
  Never state a contrast/WCAG number you did not get from a gate run.

---

## Phase 5 - Content + ATS quality (Resume Writer hat)

Goal: the words users read and the AI produces are correct, on-voice, and ATS-safe.

- Review error/empty-state/microcopy with `resume-co:ux-writing` (what -> why -> how error
  formula; frontloaded verbs). Targets: the 7 validation components' messages and empty states.
- Review the ~19 AI-task prompts in `src/app/api/ai/route.ts` (summary, bullets, skills,
  coverLetter, tailor, scoreJob) for output quality and ATS-friendliness. Normalize the shared
  `improveText` prompt's em-dash (project no-dash rule).
- Resolve the open content threads (from project notes): ATS-badge honesty in `templates.ts`,
  default section order (Employment>Education>Skills vs the Skills-first screenshot), and the
  hardcoded emoji in `cover-letter/preview/page.tsx`.
- These need human judgment (is the resume advice actually good) - the skills enforce copy
  rules, but sign-off is yours.

---

## Phase 6 - Database migration (REQUIRED before Vercel deploy; flagged, separate plan)

Called out because deployment is Vercel/serverless: `.data/documents.json` and
`.data/users.json` are written with `fs.writeFile` to `process.cwd()` with **no locking**.
On Vercel the FS is read-only (except ephemeral `/tmp`, not shared across instances), so every
mutating route (`register`, `documents` PUT/DELETE, `account` PATCH/DELETE) throws or loses data.

The migration is small and well-bounded - the entire persistence surface is 9 functions:
- `src/lib/documents.ts`: `getUserDocuments`, `upsertDocument`, `removeDocument` (+ `isDocType`).
- `src/lib/users.ts`: `findUserByEmail`, `createUser`, `updateUserName`, `deleteUser`, `verifyCredentials`.

Approach when tackled: keep these exact signatures and reimplement their bodies against a
Vercel-friendly serverless Postgres (Neon / Vercel Postgres), so the 8 API routes and `auth.ts`
need **no changes**. Suggested schema: `users(id, email unique, name, password_hash, provider)`
and `documents(id, user_email, type, title, updated_at, template_id, data jsonb)`. Session strategy
is JWT (no auth adapter needed); Google users remain session-only unless an adapter is added.
This phase should get its own plan.

---

## Execution order (recommended)

1. Phase 1 - Security (P0, do first).
2. Phase 2 - Vitest units (foundation).
3. Phase 3 - Responsive sweep + e2e flows.
4. Phase 4 - Design review + a11y on top screens.
5. Phase 5 - Content + ATS pass.
6. Phase 6 - DB migration (its own plan, before any Vercel deploy).
7. Final: `vibecode-production-qa-validator` before shipping.

Optional accelerator: the `Workflow` multi-agent runner can fan Phases 3-5 across all 25
routes in parallel (review + adversarial verify at once). Opt in explicitly when wanted.

## Verification (per phase)

1. **Units:** `npm run test:run` (`vitest run`) in `resume-co/` - suite green.
2. **Types:** from `resume-co/`, `& "./node_modules/.bin/tsc.cmd" -p tsconfig.json --noEmit` -> exit 0.
3. **Lint:** `npm run lint` -> no new errors.
4. **Security:** `git ls-files | grep '^\.env$'` empty; `.env` untracked; `npm run dev` boots
   and `GET /api/ai` reports the new key present.
5. **Responsive:** `node scripts/verify_responsive.mjs src/app` -> no overflow at 280/320/414.
6. **a11y/design:** `node scripts/accuracy_report.mjs` -> reported N/N line is all-pass, light + dark.
7. **Emoji/dash gate:** `python ../scripts/check_no_emoji.py <changed files>`.
8. **e2e:** the Playwright flows in 3b pass on desktop and mobile viewport.

## Files created / modified

- Modify: `resume-co/package.json` (add `test`/`test:run` scripts, dev deps),
  `resume-co/.gitignore` (already covers `.env*` - verify only).
- Create: `resume-co/vitest.config.ts`; `*.test.ts` files under `src/lib/` and `src/lib/store/`
  (Phase 2); throwaway `tmp-*.mjs` Playwright harnesses in `resume-co/` (Phase 3, deleted after).
- Fix as found: responsive utilities in overflowing components (Phase 3), a11y/contrast fixes
  in top screens (Phase 4), copy fixes in the 7 validation components + `api/ai/route.ts` (Phase 5).
- Git: `git rm --cached .env` (Phase 1). Rotate key out-of-band; set `.env.local` + Vercel env.
- No app-logic changes for the test phases - tests only observe existing exported functions.
