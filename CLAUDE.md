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

### 2026-10-29 - Phase 8: integration + end-to-end tests, and CI to run them

P13 and P12. `tests/integration` and `tests/end-to-end` were both EMPTY, and
the audit's gap was explicit: "Negative / abuse tests - no tampering or
authz-bypass cases".

Two lanes, deliberately separate (`docs/testing.md`):
- `npm run test:run` - unit + isolation, ~2s, no server. Stays fast, because a
  unit suite that takes 30s is one people stop running.
- `npm run test:e2e` - 58 cases against a REAL production server booted by
  `tests/e2e-setup.ts`, plus a browser suite. ~38s.

Why integration tests at all: a unit test proves a guard returns false; it
cannot prove the deployed route CALLS that guard. That gap is where authz bugs
live.

- `authz.test.ts` - anonymous access to documents/deletion/portal/checkout/
  export, the route gate on six paths incl. a FORGED session cookie, the Stripe
  webhook refusing unsigned and bogus-signature requests, account enumeration
  (reset answers byte-identically for known and unknown addresses), and the
  health probe leaking no connection string or path.
- `signed-in-journey.test.ts` - registers, signs in through Auth.js's real CSRF
  handshake, stores a document, gets refused at the 1 MiB cap, walks the export
  allowance to the ceiling, deletes the account, then proves the credentials no
  longer work.
- `paywall-tampering.test.ts` - a real browser running the exact console
  one-liner that used to unlock premium; the server refuses anyway. Also
  watches network traffic to prove ZERO analytics requests before consent, and
  that Tab reaches the skip link first. Driven via the `playwright` library
  under vitest - no @playwright/test, no second runner, no new dependency.
- `responsive.test.ts` - converts two BLOCKED audit items into measured ones:
  no horizontal overflow across 5 public pages x 3 breakpoints (15/15 pass),
  and tap-target sizes.

BUG FOUND BY THE SUITE: the route gate inferred the session cookie's NAME from
the request scheme, while Auth.js names it from `useSecureCookies` (NODE_ENV).
On any production deploy that does not surface `x-forwarded-proto`, Auth.js
issues `__Secure-authjs.session-token` while the gate looked for
`authjs.session-token` - so EVERY signed-in user is redirected to /login, with
a valid session and nothing in the logs. The gate now reads the name from the
cookie actually present. Nothing in tsc, the unit suite or the build caught it.

REAL a11y FINDING (not a test bug): four links measured 20-23px against WCAG
2.5.8's 24px minimum - "Forgot your password?" and the three footer links.
Fixed with `inline-flex min-h-6`. The 1px element was the sr-only skip link,
which is correctly not a pointer target, so the test excludes visually-hidden
elements rather than lowering the bar.

CI (P12): added an `e2e` job that reuses the `quality` job's uploaded build
rather than rebuilding, and caches Chromium. Node pinned to 22 in ONE place
(`env.NODE_VERSION`) matched by a new `.nvmrc` and `package.json` engines - CI
ran 20 while local ran 22, which is how a version-specific break reaches main.
Format stays informational on purpose: making it required needs a one-time
`npm run format` that rewrites nearly every file and destroys git blame, which
deserves its own commit rather than being smuggled into this one.

Skips are visible: the allowance-ceiling case needs a database, so it uses
`it.skipIf` and is REPORTED as skipped rather than taking a silent no-op branch
that reads as a pass.

### 2026-10-29 - Phase 7: remaining stack wiring + the brand/SEO surface

Everything is wired and INERT - keys only, no code needed to switch anything on.

Tag manager / GA4 (Group C)
- `utilities/google-tags.ts` + `components/common/analytics/google-tags.tsx`,
  hand-rolled on `next/script` rather than adding `@next/third-parties`: that
  package's component loads the container as soon as it renders, which is
  exactly what must not happen before consent.
