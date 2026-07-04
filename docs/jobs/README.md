# Jobs feature - phase documentation

Resume-based Recommended Jobs: matches live jobs to the user's resume, grades
each with an explainable match Scoreboard, supports filtering, and keeps a Saved
jobs shortlist. Built in 7 phases; each file below documents that phase's data
(types, stores, API) and functionality (behaviours, flows).

| Phase | Doc | Summary |
|-------|-----|---------|
| 1 | [phase-1-filters.md](phase-1-filters.md) | Filter model, Edit-filters modal, chip row, jobs store, API filter params |
| 2 | [phase-2-loading-count-sort.md](phase-2-loading-count-sort.md) | Re-matching loading state, dynamic result count, Best-match sort |
| 3 | [phase-3-detail-not-interested.md](phase-3-detail-not-interested.md) | Detail panel (metadata + Apply now) and the Not-interested reason flow |
| 4 | [phase-4-scoreboard.md](phase-4-scoreboard.md) | Hybrid AI + heuristic match Scoreboard (score, checklist, Tailor CTA) |
| 5 | [phase-5-saved-jobs.md](phase-5-saved-jobs.md) | Saved tab, empty state, save toast, undo stack, cross-view sync |
| 6 | [phase-6-role-switcher-tailor.md](phase-6-role-switcher-tailor.md) | Two-resume role switcher + Tailor-resume wiring |
| 7 | [phase-7-qa.md](phase-7-qa.md) | Verification gates and how to run them |

## Source map

```
src/lib/jobs/job-search.ts        Types, filters, generated fallback, scoring helpers
src/lib/jobs/scoreboard.ts        Scoreboard types + heuristic + hybrid AI
src/lib/store/jobs-store.ts       Saved / dismissed / filters / undo (localStorage)
src/lib/store/jobs-sync.ts        Save-sync stub (future DB swap point)
src/app/api/jobs/route.ts         Live jobs (Adzuna -> Remotive -> generated)
src/app/api/ai/route.ts           Gemini bridge; `scoreJob` task
src/app/jobs/page.tsx             Route shell
src/components/jobs/*             UI: orchestrator, cards, detail, modal, scoreboard, etc.
src/components/dashboard/tailor-dialog.tsx   Tailor-resume dialog (reused)
```

## Confirmed product decisions

- **Scoreboard = Hybrid**: Gemini (`GEMINI_API_KEY`) when available, deterministic
  heuristic fallback otherwise.
- **Persistence = localStorage** now, isolated behind `jobs-sync.ts` so a real
  database can replace it later without touching the store or UI.
- **Filters = temporary** session filters; no "Save new filters?" confirmation modal.
