# Security

## Authentication and route gating

- Auth is handled by NextAuth (`src/features/authentication`, `auth.ts`).
- The route gate (`src/proxy.ts`) redirects signed-out users away from
  authenticated routes and signed-in users away from the sign-in entry.
- Public routes: `/`, `/login`, `/terms`, `/privacy`, `robots.txt`, `sitemap.xml`.

## Permissions

- Entitlement and quota checks live in `src/permissions` (plan limits, resume
  limits, download gates). Route handlers call these before side effects.

## Input handling

- All external input is validated in `src/validation` (schemas, upload checks,
  photo policy, name/URL/format validators) before use.
- Uploads are type- and size-checked server-side, not only in the client.

## Secrets

- Secrets are read from environment variables (see `.env.example`); never commit
  real secrets. The API key and DB URL are required only where the feature is
  used.

## Reporting

See `SECURITY.md` at the repository root for the vulnerability-reporting process.
