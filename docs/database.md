# Database

Persistence is dual-mode:

- **Postgres** (via `postgres.js`) when `DATABASE_URL` is set.
- **Local file store** (`.data/*.json`) in development when it is not.

The access layer lives in `src/services/database/` and exposes a stable set of
functions (documents, users) with identical signatures across both modes, so
routes and `auth.ts` never branch on the backend.

## Layout

```
database/
  schema.sql      Canonical schema (source of truth for tables/columns).
  migrations/     Ordered, forward-only migration files.
  policies/       Row-level security / access policies.
  functions/      Stored procedures / SQL functions.
  seed/           Seed data for local + test environments.
```

## Conventions

- Migrations are additive and forward-only; never edit a shipped migration.
- Keep `schema.sql` in sync with the sum of migrations.
- The file-store mode mirrors the same shapes so tests can run without a database.

See `services/database/` for the runtime access layer.
