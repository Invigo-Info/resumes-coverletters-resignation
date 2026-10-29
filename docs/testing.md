# Testing

Two lanes, deliberately separate.

| Lane | Command | What it covers | Speed |
| --- | --- | --- | --- |
| Unit + isolation | `npm run test:run` | Pure logic, guards, tenancy isolation. No server. | ~2s |
| Integration + e2e | `npm run test:e2e` | Real HTTP against a real production server; one browser suite. | ~30s |

They are separate so the fast lane stays fast. A unit suite that takes thirty
seconds is a unit suite people stop running, and the feedback loop it was
supposed to protect dies quietly.

```bash
npm run test:run                      # the fast lane
npm run build && npm run test:e2e     # the slow lane, needs a build
E2E_BASE_URL=http://localhost:3001 npm run test:e2e   # against a server you already have
```

## Why integration tests exist at all

The unit suite proves a guard function returns `false`. It cannot prove the
deployed route *calls* that guard. That gap — "the logic is right" versus "the
endpoint is safe" — is where authorization bugs actually live, and it is only
visible over real HTTP.

`tests/e2e-setup.ts` boots `next start` (not `next dev`: the dev server compiles
each route on first request, which turns the first hit on every path into a
multi-second wait and produces timeout flakes that look like real failures). It
spawns `node` against Next's own bin script rather than `npx`, because spawning
the `npx.cmd` shim on Windows fails with `EINVAL`, and a shell workaround puts
quoting bugs in the one piece of plumbing every integration test depends on.

## What is covered

**`tests/integration/authz.test.ts`** — the audit's explicit gap: *"Negative /
abuse tests — no tampering or authz-bypass cases"*. Every assertion is an
attempt to reach something without being entitled to it:

- Anonymous access to documents, account deletion, billing portal, checkout, export
- The route gate on six protected paths, including a **forged session cookie**
- The Stripe webhook refusing unsigned and bogus-signature requests
- Account **enumeration**: the password-reset endpoint answering byte-identically for known and unknown addresses
- The health probe disclosing no connection string, key or filesystem path

**`tests/integration/signed-in-journey.test.ts`** — the other half: that the
owner *is* let in, and that limits apply to them. Registers, signs in through
Auth.js's real credentials flow (CSRF handshake and all), then stores a
document, gets refused at the 1 MiB cap, walks the export allowance, and deletes
the account — asserting the credentials no longer work afterwards.

**`tests/end-to-end/paywall-tampering.test.ts`** — the browser suite, for the
one thing HTTP cannot test. The audit phrased the acceptance criterion as a
browser action: *"With localStorage hand-edited to premium, the gated action
still fails."* So this runs the exact console one-liner that used to unlock
everything, and checks the server refuses anyway. It also watches real network
traffic to prove **zero** analytics requests fire before a consent choice, and
checks the skip link is the first thing Tab reaches.

Driven through the `playwright` library under vitest rather than
`@playwright/test`: the library and its browsers were already present, so this
adds no dependency and no second test runner.

## Skips are visible, not silent

The export-allowance ceiling can only be tested with a database. Without one the
server answers `unconfigured`, and asserting a refusal would be asserting
something untrue of that deployment. So that case uses `it.skipIf` and is
**reported as skipped** — a visible skip beats a hollow pass. The backend is
probed at module scope so the decision is made before collection.

## A bug this suite found

The route gate inferred the session cookie's name from the request scheme, while
Auth.js names it from `useSecureCookies` (tied to `NODE_ENV`). On any production
deployment that does not surface `x-forwarded-proto`, Auth.js issues
`__Secure-authjs.session-token` and the gate looked for `authjs.session-token`,
found nothing, and redirected **every signed-in user to `/login`** — with a
perfectly valid session and nothing in the logs. The gate now reads the name
from the cookie that is actually present.

Nothing in the type checker, the unit suite, or the build would have caught it.
That is the argument for this lane existing.

## CI

Three jobs in `.github/workflows/ci.yml`:

- **quality** — typecheck, lint (required, 0 errors), format (informational), unit tests, build. Uploads `.next` so e2e does not rebuild.
- **e2e** — downloads that build, caches and installs Chromium only, runs both slow suites.
- **security** — gitleaks secret scan over full history, `npm audit` (informational).

Node is pinned to 22 in one place (`env.NODE_VERSION`), matched by `.nvmrc` and
`package.json` engines. CI previously ran 20 while local ran 22 — which is how a
version-specific break reaches `main` without anyone seeing it fail.

Format stays informational on purpose. Making it required needs a one-time
`npm run format` across a codebase that predates Prettier, rewriting nearly
every file and destroying `git blame` for the whole history. Worth doing as its
own commit; not worth smuggling into an unrelated change.

## Writing a new integration test

```ts
import { baseUrl } from "../e2e-setup";
const URL = baseUrl();

// redirect: "manual" matters - a 307 to /login IS often the assertion.
const res = await fetch(`${URL}/api/thing`, { redirect: "manual" });
```

Suites run single-threaded (`fileParallelism: false`): they share one server and
some create accounts, so parallel files would race on the same store.
