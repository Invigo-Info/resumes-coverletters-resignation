# Account recovery: password reset, email verification, OAuth sign-in

What was missing before this: **nothing**. There was no password reset at all.
A user who forgot their password lost their account and every resume in it, with
no path back — no reset, no support inbox, no admin tool. That is the most
common account operation on any site, and its absence was a hard launch blocker,
not a nice-to-have.

## The pieces

| Path | What it does |
| --- | --- |
| `/forgot-password` | Request a reset link |
| `/reset-password?token=…` | Set a new password |
| `/verify-email?token=…` | Confirm an address |
| `POST /api/auth/password/request` | Issue + email a reset token |
| `POST /api/auth/password/reset` | Spend the token, set the password |
| `POST /api/auth/verify` | `{token}` confirms; empty body resends |
| `GET /api/auth/verify` | The signed-in account's verification state |

Storage: `auth_tokens` (migration `0003_auth_tokens.sql`), plus
`users.email_verified_at`. Both backends are implemented — file store for
zero-setup local dev, Postgres when `DATABASE_URL` is set — matching `users.ts`.

## Decisions worth knowing about

**Only the token's hash is stored.** A live reset token is a password
equivalent: whoever holds one owns the account. Storing tokens in plaintext
means a leaked backup, a log line, or read access to one table hands over
working takeovers for every pending request. We persist `sha256(token)` and
compare hashes, so the database never holds anything replayable. Plain sha256 is
correct here, unlike for passwords — the input is 32 bytes of CSPRNG output, so
there is no dictionary to attack and the lookup stays one indexed read.

**The request endpoint cannot be used to enumerate accounts.** It answers
identically for a registered and an unregistered address, including when an
internal error occurs. "No account with that email" would confirm, for any
address, whether that person uses this site — which on a resume site means
confirming they are job hunting.

**Two independent throttles, because they stop different things.** Per-IP caps
bulk enumeration. Per-**account** caps mailbox flooding: without it anyone can
make us mail a victim reset links repeatedly from any number of addresses, which
is harassment and also how a sending domain gets marked as spam.

**Tokens are spent atomically.** One statement marks the token used and returns
its email, so a replayed or concurrent request gets nothing. A check-then-use
would turn a single-use token into a reusable one under load.

**A completed reset invalidates every other outstanding reset token** for that
account. Otherwise an older link — perhaps requested by an attacker, or sitting
in a mailbox the user has since lost — still works against the new password.

**Verification is spent by POST, not by the page load.** Mail scanners, link
previews and corporate security proxies all follow links in email. A GET
endpoint would be consumed before the person clicked, and they would arrive at
"already used" for a link they never opened.

**The route gate must allow these pages.** Someone who forgot their password is
signed out by definition, so gating `/forgot-password` would redirect them to
the login page they cannot get past — the recovery flow would ship completely
unreachable. They are equally *not* treated as sign-in entries, because a
confirmation link is routinely opened in a browser where the user is already
signed in. `tests/unit/recovery-routes.test.ts` locks both halves down.

**Verification is recorded, not enforced.** Every account that already exists
predates this feature, so gating sign-in on a verified flag would lock out the
entire current user base on deploy. It is stored, surfaced on `/account` with a
resend button, and available to gate individual actions later.

## OAuth: what actually protects existing accounts

`allowDangerousEmailAccountLinking: false` on the Google provider **does nothing
in this app**. Auth.js only consults that flag on the database-adapter path, and
`handle-login.js` returns early:

```js
if (!adapter) {
    return { user: _profile, account: _account };
}
```

This app uses JWT sessions with no adapter, so the flag is never read. It stays
set only so that adding an adapter later cannot silently switch auto-linking on.

The real guard is the `signIn` callback, which refuses any OAuth sign-in whose
email the provider has not verified. This matters because documents,
subscriptions and saved jobs are all keyed by **email** — whoever signs in with
an address owns that account's data. Google sets `email_verified` on its OIDC
profile and it is true for both gmail.com and Workspace domains, so a legitimate
Google user is never blocked. A *missing* flag counts as unverified: failing
closed on an unexpected profile shape is the safe direction.

## Configuration

Nothing is required — with no `RESEND_API_KEY` every send is an inert no-op and
the flow still works end to end locally (read the token out of `auth_tokens`).
For real email:

```
RESEND_API_KEY=...
EMAIL_FROM="Resumewriter.ai <hello@your-domain.com>"   # verified domain
NEXT_PUBLIC_SITE_URL=https://your-domain.com           # link origin
```

`NEXT_PUBLIC_SITE_URL` matters more than it looks: it builds the link in every
recovery email. Unset, it falls back to the Vercel production domain, then
`http://localhost:3001`.

Optional tuning (defaults shown):

```
PASSWORD_RESET_IP_LIMIT=10          # requests per IP per hour
PASSWORD_RESET_EMAIL_LIMIT=3        # emails per account per hour
PASSWORD_RESET_ATTEMPT_LIMIT=20     # reset attempts per IP per 15 min
EMAIL_VERIFY_RESEND_LIMIT=3         # verification emails per account per hour
EMAIL_VERIFY_ATTEMPT_LIMIT=20       # confirm attempts per IP per 15 min
```

These are per-instance in memory unless `UPSTASH_REDIS_REST_URL` +
`UPSTASH_REDIS_REST_TOKEN` are set, in which case they hold globally across
serverless instances. On a multi-instance deployment, set them — otherwise each
instance enforces its own copy of the cap.

## Manual test

1. Sign up. A confirmation mail goes out (or is skipped if email is unconfigured).
2. Sign out, go to `/login`, click **Forgot your password?**
3. Enter the address. The confirmation is the same whether or not it exists.
4. Open the link, set a new password. You land on `/login?reset=1` with a notice.
5. Sign in with the new password.
6. Re-open the same reset link: it must now be refused.
