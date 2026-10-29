# Consent, analytics, and error monitoring

## Read this before setting any key in production

`NEXT_PUBLIC_POSTHOG_KEY` used to be the only switch: the moment it was set,
PostHog initialised and began sending pageviews. There was no consent gate at
all. Under GDPR and the ePrivacy Directive, analytics storage requires consent
**before** it is set — a notice afterwards is not consent — so turning that key
on would have tracked the first EU visitor unlawfully.

That is now fixed, and the order is no longer dangerous. But the rule still
holds in general: **a new third-party script needs a consent category and a
privacy-policy entry before its key goes into production**, not after.

## How the gate works

Two independent switches, both required:

| Switch | Meaning |
| --- | --- |
| `analyticsConfigured()` | A PostHog key exists. Without it, `posthog-js` is never imported, so no analytics code ships at all. |
| `analyticsConsentGranted()` | The visitor actively allowed analytics. Re-checked on **every** call. |

The consent store (`utilities/consent.ts`) has three states, and the third is
the important one:

```
true   -> allowed
false  -> refused, respect silently, do not re-ask
null   -> UNDECIDED: show the banner, permit nothing
```

`null` behaving as "no" is the whole point. A default of "yes" is the unlawful
case, so `consent.test.ts` pins it, and `analytics-consent.test.ts` proves the
consequence: with a key configured and consent undecided, `posthog-js` is never
even loaded.

Consent is re-checked per call rather than cached at init, so a withdrawal takes
effect immediately instead of at the next page load. Withdrawing also calls
`revokeAnalytics()`, which opts out *and* resets the stored distinct id — the id
was set under a permission that no longer applies.

## Why the banner is sometimes absent

It renders only when `analyticsConfigured()` is true. With no PostHog key the
app sets nothing beyond what it needs to run, and a cookie banner would be
pointless and slightly dishonest. Same for the footer's **Cookie preferences**
link.

Both banner buttons carry equal visual weight. A reject option that is hidden,
greyed out, or a click deeper is specifically called out as non-compliant by EU
regulators — and it is a dark pattern regardless.

The banner is `role="region"`, not a dialog: it must not trap focus or block the
page, because someone who wants to read the privacy policy before deciding has
to be able to get there.

## Error monitoring runs without consent — and why that is defensible

Sentry is treated as service security and stability (legitimate interest), not
as analytics. That position only holds **because** of the scrubbing, which is
the reason it is written explicitly rather than left to defaults:

- `sendDefaultPii: false` — no IP addresses, cookies, or request bodies.
- URL query strings are stripped. This is not cosmetic: `?token=` on the
  password-reset and email-verification pages would otherwise put a **live
  single-use credential** into an error report.
- `request.data`, `request.cookies` and `event.user` are deleted in `beforeSend`.
- Session Replay stays **off**. It records the DOM, which on this product means
  recording the resume as it is typed. It would need its own consent category
  and heavy masking before it could be justified.

This is a resume product: the content users type *is* the sensitive data, and a
job search is something people have a strong interest in keeping private from
their current employer. An error report carrying a resume body, a cover letter,
or the writer's email turns a crash tracker into a disclosure.

The error pages surface only a Sentry **event id**, never a message, stack, or
file path — an error page is rendered to strangers.

## What analytics may and may not record

Event names live in `utilities/analytics-events.ts`. Call sites use `EVENTS.x`
rather than string literals, because event names are a schema: a typo or a
rename at one call site silently splits a metric in two, and the damage only
surfaces weeks later when someone asks why signups dropped.

**Never a property:** resume content, employer names, job titles, email
addresses, the text of anything a user wrote, or any AI prompt or completion.
Properties are counts, ids, enum-like choices, and booleans.

Users are identified by a **SHA-256 hash of their email**, never the address. A
PostHog person list of plain addresses would be a directory of who is job
hunting — precisely the inference users would least want exported to a third
party. The hash is stable, so cross-session funnels still work.

The most useful event in the product is `export_blocked`: the exact moment the
paywall bites, and the denominator for every conversion question. It is captured
inside `authorizeDownload` rather than at each of the seven download buttons, so
the funnel cannot drift as buttons are added or moved.

## Configuration

Everything is optional and inert when unset.

```
# Error monitoring
SENTRY_DSN=                      # server
NEXT_PUBLIC_SENTRY_DSN=          # browser
SENTRY_ENVIRONMENT=              # defaults to NODE_ENV
NEXT_PUBLIC_SENTRY_ENVIRONMENT=
SENTRY_RELEASE=                  # defaults to VERCEL_GIT_COMMIT_SHA
NEXT_PUBLIC_SENTRY_RELEASE=      # defaults to NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA

# Product analytics (consent-gated)
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=        # defaults to https://us.i.posthog.com
```

Set a **release**. Without one every stack trace is filed against "unknown" and
a regression cannot be dated to a deploy. On Vercel the commit SHA is picked up
automatically.

### Source maps

`next.config.ts` is deliberately **not** wrapped in `withSentryConfig` — this is
a customized Next 16 build and wrapping it risks the build itself (see
`AGENTS.md`). Upload source maps as a separate build step instead:

```bash
npx @sentry/cli sourcemaps inject .next
npx @sentry/cli sourcemaps upload .next --release "$SENTRY_RELEASE"
```

with `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` and `SENTRY_PROJECT` set in CI. Until
that runs, Sentry still reports errors — the stack traces are just minified.

### EU data residency

If most users are in the EU, prefer `https://eu.i.posthog.com` and an EU Sentry
org. It shortens the transfer-mechanism conversation considerably.

## Manual test

With `NEXT_PUBLIC_POSTHOG_KEY` set, open devtools → Network and filter on the
PostHog host:

1. Load any page with the banner showing. **No requests.** This is the case that
   matters; a request here is the bug.
2. Click **Reject optional**. Still no requests. Reload — the banner stays gone.
3. Footer → **Cookie preferences**, then **Allow analytics**. A `$pageview`
   appears for the page you are on, without needing a navigation.
4. Navigate. One `$pageview` per route change.
5. Footer → **Cookie preferences** again. Collection stops immediately and the
   stored distinct id is cleared.
6. Unset the key and reload: no banner, no footer link, no analytics chunk in
   the network tab at all.
