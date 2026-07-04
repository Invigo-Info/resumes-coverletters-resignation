# Plan: Resume-Based Recommended Jobs - full UI + functionality

## Context

The `/jobs` page today is a minimal first pass: a role dropdown, a live-jobs fetch
(Adzuna → Remotive → generated fallback), simple job cards, a detail panel, and
localStorage save/dismiss. The two feature briefs in
`resume-co/job-search/` (`Resume_Relevant_Jobs_Feature_Brief_With_Scoreboard.docx`
and `Saved jobs/Saved_Jobs_Feature_Brief.docx`) plus ~30 competitor screenshots
define a much richer product: an **Edit-filters modal**, a **dynamic filter chip
row**, a **re-matching loading state**, an **explainable match Scoreboard**
(collapsed card + expandable Position/Requirements/Responsibilities checklist), a
**Not-interested reason flow**, a **Saved-jobs tab** (empty state, count, undo
stack, toast), and a **two-resume role switcher**. This plan turns every brief
sentence + screenshot state into an implementation that matches builder.resume.co.

**Confirmed decisions:** Scoreboard = Hybrid (Gemini when `GEMINI_API_KEY` is set,
heuristic fallback otherwise - mirrors every other AI feature). Persistence =
localStorage now, but structured behind a thin sync layer so a DB can replace it
later (mirror `src/lib/store/documents-sync.ts`). Filters = temporary session
filters; **skip** the "Save new filters?" confirmation modal.

---

## Requirements checklist (from both briefs - nothing dropped)

**Recommended jobs page**
- Top nav with Jobs active; sub-tabs "Recommended jobs" / "Saved jobs" (blue active + underline).
- Heading "Top picks for [target role]" with a dropdown to switch roles (one per resume).
- Filter chip row: Edit filters + job-title chip(s) with `+N` collapse + work-model chip + location chip + date-posted chip.
- Result count ("11 jobs found" / "526 jobs found") that updates on every filter change.
- "Best match" sort control.
- Left: scrollable job cards (logo/initial, title, company, location + work model, salary, posted date, match badge `94 Strong match`, Save, Not-interested X, selected = blue outline).
- Right: sticky detail panel synced to the selected card.

**Edit filters modal**
- Header "Edit filters" + black circular active-filter count badge + close X.
- Job titles: removable chips (multi) + "Enter title" input with autocomplete + suggestion chips.
- Location: "Enter country or city" input with autocomplete + selected chip with X.
- Date posted radios: Past 24hrs / Past 3 days / Past week / Past month.
- Work model radios: Remote and on-site / Remote only / On-site only.
- Reset filters (grey) + Apply filters (blue, **disabled until a change is made**).
- Defaults: Remote and on-site + Past month; Reset → product default (keep resume role title).

**Loading / re-matching state**
- Keep header + chip row visible; progress bar under the chip row (grey → blue); grey skeleton cards + skeleton detail; rotating copy: "Scanning the market for the right fit" / "Pairing your resume with top openings…".

**Detail panel**
- Company name + job title; metadata row: posted date, location, work model, seniority, salary.
- Apply now (primary, external URL) + Save + Not interested (with reason dropdown).
- Match Scoreboard card (see below). Full Job Description below, scrollable inside the panel.

**Match Scoreboard**
- Collapsed: label ("Perfect match - tailor your resume to get noticed" / "Strong match"), short AI explanation, circular green score ring (0-100), chevron on the ring, "Tailor resume to this job" CTA (sparkle).
- Expanded (chevron): keep ring visible; category cards **Position / Requirements / Responsibilities**, each with an icon, divider, and 4-7 checklist rows (label + right-aligned green check or X).
- Labels: 90-100 Perfect/Strong · 75-89 Good · 50-74 Partial · <50 Low.
- Tailor CTA passes resume id, job id, title, description, score, matched + missing items into the tailoring flow.

**Not interested**
- X on card or button in detail → reason dropdown ("I'm not interested in this company/job", "The requirements don't match my skillset", "It's irrelevant to my search", "The salary is too low", "Location doesn't match my needs", "I already applied", "None of the above"); hides the job from recommendations; persists.

**Saved jobs tab**
- Heading "Your saved jobs"; count ("3 jobs", singular/plural); Best-match sort; left list + right detail.
- Empty state: binoculars illustration + "Nothing saved yet. Save interesting jobs to return to them later." (no count/sort/detail when fully empty).
- Save from card **and** detail; button flips Save ↔ Saved everywhere the job appears (keyed by job id).
- Save toast: dark snackbar "Job saved" + "View saved jobs" action → switches to Saved tab.
- Remove (click Saved in Saved tab) → grey undo card "[title], [company] is removed from your bookmarks" + Undo; count decreases immediately; supports an undo **stack** (multiple cards); undo restores exact job; cards expire (~6s) then transition to clean empty state when both active & pending are zero.
- Synchronization across Recommended, Saved, and detail panel.

