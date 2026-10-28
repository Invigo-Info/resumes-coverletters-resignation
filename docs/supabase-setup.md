# Supabase setup

Supabase is the database host for Resumewriter.ai. This document is the whole
procedure, in order, including the one step that is easy to miss and would
expose every user's data.

## What "using Supabase" means here, and what it does not

The app uses Supabase **only as a Postgres server**. It talks to it over a
connection string with [postgres.js](https://github.com/porsager/postgres) and
raw SQL. It does not use:

- `@supabase/supabase-js` — not a dependency, and not needed
- Supabase Auth — authentication is NextAuth (Auth.js) with JWT sessions
- Supabase Storage — file uploads are parsed in-process, never stored
- Supabase Realtime, Edge Functions, or PostgREST

That is a deliberate choice, not an oversight. It means the data layer is
portable: switching to Neon, RDS or any other Postgres is a change of
`DATABASE_URL` and nothing else. It also means **Supabase's own security model
does not protect this app** — no RLS policy is doing any work for us, because we
never authenticate as `anon` or `authenticated`. Ownership is enforced in the
application layer: every query is scoped by the email on the verified session.

## Step 1 — Create the project

1. Create a Supabase project. Choose the region closest to where the app is
   deployed; every query pays the round trip.
2. Save the database password somewhere safe. Supabase shows it once.

## Step 2 — Get the pooled connection string

Project Settings → Database → Connection string → **URI**.

Use the **pooled** connection (Supavisor, port **6543**), not the direct one on
port 5432:

```
postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
```

Why pooled: serverless hosting opens a new connection per invocation and will
exhaust Postgres' direct connection limit under any real traffic. The transaction
pooler is designed for exactly this.

The client is already configured for it in `src/services/database/db.ts`:

```ts
postgres(url, { prepare: false, ssl: "require" })
```

`prepare: false` is **required** — the transaction pooler does not support
prepared statements, which postgres.js uses by default. Without it you get
confusing intermittent errors under load rather than a clean failure. Leave it
alone.

## Step 3 — Put it in the environment

Local: add to `.env.local` (never `.env`, never committed):

```
DATABASE_URL=postgresql://postgres.<ref>:<password>@...pooler.supabase.com:6543/postgres
```

Production: set the same variable in the host's environment settings.

Never paste a connection string into a chat, an issue, a screenshot or a commit.
It contains the database password.

## Step 4 — Apply the schema

```bash
npm run db:migrate
```

This creates a `schema_migrations` ledger, applies `database/schema.sql` as the
`0000_baseline` migration, then applies everything in `database/migrations/` in
filename order. It is idempotent — safe to run again, and safe to re-run after an
interrupted deploy.

```bash
npm run db:status    # what is applied, what is pending; changes nothing
npm run db:verify    # re-run the safety checks only
```

## Step 5 — The step that matters: REST exposure

**This is the one Supabase-specific risk, and the only reason this document
exists.**

Supabase publishes every table in the `public` schema through an
auto-generated REST API (PostgREST), reachable with the project's **anon key**.
That key is *publishable by design* — it is meant to ship in client code. So a
table in `public` with Row Level Security **disabled** is readable by anyone who
knows the project URL.

All six tables hold personal data:

| Table | Contents |
| --- | --- |
| `users` | email, name, password hash |
| `documents` | full resume, cover letter and interview-prep contents |
| `subscriptions` | Stripe customer and subscription ids, plan, status |
| `saved_jobs` | saved postings per account |
| `tailoring_sessions` | resume tailoring snapshots |
| `dismissed_jobs` | hidden postings per account |

`database/migrations/0001_supabase_hardening.sql` closes this. It enables RLS on
all six tables with **zero policies**, and revokes the table grants from `anon`
and `authenticated`.

Zero policies means PostgREST can read nothing. It does **not** affect this app,
because the `postgres` role owns these tables and a table owner bypasses RLS.
We are denying a door we never use and keeping the one we do.

`npm run db:migrate` verifies this afterwards, listing any table in `public`
still lacking RLS and exiting non-zero if it finds one. So a deploy script
cannot quietly succeed with exposed data.

**Any table added later must enable RLS too.** `npm run db:verify` is the check.

### If the app suddenly returns no data after this migration

RLS locked out the connection role, meaning it is neither the table owner nor
`BYPASSRLS`. Roll back and investigate which role `DATABASE_URL` authenticates
as:

```sql
alter table public.users              disable row level security;
alter table public.documents          disable row level security;
alter table public.subscriptions      disable row level security;
alter table public.saved_jobs         disable row level security;
alter table public.tailoring_sessions disable row level security;
alter table public.dismissed_jobs     disable row level security;
```

## Step 6 — Confirm the app is actually on Postgres

`DATABASE_URL` is the switch. Unset, the app silently uses the file store in
`.data/*.json` — which is why this must be confirmed rather than assumed:

1. Start the app and sign up a new account.
2. In the Supabase SQL editor: `select email, created_at from users;` — the new
   account should be there.
3. Create a resume, then `select email, type, title from documents;`.
4. If both are empty but the app works, you are still on the file store:
   `DATABASE_URL` is not reaching the process.

## Step 7 — Backups

Supabase takes automated backups on paid plans; the free tier does not. Before
real users exist:

- Confirm backups are enabled and note the retention period.
- **Rehearse a restore at least once.** An untested backup is not a backup.
- Note the recovery point objective you are accepting.

## Migrating existing file-store data

If `.data/users.json` and `.data/documents.json` hold real data from local use,
`scripts/import-json-to-db.mjs` moves it into Postgres. Run it after step 4, and
take a copy of the `.data` directory first.

## Open items

- **The privacy policy** (`src/app/(public)/privacy/page.tsx`) names Supabase as
  the database provider. That is now correct — but it still omits Resend,
  PostHog, Sentry, Dropbox and Upstash, and states no retention period or legal
  basis. Tracked as M4.
- **Account deletion** does not remove a user's documents: the schema explicitly
  drops the `documents_email_fkey` constraint (OAuth users own documents without
  a `users` row), so there is no cascade. Tracked as P3 and fixed in the
  application layer, not by restoring the FK.
