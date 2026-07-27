# External Services Map and Setup Guide

Reference and handover doc for every third-party service the app depends on:
what it does for us, why we chose it, where it is wired in the code, how it
works, and the exact steps to configure it.

Two things hold true for every service below:

1. The integration code is already written. Your job is to create the account,
   copy the key, and paste it into the environment.
2. Everything is env-gated. With a service's key unset it stays inert and the
   app still runs (canned AI fallback, in-memory rate limiting, no analytics,
   and so on), so a missing optional key never breaks the build.

## Where keys go

- Local development: `.env.local` in the project root. Never commit it.
- Production: Vercel, under Project, Settings, Environment Variables (add to
  Production and Preview). After adding or changing a variable in Vercel you
  must redeploy for it to take effect.
- Any variable name that starts with `NEXT_PUBLIC_` is sent to the browser. Put
  only publishable keys, DSNs, and public config there, never a secret.

`.env.example` in the repo lists every variable name with a short comment.

## Quick map

| # | Service | Purpose | Needed for launch | Env keys | Wired in |
|---|---------|---------|-------------------|----------|----------|
| 1 | Vercel | Hosting and deploy | Yes | (platform) | whole app |
| 2 | Supabase (Postgres) | Data storage | Yes (P0) | `DATABASE_URL` | `src/lib/db.ts`, `users.ts`, `documents.ts`, `jobs/saved.ts` |
| 3 | Auth.js / NextAuth | Sessions | Yes | `AUTH_SECRET` | `src/auth.ts` |
| 4 | Google Gemini | AI features | Yes | `GEMINI_API_KEY`, `GEMINI_MODEL` (opt) | `src/app/api/ai/route.ts` |
| 5 | Stripe | Payments and entitlement | Yes (P0) | `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | `checkout/session`, `stripe/webhook`, `lib/stripe/*` |
| 6 | Google OAuth | Sign in with Google | Optional | `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | `src/auth.ts` |
| 7 | Adzuna | Live job listings | Recommended | `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`, `ADZUNA_COUNTRY` (opt) | `src/app/api/jobs/route.ts` |
| 8 | Remotive | Keyless job fallback | Auto | (none) | `src/app/api/jobs/route.ts` |
| 9 | Upstash Redis / Vercel KV | Shared rate limiting | Recommended | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | `src/lib/rate-limit.ts` |
| 10 | Sentry | Error monitoring | Recommended | `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` | `src/instrumentation*.ts` |
| 11 | PostHog | Product analytics | Recommended | `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` (opt) | `src/lib/analytics.ts` |
| 12 | Resend | Transactional email | Recommended | `RESEND_API_KEY`, `EMAIL_FROM` | `src/lib/email.ts` |
| 13 | Checkly | Uptime monitoring | Recommended | (dashboard) | pings `/api/health` |
| 14 | Dropbox Chooser | Import from Dropbox | Optional | `NEXT_PUBLIC_DROPBOX_APP_KEY` | upload components |
| 15 | Dependabot | Dependency security | Recommended | (GitHub) | `.github/dependabot.yml` |
| - | Site config | Canonical URL for SEO | Recommended | `NEXT_PUBLIC_SITE_URL` | `src/lib/site.ts` |

---

## Core services (must be configured for launch)

### 1. Vercel (hosting)

- Purpose: builds and serves the whole app; serverless functions for route
  handlers, static assets on a global CDN, one preview URL per pull request.
- Why we use it: the app is Next.js 16 with React Server Components, route
  handlers, and streaming. Vercel is the platform those features are built and
  tested against, so there is no adapter friction. The alternative, a manual
  VPS or container, would mean hand-managing Node servers, scaling, and a CDN.
- How it works: Vercel builds the Next app, serves SSR and route handlers as
  serverless functions plus static assets on the CDN, and injects env vars at
  runtime.
- Setup:
  1. Push the repo to GitHub, then import it into Vercel (framework auto-detected
     as Next.js).
  2. Add every env var from the sections below under Settings, Environment
     Variables.
  3. Deploy. Every later env change needs a redeploy.

### 2. Supabase (Postgres database)

- Purpose: durable storage of users, resumes, cover letters, resignation
  letters, saved jobs, and subscription status.
- Why we use it: this fixes the single biggest launch blocker. The app
  originally stored users and documents in `.data/*.json` files. Vercel's
  serverless filesystem is read-only and ephemeral, so those writes fail in
  production, which would lose every registration and every saved resume.
  Managed Postgres gives durable, cross-device, multi-instance storage. Supabase
  was the chosen provider; we use the lightweight `postgres.js` driver (no ORM)
  so existing query code carried over unchanged, and the transaction pooler
  because serverless spawns many short-lived connections that would exhaust a
  normal Postgres connection limit.
- Where: `src/lib/db.ts`, `users.ts`, `documents.ts`, `jobs/saved.ts`,
  `entitlements.ts`; schema in `database/schema.sql`.
- How it works: `postgres.js` connects over the transaction pooler (port 6543,
  `prepare: false`). The app switches between the file store and Postgres via
  `isDbEnabled()` (true when `DATABASE_URL` is set). Every query is scoped by the
  signed-in email, which is the per-user isolation boundary.
- Setup:
  1. supabase.com, your project, Connect, Direct connection, Transaction pooler
     (port 6543).
  2. Copy that string into `DATABASE_URL` (keep the query params; it must end in
     `:6543`). It contains the DB password, so treat it as a secret.
  3. Apply the schema once: `node scripts/db-setup.mjs`. Import existing local
     data with `node scripts/import-json-to-db.mjs` if needed.
  4. Verify: sign up, create a resume, confirm the row appears in Supabase,
     Table editor.

### 3. Auth.js / NextAuth (sessions)

- Purpose: sign-in and session management for email/password and Google.
- Why we use it: authentication is high-risk to hand-roll (session fixation,
  insecure cookies, token-signing bugs). NextAuth provides battle-tested JWT
  sessions, httpOnly and secure cookies, and a clean provider model in one
  place. We keep it rather than switching to Supabase Auth because it is already
  wired through every route and the app only needs Supabase as a database, not
  as an identity provider.
- Where: `src/auth.ts`, `/api/auth/[...nextauth]`, and every route that calls
  `auth()`.
- How it works: a JWT session is signed with `AUTH_SECRET` and stored in an
  httpOnly cookie. The Credentials provider verifies the bcrypt password hash;
  failed logins are brute-force throttled.
- Setup:
  1. Generate a secret: `npx auth secret` (or `openssl rand -base64 32`).
  2. Put it in `AUTH_SECRET` locally and in Vercel. Without it, sessions cannot
     be signed in production.

### 4. Google Gemini (AI)

- Purpose: powers every AI feature, including summaries, achievement bullets,
  cover and resignation letters, resume tailoring, job match scoring, interview
  prep, and resume/job parsing.
- Why we use it: all AI features need a capable LLM. `gemini-2.5-flash` is fast
  and cheap enough to sit behind interactive typing and regeneration without lag
  or runaway cost, and the key stays server-side. Everything is funneled through
  one route so cost control, rate limiting, and validation live in one place.
- Where: `/api/ai` only.
- How it works: the server sends a per-task prompt (plus an optional inline PDF)
  to Gemini `generateContent` and returns text or JSON. If the key is missing or
  the call fails, it returns `{ fallback: true }` so the client uses canned
  content and the app keeps working.
- Setup:
  1. aistudio.google.com, Get API key, create a key.
  2. Put it in `GEMINI_API_KEY`. Optionally set `GEMINI_MODEL` (defaults to
     `gemini-2.5-flash`).
  3. Important: the previous key leaked into git history. Rotate it, then revoke
     the old key in Google AI Studio.
  4. Verify: open `/api/ai` (GET). It returns `{ hasKey: true, ok: true }`.

### 5. Stripe (payments and entitlement)

- Purpose: subscriptions and payments, plus the server-side source of truth for
  whether a user is premium.
- Why we use it: two reasons. Billing is the revenue mechanism and Stripe is the
  SaaS standard (cards, wallets, trials, recurring). More importantly, paid
  access must be verified server-side. The original app gated features on a
  `localStorage` flag anyone could flip in devtools. Stripe's signature-verified
  webhook is what makes premium trustworthy: money confirmed by Stripe, written
  to our database, checked by the server.
- Where: `/api/checkout/session`, `/api/stripe/webhook`, `src/lib/stripe/*`,
  `entitlements.ts`, and the checkout UI.
- How it works: embedded Checkout creates a session; Stripe's signature-verified
  webhook writes subscription status into the `subscriptions` table; the server
  reads that table (via `/api/entitlement`) for every gated action. The client
  localStorage flag is display-only and cannot grant access.
- Setup:
  1. dashboard.stripe.com (Test mode), Developers, API keys: copy Secret key to
     `STRIPE_SECRET_KEY`, Publishable key to
     `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
  2. Developers, Webhooks, Add endpoint. URL is
     `https://YOUR-DOMAIN/api/stripe/webhook`. Select events
     `checkout.session.completed`, `customer.subscription.created`,
     `customer.subscription.updated`, `customer.subscription.deleted`,
     `invoice.payment_failed`, `invoice.payment_succeeded` (the last drives the
     branded receipt email). Copy the Signing secret to `STRIPE_WEBHOOK_SECRET`.
  3. Local testing: `stripe listen --forward-to
     localhost:3000/api/stripe/webhook` and use the secret it prints.
  4. Verify: run a test checkout, confirm a row lands in `subscriptions` and
     `/api/entitlement` returns `premium: true`.

---

## Growth and optional services (inert until you add keys)

### 6. Google OAuth (sign in with Google)

- Purpose: one-click sign-in with a Google account.
- Why we use it: it removes the top signup friction, creating and remembering a
  password, which raises conversion. It is optional and self-disabling, so the
  app runs fine on email/password alone.
- Where: `src/auth.ts` (Google provider), login page.
- How it works: OAuth redirect, then NextAuth exchanges the code and creates a
  session. The Google button only appears when both credentials are set.
- Setup: Google Cloud Console, create an OAuth client (Web), set the redirect
  `https://YOUR-DOMAIN/api/auth/callback/google`, then set `AUTH_GOOGLE_ID` and
  `AUTH_GOOGLE_SECRET`.

### 7. Adzuna (job listings)

- Purpose: live job postings with salary, location, and full descriptions.
- Why we use it: the Jobs feature needs real postings to be useful and to feed
  resume tailoring and match scoring. Adzuna provides that with a free key.
- Where: `/api/jobs`.
- How it works: the server queries the Adzuna API with the app id/key and
  normalizes results into our `JobPosting` shape. Without a key it falls back to
  Remotive.
- Setup: developer.adzuna.com, register, create an app, copy App ID and App Key
  to `ADZUNA_APP_ID` and `ADZUNA_APP_KEY`. Optional `ADZUNA_COUNTRY` (default
  `us`).

### 8. Remotive (keyless job fallback)

- Purpose: a live, keyless jobs source.
- Why we use it: it makes the Jobs page show real results out of the box, before
  Adzuna is configured and as a safety net if Adzuna is down or rate-limited.
  Chosen as the fallback because it needs zero setup.
- Where: `/api/jobs`.
- How it works: a public API with no key; used automatically when Adzuna keys
  are absent.
- Setup: none.

### 9. Upstash Redis / Vercel KV (shared rate limiting)

- Purpose: a shared store so rate limits are enforced globally across serverless
  instances.
- Why we use it: the in-memory limiter only counts requests within a single
  serverless instance. Vercel runs many instances, so a client hitting different
  instances slips past the cap, which is a real denial-of-wallet risk on the
  paid Gemini route. A shared Redis store enforces one global limit. Upstash is
  serverless-native (HTTP/REST, no persistent connection) and Vercel KV exposes
  the same API.
- Where: `src/lib/rate-limit.ts` (`limit`, `peek`, `reset`), used by `/api/ai`,
  `/api/register`, and the login throttle.
- How it works: a fixed-window counter using `INCR` and `PEXPIRE` over Upstash
  REST when configured, otherwise the in-memory map. If Redis errors it fails
  open (allows the request) so a store outage never breaks a route.
- Setup: upstash.com create a Redis database (or Vercel, Storage, KV), copy the
  two REST values into `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.

### 10. Sentry (error monitoring)

- Purpose: capture server and client errors with stack traces and request
  context.
- Why we use it: on serverless you cannot tail logs to debug a production crash.
  Sentry turns "a user says it is broken" into an actionable report and alerts
  you. We wired it through Next's native instrumentation rather than the
  `withSentryConfig` build plugin to avoid touching the customized Next 16 build.
- Where: `src/instrumentation.ts` (`onRequestError`), `instrumentation-client.ts`,
  `sentry.server.config.ts`.
- How it works: Next-native instrumentation lazy-inits Sentry only when the DSN
  is set, then forwards errors to sentry.io. The client init is dead-code
  eliminated at build when the public DSN is unset, so no Sentry code ships until
  configured.
- Setup: sentry.io create a Next.js project, copy the DSN, set both `SENTRY_DSN`
  (server) and `NEXT_PUBLIC_SENTRY_DSN` (browser) to that DSN.

### 11. PostHog (product analytics)

- Purpose: measure the funnel, register to build to download to upgrade, and
  feature usage.
- Why we use it: you cannot improve what you cannot see. PostHog shows where
  people drop off instead of guessing, with funnels and feature flags in one
  tool on a generous free tier.
- Where: `src/lib/analytics.ts`, `AnalyticsTracker` in `providers.tsx`.
- How it works: lazy-loads `posthog-js` only when the key is set, then captures a
  pageview on each route change plus any custom `capture()` events.
- Setup: posthog.com copy the Project API key into `NEXT_PUBLIC_POSTHOG_KEY`.
  Set `NEXT_PUBLIC_POSTHOG_HOST` to the EU host if you use EU cloud.

### 12. Resend (transactional email)

- Purpose: send transactional email; a welcome email today, receipts later.
- Why we use it: a new account with no welcome email feels broken, and payment
  without a receipt erodes trust. Resend delivers reliably from your own
  verified domain (so it lands in inboxes), with a simple API and no required
  verification-flow complexity.
- Where: `src/lib/email.ts`, register route.
- How it works: `resend.emails.send()` when `RESEND_API_KEY` is set; a no-op
  otherwise. The welcome email is awaited but best-effort, so it never blocks or
  fails sign-up.
- Setup: resend.com verify your domain (DNS records), create an API key into
  `RESEND_API_KEY`, and set `EMAIL_FROM` to a verified-domain sender such as
  `Resume.co <hello@your-domain.com>`. The resend.dev default only mails the
  account owner and is for testing.

### 13. Checkly (uptime and synthetic monitoring)

- Purpose: alert you when the site is down.
- Why we use it: Sentry reports when code throws, but not when the whole site is
  down (bad deploy, DNS, DB outage). Checkly pings the app from outside your
  infrastructure on a schedule and pages you on failure, the outside-in view
  Sentry cannot provide.
- Where: it pings the `/api/health` endpoint (and can replay the login flow).
- How it works: an external scheduler hits `/api/health` on a cron, asserts
  `200` and `status: "ok"`, and alerts on failure. The only app code required is
  the health route.
- Setup: checkly.com add an API check on `https://YOUR-DOMAIN/api/health`
  asserting 200 and `status: "ok"`, plus an optional browser check on login.

### 14. Dropbox Chooser (import from Dropbox)

- Purpose: let users import a resume file straight from Dropbox.
- Why we use it: convenience, so users skip download-then-reupload. Optional and
  off unless the key is set.
- Where: upload components.
- How it works: the client-side Dropbox picker returns a file link; only active
  when `NEXT_PUBLIC_DROPBOX_APP_KEY` is set.
- Setup: dropbox.com/developers create an app, copy the App key into
  `NEXT_PUBLIC_DROPBOX_APP_KEY`.

### 15. Dependabot (dependency security)

- Purpose: automated dependency and GitHub Actions update pull requests, plus
  security alerts.
- Why we use it: a Next.js 16 dependency tree is large and vulnerabilities appear
  constantly. Dependabot makes patching a routine review instead of a manual
  audit. It is free on private repos and native to GitHub, so no extra account.
- Where: `.github/dependabot.yml`.
- How it works: GitHub scans manifests weekly and on security advisories, then
  opens PRs that CI gates before merge.
- Setup: enable Dependabot alerts and security updates under the repo Settings;
  the config file handles version-update PRs automatically.

---

## How it works: the four flows with real mechanics

### Supabase dual-mode storage

```
Request -> users.ts / documents.ts / jobs/saved.ts -> isDbEnabled()?
   DATABASE_URL set  -> postgres.js -> Supabase pooler (6543)   [production]
   not set           -> read/write .data/*.json                 [local dev]
Same function signatures either way, so routes and auth never change.
```

### Stripe payment to entitlement (server truth)

```
1. User clicks upgrade -> POST /api/checkout/session -> Stripe embedded Checkout
2. User pays on Stripe
3. Stripe -> POST /api/stripe/webhook (signature verified with STRIPE_WEBHOOK_SECRET)
4. Webhook upserts status into the subscriptions table (active / trialing / ...)
5. Any gated action -> server reads subscriptions (via /api/entitlement) -> allow or deny
   The client localStorage flag is display-only and cannot grant access.
```

### Rate limiting (shared or in-memory)

```
/api/ai, /api/register, login -> await limit() / peek() / reset()
   UPSTASH_* set -> INCR + PEXPIRE on Upstash / KV -> global cap across instances
   not set       -> in-memory map                  -> per-instance cap (dev / single node)
On Redis error -> fail OPEN (allow) so a store outage never breaks the route.
```

### Sentry via native instrumentation

```
Server: instrumentation.ts register() imports sentry.server.config ONLY if SENTRY_DSN set
        onRequestError() -> Sentry.captureRequestError(...)      [server errors]
Client: instrumentation-client.ts -> Sentry.init ONLY if NEXT_PUBLIC_SENTRY_DSN set
        (dead-code eliminated at build when unset, so zero bytes shipped)
```

---

## Environment variable reference

| Variable | Service | Secret or public | Required |
|----------|---------|------------------|----------|
| `DATABASE_URL` | Supabase | Secret | Launch |
| `AUTH_SECRET` | NextAuth | Secret | Launch |
| `GEMINI_API_KEY` | Gemini | Secret | Launch |
| `GEMINI_MODEL` | Gemini | Public config | Optional |
| `STRIPE_SECRET_KEY` | Stripe | Secret | Launch |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe | Public | Launch |
| `STRIPE_WEBHOOK_SECRET` | Stripe | Secret | Launch |
| `NEXT_PUBLIC_SITE_URL` | Site config | Public | Recommended |
| `AUTH_GOOGLE_ID` | Google OAuth | Secret | Optional |
| `AUTH_GOOGLE_SECRET` | Google OAuth | Secret | Optional |
| `ADZUNA_APP_ID` | Adzuna | Secret | Recommended |
| `ADZUNA_APP_KEY` | Adzuna | Secret | Recommended |
| `ADZUNA_COUNTRY` | Adzuna | Public config | Optional |
| `UPSTASH_REDIS_REST_URL` | Upstash / KV | Secret | Recommended |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash / KV | Secret | Recommended |
| `SENTRY_DSN` | Sentry | Secret | Recommended |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry | Public | Recommended |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog | Public | Recommended |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog | Public config | Optional |
| `RESEND_API_KEY` | Resend | Secret | Recommended |
| `EMAIL_FROM` | Resend | Public config | Recommended |
| `NEXT_PUBLIC_DROPBOX_APP_KEY` | Dropbox | Public | Optional |

Rate-limit tuning (all optional, have safe defaults): `AI_RATE_LIMIT`,
`REGISTER_RATE_LIMIT`, `LOGIN_RATE_LIMIT`.

## Recommended setup order (fastest safe path)

1. Vercel, Supabase, `AUTH_SECRET`, and Gemini (rotate the leaked key). The app
   now runs and persists.
2. Stripe (keys plus webhook). Payments are real and the paywall is enforced.
3. `NEXT_PUBLIC_SITE_URL`. SEO metadata, sitemap, and robots resolve correctly.
4. Sentry, PostHog, Resend, and Upstash. Monitoring, analytics, email, and
   global rate limits.
5. Adzuna, Google OAuth, Dropbox, and Checkly. Add when you want them.

## The common thread

Most of these services solve a problem that only appears in production at scale:
a read-only serverless filesystem (Supabase), fakeable client-side state
(Stripe), per-instance limits (Upstash), and invisible failures (Sentry and
Checkly). Each is env-gated, so the app degrades gracefully to a working local
build when a given service is not configured.