**Two resumes**
- Role dropdown lists the target role of each of the user's resumes; switching re-runs matching for that resume's role/skills/location.

---

## Architecture & files

### Types & data - `src/lib/jobs/job-search.ts` (extend)
- Extend `JobPosting` with: `workModel` ("Remote" | "On-site" | "Remote and on-site"), `seniority?`, `postedAt?` (epoch, for sorting/date filter). Keep existing `source/description/applyUrl`.
- Add `JobFilters` type: `{ jobTitles: string[]; location: string; datePosted: "24h"|"3d"|"week"|"month"; workModel: "remote_and_onsite"|"remote_only"|"onsite_only"; sort: "best_match" }`.
- Add `DEFAULT_FILTERS(role)` helper (role title, remote_and_onsite, month).
- Keep `generateJobs`, `scoreText`, `matchMeta`; add heuristic scoreboard builder (below).

### Scoreboard - new `src/lib/jobs/scoreboard.ts`
- `MatchScoreboard` type per the brief: `{ score, label, summary, categories: {name, icon, items:{label, matched}[]}[], mainGaps: string[] }`.
- `buildHeuristicScoreboard(job, resumeProfileFull)`: parse the job description into Position/Requirements/Responsibilities lines (keyword classifier: "years"/"degree"/"bachelor"/"required" → Requirements; "oversee"/"lead"/"manage"/"responsible" → Responsibilities; title/seniority/industry → Position), match each against resume evidence (skills, employment titles + descriptions, summary) via keyword/stem overlap, compute weighted score (Position 30 / Requirements 35 / Responsibilities 25 / bonus 10). Deterministic; used as the AI fallback and for list ranking.

