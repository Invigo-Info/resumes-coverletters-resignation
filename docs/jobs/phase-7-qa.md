# Phase 7 - QA and verification

Gates that prove the feature compiles, returns real data, and stays emoji-free,
plus the manual checklist for the auth-gated UI.

## Automated gates

### Type-check (expect exit 0)
```bash
cd resume-co && "./node_modules/.bin/tsc.cmd" -p tsconfig.json --noEmit
```

### No-emoji gate (expect OK)
```bash
python scripts/check_no_emoji.py resume-co/src/components/jobs/*.tsx \
  resume-co/src/lib/jobs/*.ts resume-co/src/lib/store/jobs-*.ts \
  resume-co/src/app/api/jobs/route.ts resume-co/src/app/api/ai/route.ts
```
Normalize any en/em dashes to hyphens before committing.

### Live jobs API smoke (expect real jobs + count)
```bash
curl "http://localhost:3001/api/jobs?role=Marketing%20Manager&titles=Marketing%20Manager,Marketing%20Director&where=&skills=seo,content&date=month&work=remote_and_onsite&sort=best_match"
```
Returns `{ source, count, jobs[] }`; each job carries `mode`, `seniority`,
`postedAt`, `matchScore`. Source is `adzuna` when the key is set, else `remotive`,
else the client generates a fallback.

### Scoreboard AI task
```bash
curl "http://localhost:3001/api/ai"          # health: hasKey / ok / model
curl -X POST "http://localhost:3001/api/ai" -H "Content-Type: application/json" \
  -d '{"task":"scoreJob","payload":{"resume":{"role":"Marketing Manager","skills":["SEO"],"summary":"","experience":""},"job":{"title":"Senior Marketing Manager","company":"Acme","description":"Oversee campaigns. 5+ years. Bachelor degree."}}}'
```
Returns `{ data: { score, label, summary, categories, mainGaps } }`, or
`{ fallback: true }` when no key (the client then uses the heuristic).

## Browser automation
Playwright + Chromium are installed (dev dependency). Because `/jobs` is behind
the auth gate, a script must log in via `/login` (or seed a NextAuth session
cookie) before navigating to `/jobs`.

## Manual checklist (on `http://localhost:3001/jobs`, signed in)
- Edit filters: add a 2nd title (see `+1` chip), pick a location, switch Past week + Remote only -> Apply enables -> progress + skeletons -> results + count update.
- Select a job: metadata row + collapsed Scoreboard; chevron expands Position / Requirements / Responsibilities with check / X; Tailor CTA opens the dialog pre-filled.
- Save from a card: toast "Job saved / View saved jobs" -> Saved tab shows it; remove in Saved -> undo card + count drops -> Undo restores; remove all -> binoculars empty state after expiry.
- Not interested -> pick a reason -> job leaves the list and stays gone on refetch.
- Reset filters -> broader results, role title retained.
- Two resumes -> switch role in the heading dropdown -> jobs re-match.
- Resize to 280 / 320 / 414px -> no horizontal overflow; detail stacks under the list.

## Status at handoff
Type-check exit 0; no-emoji OK across all Jobs files; `/api/jobs` returns live
Adzuna results with filters; `scoreJob` returns a structured scoreboard; `/jobs`
returns 307 (auth redirect) unauthenticated. Visual / interaction pass requires a
signed-in browser session.