- GTM and GA4 are MUTUALLY EXCLUSIVE at runtime. If both ids are set, GTM wins
  and GA4 is not loaded directly - otherwise a GA4 tag configured inside the
  container double-counts every event, silently. Pinned by a test.
- Google Consent Mode v2 signals (incl. `ad_user_data`/`ad_personalization`)
  are pushed as a second layer, because a container can be edited by someone
  who never reads this repo.

Consent v2
- Added a `marketing` category and bumped CONSENT_VERSION to 2, so a v1
  "accept" cannot be read as permission for tags v2 introduced. GTM is gated on
  `marketing`, not `analytics`: it is a container, so it is consented to at the
  broadest purpose it could serve, not the narrowest one it serves today.
- Banner gained a granular panel (toggles default OFF, so opening and saving
  grants nothing the visitor did not switch on).

Observability completion (I2)
- `Sentry.setUser({ id })` with the SAME hashed email id analytics uses, and
  cleared on sign-out. This REVISES the Phase 6 scrub, which deleted
  `event.user` outright and with it the ability to answer "one customer or
  everyone?" - the first question in an incident. Now reduced, not deleted: the
  hashed id survives, email/username/IP do not.
- `npm run sentry:sourcemaps` (sentry-cli ships inside @sentry/nextjs - no new
  dependency). next.config stays unwrapped per AGENTS.md.
- Web Vitals reported into PostHog, consent-gated like everything else.

Brand + SEO surface
- `scripts/generate_brand_assets.py` (`npm run brand:assets`) generates icon.png,
  apple-icon.png, the 192/512 manifest icons and the 1200x630 OG card from the
  SAME gradient stops as globals.css and the SAME lucide glyph as LogoMark, so a
  bookmarked icon matches the header mark. Output is committed; no runtime
  ImageResponse route or edge function.
- `icon.svg`, `manifest.ts` (standalone display, start_url /dashboard), and
  search-console verification wired from env - omitted entirely when unset,
  since an empty verification tag looks configured but is not.
- `twitter.card` had been `summary_large_image` with no image file anywhere, so
  every shared link rendered a blank card.

BUG FOUND AND FIXED while verifying: the route gate matched
`/manifest.webmanifest` and redirected it to /login. A signed-out browser and
every crawler got an HTML redirect instead of the manifest, so the install
prompt and home-screen icon silently never worked. Matcher now also excludes
`webmanifest|txt|xml`. The regression test targets `config.matcher`, not
`proxy()` - these paths are protected by never reaching the handler, so
asserting against the handler tests the wrong layer.

Accessibility
- Skip link (WCAG 2.4.1 Bypass Blocks, Level A) as the first focusable element,
  with `id="main-content"` + `tabIndex={-1}` on all 13 `<main>` landmarks -
  without the tabindex, Safari and Firefox scroll without moving focus, so the
  next Tab returns to the top. Verified `<img>`/`<Image>` alt coverage: already
  complete.

Env hygiene (Group D)
- Documented every previously-undocumented read (LOGIN_RATE_LIMIT,
  REGISTER_RATE_LIMIT, TRUSTED_PROXY_HOPS, all the reset/verify/export limits,
  GTM/GA, site verification, SENTRY_AUTH_TOKEN/ORG/PROJECT).
- Deleted the `.env.local.example` relic and its .gitignore negation.
  `.env.example` is now the single source - two templates that disagree is how
  a key gets missed on a fresh deploy.

Grounding doc: `docs/integrations.md` - what each key turns on, the GTM/GA
decision, and a post-deploy verification list (every one of these fails
silently when misconfigured).

### 2026-10-29 - Phase 6: consent gate, then analytics and error monitoring

Consent FIRST, because the order was the risk. PostHog initialised and started
sending pageviews the moment NEXT_PUBLIC_POSTHOG_KEY was set, with no consent
gate at all - and GDPR/ePrivacy require consent BEFORE analytics storage is set,
not a notice afterwards. Setting that key would have tracked the first EU
visitor unlawfully.