### AI task - `src/app/api/ai/route.ts` (extend) + client caller
- Add task `"scoreJob"`: input `{ resume: {role, skills, summary, employment[]}, job: {title, company, description} }`; Gemini returns the `MatchScoreboard` JSON (temperature ~0.2, `responseMimeType: application/json`). Reuse the existing 3-retry + `{ fallback: true }` pattern.
- Client caller in `src/lib/jobs/scoreboard.ts` mirrors `src/lib/ai/mock.ts` `callAi`: try `/api/ai` `scoreJob`; on `null`/fallback use `buildHeuristicScoreboard`. **Hybrid**, lazy-loaded on job select/expand (brief's hybrid model).

### Jobs API - `src/app/api/jobs/route.ts` (extend)
- Accept the full filter set: `titles` (comma list → Adzuna `what_or`), `where`, `date` (→ Adzuna `max_days_old`: 1/3/7/30), `work` (remote_only → prefer Remotive / Adzuna remote; onsite_only → Adzuna with location, exclude remote; both → merge), `sort`.
- Return `{ jobs, count, source }`; map `postedAt`, `workModel`, `seniority`. Post-filter generated fallback by date/work-model so counts stay consistent.

### Filters + saved state store - `src/lib/store/jobs-store.ts` (extend) + `jobs-sync.ts` (new, thin)
- Add to the persisted store: `filters: JobFilters`, `setFilters`, `resetFilters(role)`; `dismissedReasons: Record<jobId, reason>`; `pendingRemovals: {jobId, job, removedAt}[]`, `removeSaved`, `restoreSaved`, `expirePending`. Keep `saved` (Record) + `dismissed`.
- New `src/lib/store/jobs-sync.ts`: no-op stubs (`pushSavedJob`, `deleteSavedJob`) that today just resolve; later they call a `/api/jobs/saved` endpoint. This isolates the future DB swap (same shape as `documents-sync.ts`).

### Components - `src/components/jobs/`
- `job-search.tsx` (rewrite as the orchestrator): tabs, heading + role switcher, chip row, count + sort, loading state, list + detail, toast, undo, empty states. Split large pieces into the files below.
- `edit-filters-modal.tsx` (new): `Dialog`-based modal; reuse `AutocompleteInput` (`aiKind="jobTitle"` / `"location"`) for the two inputs, chip lists, radio groups, count badge, Reset/Apply (Apply disabled until `dirty`).
- `job-card.tsx` (extract): card with match badge, Save, Not-interested dropdown.
- `job-detail.tsx` (extract): header + metadata row + actions + Scoreboard + description.
- `match-scoreboard.tsx` (new): collapsed card + expandable category checklists + score ring (SVG circular progress) + Tailor CTA.
- `filter-chips.tsx` (new): chip row with `+N` title collapse, opens the modal.
- `jobs-loading.tsx` (new): progress bar + skeletons + rotating copy.
- `saved-empty-state.tsx` (new): binoculars illustration (inline SVG, soft rounded panel, on-brand, zero-emoji) + copy.
- `not-interested-menu.tsx` (new): reasons `DropdownMenu`.
- Reuse `sonner` `toast()` for the save snackbar (mounted in `layout.tsx`); Undo rendered as grey cards in the Saved list (per screenshots), not a toast.

### Tailor CTA wiring
- Reuse `src/components/dashboard/tailor-dialog.tsx`, opened from the Scoreboard CTA pre-filled with the selected job's description; pass missing checklist items as extra keyword seeds. (Existing dialog already calls `/api/ai` `tailor`.)

### Top nav - `src/components/dashboard/top-nav.tsx`
- Keep Jobs → `/jobs`. (Screenshots also show "Interview prep"; out of scope - leave nav as-is unless you want a placeholder.)

---

## Visual spec (from screenshots)
- Match ring: green `#16A34A` for 80+, amber `#D97706` otherwise; large number centered; chevron control attached under/right of the ring.
- Selected card: `border-primary` + `ring-2 ring-primary/20`; hover `border-foreground/20`.
- Checklist: green `Check` for matched, muted `X` for missing; category header with lucide icon (`User` Position, `ClipboardCheck` Requirements, `ListChecks` Responsibilities) + divider.
- Progress bar: thin full-width bar under the chip row animating grey→blue.
- Chips/radios use existing tokens (`bg-card`, `border-border`, `bg-secondary`, `text-primary`). Follow the codebase's bracket-hex convention already used (`#16A34A`, `#2563EB`, `#E6EEFF`).

## Responsive
- Two-column `lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]`; single column below `lg` (detail below list, `scrollIntoView` on select - already implemented). Edit-filters modal full-width on mobile; toast centered, not covering CTAs. Verify at 280/320/414px.

---

## Phased execution
1. **Filters foundation** - `JobFilters` type + store fields + `edit-filters-modal.tsx` + `filter-chips.tsx`; wire Apply → refetch. API filter params.
2. **Loading + count + sort** - `jobs-loading.tsx`, dynamic count, Best-match sort, rotating copy + progress bar.
3. **Detail panel + Not-interested** - `job-detail.tsx`, metadata row, Apply-now link, `not-interested-menu.tsx` (reasons → dismiss).
4. **Scoreboard** - `scoreboard.ts` (heuristic) + `/api/ai` `scoreJob` + `match-scoreboard.tsx` (collapsed/expanded, ring, Tailor CTA). Lazy per selected job.
5. **Saved jobs** - tab heading/count/sort, `saved-empty-state.tsx`, save toast + "View saved jobs", undo stack (`pendingRemovals`, expiry), cross-view sync.
6. **Two-resume switcher polish** - ensure role dropdown lists per-resume roles and re-runs matching; wire Tailor dialog.
7. **QA pass** - responsive, no-emoji, type-check.

---

## Verification
- Type-check: `"./node_modules/.bin/tsc.cmd" -p tsconfig.json --noEmit` (expect exit 0).
- No-emoji gate: `python ../scripts/check_no_emoji.py <changed files>` (expect OK). Normalize any en/em dashes to hyphens.
- Live API smoke: `curl "http://localhost:3001/api/jobs?titles=Marketing%20Manager&where=&date=month&work=remote_and_onsite&sort=best_match"` → real jobs + count.
- Manual, on `http://localhost:3001/jobs`:
  - Open Edit filters → add a 2nd title (see `+1` chip), pick location autocomplete, switch Past week + Remote only → Apply becomes enabled → Apply shows progress + skeleton → results + count update.
  - Select a job → detail metadata + Scoreboard collapsed; click chevron → Position/Requirements/Responsibilities checklists with check/X; Tailor CTA opens the dialog pre-filled.
  - Save from a card → toast "Job saved / View saved jobs" → Saved tab shows it; remove in Saved → undo card + count drops → Undo restores; remove all → binoculars empty state after expiry.
  - Not interested → pick a reason → job leaves the list and stays gone on refetch.
  - Reset filters → broader results, role title retained.
  - Resize to 280/320/414px → no horizontal overflow; detail stacks under list.
