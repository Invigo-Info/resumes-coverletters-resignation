# Architecture

Resumewriter.ai is a Next.js 16 (App Router, Turbopack) + React 19 + TypeScript +
Tailwind v4 application. State is held in Zustand stores; persistence is Postgres
(when `DATABASE_URL` is set) or a local file store in development. AI generation
uses Google Gemini; auth uses NextAuth; billing uses Stripe.

This document describes the target folder architecture and the phased migration
that moves the codebase onto it **without changing any behaviour, URL, or public
contract**.

## Structural rule

Keep code grouped by **purpose**, not by file type. A feature owns its UI, its
server logic, and its types together; cross-cutting concerns (validation,
permissions, services) live in dedicated top-level folders.

## Target layout

```
src/
  app/                     Next.js routes ONLY (route groups do not change URLs)
    (public)/              /, /login, /terms, /privacy  (reachable signed-out)
    (authenticated)/       builder, dashboard, jobs, interview-prep, ... (gated)
    (admin)/               reserved (no admin surface yet)
    api/                   route handlers (unchanged)
  features/                authentication, onboarding, billing, generation, user-profile
  components/              common/ (primitives), forms/, layout/  (shared only)
  services/                database/, payments/, email/, storage/, ai/
  validation/              input + format validators, schemas
  permissions/             entitlements, limits, download/eligibility gates
  config/                  site config, runtime config
  types/                   shared TypeScript types
  utilities/               framework-agnostic helpers
  constants/               shared constant values

database/                  migrations/, policies/, functions/, seed/, schema.sql
tests/                     unit/, integration/, end-to-end/, security/
docs/                      architecture, database, api, security, deployment, troubleshooting
scripts/                   build + validation scripts
.github/workflows/         CI
```

### Why route groups, not literal folders

Under Next.js App Router, a folder under `app/` is a URL segment. A literal
`app/authenticated/dashboard` would serve `/authenticated/dashboard` and break
every link, the proxy route gate (`src/proxy.ts`), and SEO. **Route groups**
`(public)` / `(authenticated)` group routes for humans **without** appearing in
the URL, so `/dashboard` stays `/dashboard`.

Auth gating (source of truth: `src/proxy.ts`):
- **Public**: `/`, `/login`, `/terms`, `/privacy`, `robots.txt`, `sitemap.xml`.
- **Authenticated**: everything else.
- **Admin**: none today; `(admin)` is a reserved placeholder.

## Migration map (current -> target)

| Target | Moves from |
|---|---|
| `services/database/` | `lib/db.ts`, `lib/documents.ts`, `lib/users.ts` |
| `services/ai/` | `lib/ai/*` |
| `services/payments/` | `lib/stripe/*` |
| `services/email/` | `lib/email.ts` |
| `services/storage/` | `lib/dropbox.ts`, `lib/pdf-export.ts`, `lib/download-pdf.ts`, `lib/downscale-image.ts` |
| `validation/` | `lib/*-validate.ts`, `lib/schemas.ts`, `lib/upload-validation.ts`, `lib/photo-policy.ts`, `lib/url.ts`, `lib/title-case.ts`, `lib/summary-guards.ts` |
| `permissions/` | `lib/entitlements.ts`, `lib/limits.ts`, `lib/resume-limit.ts`, `lib/resume-download-gate.ts` |
| `config/` | `lib/site.ts` |
| `utilities/` | `lib/utils.ts`, `lib/html-spacing.ts`, `lib/experience.ts`, `lib/docx-text.ts`, `lib/section-routes.ts`, `lib/font-pairs.ts`, `lib/mock-data.ts` |
| `constants/` | extracted shared constants |
| `features/authentication/` | `components/auth/*`, `auth.ts` |
| `features/billing/` | `components/payment/*` (with `services/payments`, `permissions`) |
| `features/onboarding/` | `components/creation/*`, creation-menu route UI |
| `features/generation/` | `components/interview-prep/*`, `components/editor/*`, `lib/interview`, generation logic |
| `features/user-profile/` | `components/account/*` |
| `components/common/` | `components/ui/*` |
| `components/layout/` | `components/layout/*` |
| `components/forms/` | shared form primitives |

Import paths use the `@/*` -> `./src/*` alias, so moves update `@/lib/x` ->
`@/services/x` (etc.) mechanically, verified by `tsc` after every step.

## Phase order (each phase ends green: `tsc --noEmit` + build)

0. Root scaffolding + this document. (no code touched)
1. Library split -> `services` / `validation` / `permissions` / `config` / `utilities` / `constants`.
2. Routing -> route groups `(public)` / `(authenticated)`.
3. Feature extraction -> `features/*` (feature components + their lib together).
4. Shared components -> `common` / `forms` / `layout`.
5. Tests -> Vitest config + move colocated `*.test.ts` into `tests/`.

## Non-negotiables during migration

- No URL changes, no changed public API routes, no changed env contract.
- `tsc --noEmit` exits 0 and the app builds after every phase.
- No behaviour change: this is a move-and-rewire refactor, not a rewrite.
- History preserved via `git mv`.