- `utilities/consent.ts` - versioned consent store with THREE states. `null`
  (undecided) permits nothing and is deliberately distinct from a recorded
  `false`; a default of "yes" is the unlawful case, so tests pin it. A stored
  decision from an older version is treated as undecided, so adding a category
  cannot inherit consent never given for it.
- `consent-banner.tsx` - banner + a permanent footer "Cookie preferences" entry
  (consent must be as easy to withdraw as to give). Both buttons carry equal
  weight; a buried reject is a dark pattern and explicitly non-compliant. Shown
  ONLY when a PostHog key exists - with no optional storage, a cookie banner
  would be pointless and slightly dishonest. `role="region"`, not a dialog, so
  it cannot trap focus before someone reads the privacy policy.
- Analytics now needs configured AND consented, re-checked on EVERY call rather
  than cached, so a withdrawal takes effect immediately. PostHog also inits
  `opt_out_capturing_by_default` and opts in explicitly. Withdrawal calls
  `revokeAnalytics()`, which opts out and RESETS the stored distinct id.
- `analytics-events.ts` - the event catalogue. Call sites name `EVENTS.x`, never
  a literal: event names are a schema, and a rename at one call site silently
  splits a metric. First real capture() call sites (there were zero):
  export_blocked / document_exported (both inside `authorizeDownload`, so the
  paywall funnel cannot drift as buttons move), checkout_started,
  checkout_completed, billing_portal_opened, user_signed_up/signed_in.
- Users are identified by a SHA-256 hash of their email, never the address: a
  PostHog person list of plain addresses would be a directory of who is job
  hunting. Documented ban on ever sending resume content, employer names, job
  titles, written text, or AI prompts/completions as properties.
- Sentry hardened and kept consent-free as service stability - defensible only
  BECAUSE of the scrubbing: `sendDefaultPii: false`, `beforeSend` strips URL
  QUERY STRINGS (a `?token=` on the reset/verify pages would otherwise put a
  live single-use credential into an error report), request body, cookies and
  user. Session Replay stays off - it records the DOM, i.e. the resume being
  typed. Added environment + release (without a release every stack trace is
  filed against "unknown").
- Privacy policy (M4): added Sentry, PostHog and Resend to the provider list
  (a material omission once keys are set), rewrote Cookies around the consent
  model, and corrected the deletion section - it now describes full erasure of
  every per-user store plus what necessarily survives at Stripe and PostHog.
  Verified the "we cancel your subscription first" claim is actually true in
  /api/account DELETE.

Grounding doc: `docs/observability.md` (includes why next.config is NOT wrapped
in withSentryConfig, and the standalone sourcemap upload instead).

Verified: tsc clean, eslint 0 errors, build OK, vitest 189 passed (12 new). The
load-bearing test is `analytics-consent.test.ts`: with a key configured and
consent undecided, posthog-js is never even IMPORTED.

### 2026-10-29 - Phase 5: the export paywall is now actually enforced

The free tier allows 3 distinct documents per kind. That allowance was counted
entirely in localStorage (`resume-co:downloads`, plus `resume-co:paywall` for
premium), so CLEARING SITE DATA RESET IT - the free tier was in practice
unlimited and the paywall created no reason to subscribe. No server call was
part of the decision, and nothing server-side could refuse a download.

- `document_downloads` (migration `0004`) + `permissions/download-ledger.ts` +
  `POST /api/export/authorize`. The decision and the record happen in ONE
  transaction: a separate "may I?" then "I did" lets concurrent clicks pass the
  check before any of them records, spending one slot repeatedly.
- All 7 download call sites now await server authorization before exporting
  (resume top-bar, improve panel, dashboard, two tailoring handlers, cover
  letter preview + design panel, resignation letter preview).
