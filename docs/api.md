# API

All server endpoints are Next.js App Router route handlers under `src/app/api/`.
Their paths and contracts are **stable** and unchanged by the restructure.

## Endpoints

| Route | Purpose |
|---|---|
| `api/ai` | Gemini-backed generation, task-dispatched (summary, bullets, skills, resume extraction, interview prep). |
| `api/auth/[...nextauth]` | NextAuth handlers. |
| `api/register` | Account creation. |
| `api/account` | Account read/update. |
| `api/documents` | Resume/letter persistence (Postgres or file store). |
| `api/entitlement` | Plan/entitlement lookup. |
| `api/checkout/session`, `api/stripe/webhook` | Billing (Stripe). |
| `api/jobs`, `api/jobs/saved`, `api/jobs/dismissed` | Jobs search + state. |
| `api/tailoring/sessions` | Resume tailoring sessions. |
| `api/linkedin` | LinkedIn import (feature-flagged / provider-pluggable). |
| `api/health` | Health check. |

## Conventions

- Handlers stay thin: validation in `src/validation`, access checks in
  `src/permissions`, side effects in `src/services/*`.
- Never invent candidate facts in AI responses (see `services/ai`).
- Responses use plain-language error messages, never raw internals.
