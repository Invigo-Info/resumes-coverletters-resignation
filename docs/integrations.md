# Integrations: what is wired, and what each key turns on

Everything below is **wired and inert**. Nothing needs code to switch on — add
the key and it works. That is deliberate for local development and treacherous
at launch, because a mistyped key is indistinguishable from a working one. Use
the verification column; a key in a dashboard is not proof.

## The one rule

**Consent ships before keys.** PostHog, GTM and GA4 all set identifiers the
moment their key is present. Under GDPR/ePrivacy that storage needs consent
*before* it is set. The gate exists now, so these keys are safe to add — but the
rule generalises: a **new** third-party script needs a consent category and a
privacy-policy entry first, not afterwards.

## Needs only a key

| Integration | Keys | Where it lives | How to verify |
| --- | --- | --- | --- |
| Postgres | `DATABASE_URL` | `services/database/db.ts` | `npm run db:status` |
| Gemini AI | `GEMINI_API_KEY`, `GEMINI_MODEL` | `app/api/ai/route.ts` | Generate a summary; without the key you get canned text |
| Auth | `AUTH_SECRET` (required), `AUTH_GOOGLE_ID/SECRET` | `features/authentication/auth.ts` | Sign in both ways |
| Stripe | `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PORTAL_CONFIGURATION_ID` | `services/payments/*`, `api/stripe/webhook` | Test-mode checkout charges the advertised amount |
| Email | `RESEND_API_KEY`, `EMAIL_FROM` | `services/email/email.ts` | Send to an address on **another** provider; check it is not spam |
| Rate limiting | `UPSTASH_REDIS_REST_URL/TOKEN` | `permissions/rate-limit.ts` | `/api/health` reports shared vs in-memory |
| Jobs | `ADZUNA_APP_ID/KEY` | `features/jobs` | Search returns live listings |
| Dropbox import | `NEXT_PUBLIC_DROPBOX_APP_KEY` | upload components | The Dropbox picker opens |
| SEO surface | `NEXT_PUBLIC_SITE_URL` | `config/site.ts` | `/robots.txt` and `/sitemap.xml` show the real domain |
| Error monitoring | `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` | `instrumentation*.ts` | Throw a deliberate error; it appears with a release tag |
| Analytics | `NEXT_PUBLIC_POSTHOG_KEY` | `utilities/analytics.ts` | Allow analytics, then watch Live Events |
| Tag manager | `NEXT_PUBLIC_GTM_ID` **or** `NEXT_PUBLIC_GA_ID` | `utilities/google-tags.ts` | See the mutual-exclusion note below |
| Search console | `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, `NEXT_PUBLIC_BING_SITE_VERIFICATION` | `app/layout.tsx` | View source for the meta tag |

`NEXT_PUBLIC_SITE_URL` is the one people forget. It builds `metadataBase`, every
canonical and OpenGraph URL, the sitemap, robots, **and the links in every
password-reset email**. Unset, the fallback chain ends at `http://localhost:3001`
— published in your sitemap for Google to crawl.

## GTM and GA4 are mutually exclusive

Set `NEXT_PUBLIC_GTM_ID` **or** `NEXT_PUBLIC_GA_ID`, not both routes.

If both are set, GTM wins and GA4 is **not** loaded directly — configure GA4
inside the container instead. Loading both means every pageview and event is
recorded twice: nothing errors, nothing looks wrong, and the numbers are quietly
worthless. `tests/unit/google-tags.test.ts` pins this.

Worth deciding knowingly: GTM and PostHog overlap almost entirely for product
analytics. GTM earns its place when marketing needs to drop in ad pixels without
waiting for a deploy. It also **defers a strict CSP** — a nonce-based
`script-src` and a tag manager that injects arbitrary third-party scripts are
close to mutually exclusive in practice.

GTM is gated on the **marketing** consent category, not analytics. It is a
container: what it loads can change in a dashboard without a deploy and without
review, so it is consented to at the broadest purpose it could serve.

## Consent categories

| Category | Covers | Gate |
| --- | --- | --- |
| Necessary | Session cookie, drafts, the consent choice itself | Always on, not asked about |
| Analytics | PostHog, GA4-direct, Web Vitals | Off until allowed |
| Marketing | GTM and anything inside it | Off until allowed |

Two layers protect the visitor: the script is **not rendered** until consent
(stricter than Consent Mode alone), *and* Google Consent Mode v2 signals are
pushed anyway, so tags configured inside a container by someone who never reads
this repo still get told what they may do.

The banner only appears when a key is actually configured — with no optional
storage, a cookie banner would claim tracking that does not exist.

## Sentry source maps

`next.config.ts` is deliberately **not** wrapped in `withSentryConfig` (this is a
customized Next 16 build — see `AGENTS.md`). Upload as a separate CI step:

```bash
SENTRY_AUTH_TOKEN=... SENTRY_ORG=... SENTRY_PROJECT=... npm run sentry:sourcemaps
```

`sentry-cli` ships inside `@sentry/nextjs`, so there is no extra dependency.
Until this runs Sentry still reports errors; the traces are just minified.

## Brand assets

Icons, the manifest and the OpenGraph card are **generated**, not hand-drawn:

```bash
npm run brand:assets
```

`scripts/generate_brand_assets.py` reads the same gradient stops as
`globals.css` and the same lucide glyph as `LogoMark`, so a bookmarked icon
matches the mark in the header. Re-run only when the brand changes; the output
is committed.

## Verify after deploy — a key is not proof

Every integration here fails **silently** when misconfigured. Tick these against
the live deployment, not a preview.

- [ ] Deliberate error appears in Sentry, unminified, with a release tag matching the deployed commit and a hashed user id
- [ ] Pageview appears in PostHog Live Events — **only after** allowing analytics
- [ ] With a fresh EU session and consent undecided: **zero** requests to PostHog or googletagmanager.com
- [ ] Transactional email reaches an inbox on another provider, from your verified domain (not `onboarding@resend.dev`)
- [ ] `/api/health` answers and discloses no version, path or connection string
- [ ] A link-preview tool renders title, description and the OG card
- [ ] `/robots.txt` and `/sitemap.xml` show the real domain and no authenticated route
- [ ] Response headers carry HSTS, `X-Frame-Options`, referrer policy
- [ ] An iOS home-screen bookmark shows the icon, not a screenshot
- [ ] Tab key on any page: the first stop is "Skip to main content"