- The client fails CLOSED. Failing open would mean one ad-blocker rule against
  `/api/export/authorize` restores the unlimited free tier - no devtools, no
  patched JS. The server's error path fails closed for the same reason. The
  legitimate "no server to ask" case is answered by the SERVER (`unconfigured`
  when there is no DATABASE_URL), so local dev works without a client bypass.
- `shouldUpsell` separates "allowance spent" from "could not reach the server":
  a subscriber hitting a dropped connection gets a retry message, not an
  upgrade page that reads as "your subscription is gone".
- Repeats stay free (the allowance counts distinct documents), a refused
  attempt does not occupy a slot, and premium downloads are still recorded so a
  lapsed subscription does not hand slots back.
- `clearDownloads` added to the account-erasure orchestrator.
- The old `canDownload`/`recordDownload` and the unused `useDownloadAllowance`
  are gone; `useDownloadGate` survives as a badge cache only, hydrated from the
  server so a tampered value is corrected rather than trusted.

LIMIT, stated rather than hidden: the PDF is still rendered in the browser from
data the user typed, so this does not make exporting impossible - someone
editing the page's JS can still produce a file, and the live preview can be
printed. What is now real is the ALLOWANCE. Gating the artifact itself needs
server-side rendering (headless browser, templates reproduced server-side,
different pagination) and would not stop print-the-preview either; deliberately
not done. Reasoning in `docs/export-paywall.md`.

Verified: tsc clean, eslint 0 errors, build OK, vitest 177 passed (13 new), and
migration 0004 applied with 11/11 checks against the real database - including
the concurrency property: 3 simultaneous requests with 2 of 3 slots used allow
exactly one, and the ledger lands exactly on the limit.

### 2026-10-29 - Phase 4: account recovery (branch: handover/production-readiness)

There was no password reset at all. A user who forgot their password lost their
account and every resume in it - no reset, no support inbox, no admin tool.

- `auth_tokens` (migration `0003`) + `users.email_verified_at`, with both
  backends (file store for local dev, Postgres when `DATABASE_URL` is set).
  Only `sha256(token)` is persisted - a live reset token is a password
  equivalent, so a leaked backup must not contain replayable ones.
- New: `/forgot-password`, `/reset-password`, `/verify-email`, and
  `POST /api/auth/password/{request,reset}` + `GET|POST /api/auth/verify`.
  Verification mail now also goes out on sign-up, with a resend on `/account`.
- The request endpoint answers identically for a known and an unknown address
  (no account enumeration - on a resume site that would reveal who is job
  hunting), and is throttled per IP *and* per account (mailbox flooding).
  Tokens are spent in one atomic statement; a completed reset invalidates every
  other outstanding link for that account.
- The route gate now allows the recovery pages: gating them would have
  redirected locked-out users to the login page they cannot get past, shipping
  the whole flow unreachable. Locked down in `tests/unit/recovery-routes.test.ts`.
- Verification is recorded, NOT enforced at sign-in - every existing account
  predates it, so gating login would lock out the current user base.
- **Correction to the Phase 0 note below:** `allowDangerousEmailAccountLinking`
  is inert in this app. Auth.js only reads it on the adapter path and
  `handle-login.js` returns early when there is no adapter; this app is JWT-only.
  The real guard is the new `signIn` callback refusing any OAuth profile whose
  `email_verified` is not true - which matters because every store is keyed by
  email. Details in `docs/account-recovery.md`.
- `siteUrl()` dev fallback corrected 3000 -> 3001 (the actual dev port); it now
  builds recovery-email links, where a wrong port is a dead link.

### 2026-10-29 - Phase 3: payments made correct under Stripe's real guarantees

Stripe delivers webhooks at-least-once and in no particular order; the handler
assumed exactly-once and ordered.

- `processed_events` (migration `0002`): every event is claimed by id before it
  is handled, and the claim is RELEASED if the handler throws - otherwise a
  transient error would permanently lose a paid customer's entitlement. Fixes a
  retried `invoice.payment_succeeded` mailing a second receipt.
