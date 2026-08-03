# Troubleshooting

## Dev server

- Runs on **port 3001**, not 3000.
- Customized Next.js: read `node_modules/next/dist/docs/` and `AGENTS.md` before
  changing framework-level code.

## Type errors after moving files

- Import paths use the `@/*` -> `./src/*` alias. After a move, update `@/lib/x`
  references to the new path and run `npx tsc --noEmit`; it lists every stale
  import.

## AI features return canned/heuristic content

- `GEMINI_API_KEY` is missing or invalid. Set it in `.env.local`. The app falls
  back to heuristics by design so the UI never hard-fails.

## Persistence

- No `DATABASE_URL` -> the local `.data/*.json` file store is used (dev only).
- On a serverless host the file store will not persist; set `DATABASE_URL`.

## Auth redirect loops

- Check `src/proxy.ts`: public routes must remain reachable signed-out; the
  sign-in entry must bounce signed-in users to `/`.

## Interview prep questions look wrong (length/format)

- The per-type rules live in `src/services/ai` (screening/manager/technical
  system prompts + task turns). Both the system turn and the user turn carry the
  rules; the user turn is weighted most.
