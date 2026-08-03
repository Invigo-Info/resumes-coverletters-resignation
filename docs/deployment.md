# Deployment

## Environments

- **Local**: `npm run dev` on port 3001; file store when `DATABASE_URL` is unset.
- **Staging / production**: set `DATABASE_URL` (Postgres) and all required
  secrets from `.env.example`.

## Required environment

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | AI generation. Without it, features fall back to heuristics. |
| `GEMINI_MODEL` | Optional model override (default `gemini-2.5-flash`). |
| `DATABASE_URL` | Postgres connection. Omit for the local file store in dev. |
| `AUTH_SECRET` | NextAuth session secret. |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Billing. |

## Build and gates

```bash
npm install
npx tsc --noEmit          # type-check
npm run build             # production build
```

CI (`.github/workflows/`) runs the quality gates on push/PR.

## Branch flow

- `main` and `staging` track releasable state.
- Large or risky work (e.g. the architecture restructure) runs on its own branch
  and is verified green before promotion.