- `subscriptions.last_event_at` + an ordering guard on every entitlement write.
  A stale "active" event delivered after a cancellation used to resurrect the
  subscription, so a cancelled customer kept premium.
- `current_period_end` is no longer wiped by events that say nothing about the
  billing period; `checkout.session.completed` now requires a paid status.
- **Pricing bug:** the trial config told Stripe to run a FREE trial ($0 today,
  $29.95 on day 7) while the page advertised $1.95 - no code path ever charged
  $1.95. The upfront amount is now a one-time line item alongside the recurring
  price. Verified against the Stripe test API (`amount_total: 195`).
- **Cancellation:** `POST /api/billing/portal` opens Stripe's Customer Portal
  (customer resolved from the session email, never a client id), with a "Manage
  subscription" button on `/account`. Previously the only way to stop billing
  was to delete the account. The portal config is code-managed via
  `scripts/stripe-portal-config.mjs` rather than clicked into a dashboard.
- **Checkout:** sign-in now required (without an email the webhook receives a
  payment it cannot attribute - charged, granted nothing), rate-limited, and
  `?next=` validated with `safeInternalPath` - `startsWith("/")` waves through
  `//evil.com`, an open redirect landing where card details were just entered.
- **Paywall bypass fixed on `/payment/success`:** it granted premium to whoever
  was signed in for ANY completed session id, so one payment could be replayed
  to premium-ify unlimited accounts. The session must now belong to the
  signed-in account.
- **P9:** `clientIp` read the FIRST `x-forwarded-for` entry, which the client
  supplies - varying it minted a fresh bucket per request, so no rate limit
  applied at all (uncapped Gemini spend, unlimited signups). Now prefers
  platform-set headers and otherwise counts in from the right.

### 2026-08-10 — Blue+white UI redesign (branch: redesign-blue-white)

App-wide chrome redesign to a disciplined blue+white system, driven entirely from
the single `src/app/globals.css` `:root` token layer (no per-page palette, no
hardcoded hex in components). No route, API, or workflow change; the resume/letter
DOCUMENT themes (`src/config/resume-themes.ts`, live preview, template accents) are
a carve-out and stay untouched.

- Palette: `--primary #2563eb` (blue) + soft blue tints; neutrals on a light-gray
  page (`--background #f6f7f9`), white cards, red-600 destructive. AI accent kept
  purple (`--ai-* #6d28d9`, contrast-verified). Progress bar keeps its orange→green
  motivational ramp; charts stay multi-hue (data-viz exception).
- Type: Inter (UI) + Gabarito (headings), base-18 (~1.2) scale; cards use soft
  elevation shadows.
- Controls: blue active tab + solid-blue Home button; transparent 10px inputs;
  neutral section-nav links with a green completion dot.
- Jobs: Fair-match ring is now amber for a fair score (was always green) via a
  score-banded `ringTheme` in `features/jobs/lib/keyword-match.ts`.

Grounding doc: `docs/design-foundation.md`. Verified: `tsc --noEmit`, `check_no_emoji`,
and render-and-look on the editor + home. A short-lived "Precision Workspace"
(teal/Hanken/flat-card) pivot was applied then fully reverted on 2026-08-10. Not
merged to main.

### 2026-08-03 — Technical prompt: evidence/gap/regulated rules + question length

Folded the new-prompts Technical spec (`Technical_Interview_System_Prompt.docx`)
into `TECHNICAL_SYSTEM_PROMPT` as rules only (NDJSON output unchanged; the doc's
answer_mode/evidence_ids schema not adopted). Added: evidence-priority order;
career-gap rules; expanded regulated/high-risk handling (licences only as shown,
no assumed-active status, no invented incidents, no single universal procedure -
coach to own protocol/scope); a student clause (do not ask beyond the experience
shown); and question length raised to about 8-18 words (never over 22) in the
system prompt + task turn. Technical stays tips-only (exactly 2 tips, no sample
answers, no candidate questions).

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
