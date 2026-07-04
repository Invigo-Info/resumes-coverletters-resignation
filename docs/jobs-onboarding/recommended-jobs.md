# Resume-Based Recommended Jobs

Extracted from `jobs-oboarding/Resume_Relevant_Jobs_Feature_Brief.docx` (Steps 1-16).
The `..._With_Scoreboard.docx` file is a superset: Steps 1-16 are identical, and it
adds Steps 17-18 - see [match-scoreboard.md](match-scoreboard.md).

## Purpose

After a user uploads or creates a resume, the system scans a job database and shows
suitable openings. Each job is graded with a match percentage (for example 95 or 96)
so the user understands how closely the role fits their resume. Users can filter the
database, open details in place, and save / reject / apply to jobs. Results update
with loading, empty, and reset states.

Feature name: **Relevant Jobs for Uploaded Resume / Resume-Based Job Match Engine**.

This is the page at `/jobs`. It is upstream of the Apply Now flows in this folder:
selecting **Apply now** on a job here opens the [gateway](README.md).

---

## Step 1 - Recommended Jobs Dashboard

The main jobs page, shown once a resume profile is available.

**Page purpose**
- Show recommended jobs based on the uploaded resume.
- Score every visible job with a match percentage.
- Open job details without leaving the page.
- Save, reject, or apply to jobs.
- Refine results with filters: job title, location, date posted, work model.

**Page layout**
- Top navigation: Resumes, Cover letters, Resignation letters, Jobs, Interview prep. Jobs is the active module.
- Sub-tabs: **Recommended jobs** and **Saved jobs**.
- Main heading: **Top picks for [resume target role]** (for example, Senior Marketing Manager).
- Filter chip row: Edit filters, job title chips, work-model chip, location chip, date-posted chip.
- Left column: scrollable job cards with match scores and quick actions.
- Right column: job detail panel for the selected job.

**Job list card**
- Company logo or placeholder icon.
- Job title and company name.
- Location and work model (for example Tampa, FL, Remote, On-site, or Remote US).
- Salary if available.
- Date posted (for example 22 days ago or 3 days ago).
- Match badge with percentage and label (for example `95 Strong match`).
- Save button and Not-interested / X button.
- Selected card gets a stronger border or active highlight.

**Job detail panel**
- Company name and job title at the top.
- Metadata row: date posted, location, salary, work model, seniority level.
- Primary **Apply now** button.
- Secondary **Save** and **Not interested** buttons.
- Match explanation card with a circular percentage score.
- CTA: **Tailor resume to this job**.
- Job description below, scrollable inside the panel.

**Match score UX**
- Each job receives a match percentage from the matching engine.
- High scores are emphasized with a circular badge / green score indicator.
- Simple labels (Strong match, Perfect match) make the score readable at a glance.
- The card explains why the resume matches and what is missing (for example missing SQL/HTML/CSS/JavaScript evidence).

---

## Step 2 - Edit Filters modal (default structure)

The control center for narrowing recommended jobs. Opens over the page with the
background dimmed.

- **Purpose**: change search criteria without leaving the page; show how many filters are active; apply, reset, or close.
- **Header**: title "Edit filters"; a black circular badge with the active-filter count (1-5); a top-right X that closes without applying unsaved changes.
- **Sections**: Job titles (chips + input), Location (chip + input), Date posted (radios), Work model (radios).
- **Bottom actions**: Reset filters (secondary grey) and Apply filters (primary blue).
- **UX rule**: Apply filters is not clickable unless a change was made - prevents needless reloads and makes the modal feel intentional.

---

## Step 3 - Job title filter logic

The Job titles area supports multiple titles, so the user can search around a target
role rather than one exact title.

- **Selected chips**: rounded chips, each with a remove X. Removing a chip updates the active-filter count and enables Apply. On the main page, multiple titles collapse to the main chip plus a compact `+1`.
- **Input**: placeholder "Enter title"; typing shows autocomplete suggestions (Marketing Writer, Marketing Web Designer, Marketing Teacher, Marketing Support Specialist, Marketing Specialist...). The user can pick a suggestion or add a typed custom title.
- **Suggested roles** (no typing): suggestion chips such as Marketing Director, Head of Marketing, Marketing Strategy Lead, Brand Development Manager. Clicking one adds it; adding a second title raises the count.
- **Backend**: store `job_titles` as an array; use OR logic (or weighted relevance) when retrieving; use title terms in matching so related titles surface (for example Performance Marketing Manager for Senior Marketing Manager).

---

## Step 4 - Adding a second job title

- Allow more than one selected title; each remains individually removable; the count rises after adding.
- The dashboard chip row must not grow too long - collapse extra titles into `+1`, `+2`, etc.
- Suggestion chips stay available; clicking one adds it immediately. Suggestions come from resume target role, resume skills, and popular related titles.
- Support a dynamic array (not a single title field). The count badge = selected titles + other active filter groups. A duplicate title is not added twice - it is ignored or shown as already selected.

---

## Step 5 - Location filter with autocomplete

- **Input**: placeholder "Enter country or city"; typing shows a suggestion dropdown (Tampa, FL (US); Tempe, AZ (US); Temple, TX (US); Tema (Ghana); Tempelhof (Germany)...). Best/most-exact match first.
- **Selected chip**: rounded chip (for example Tampa, FL (US)) with a remove X. Removing enables Apply and updates the count.
- **Remote relationship**: if work model is Remote only + a location is selected, decide whether to show remote jobs in that region or jobs tagged to that city. If Remote and on-site, include both local on-site and eligible remote jobs. Keep the backend rule consistent.

---

## Step 6 - Date posted and Work model filters

Radio groups - only one option per group.

- **Date posted**: Past 24hrs, Past 3 days, Past week, Past month.
- **Work model**: Remote and on-site, Remote only, On-site only.
- Selecting an option replaces the previous one in that group; any change enables Apply.
- **Defaults**: likely Remote and on-site + Past month. If a default is shown as a chip on the page, reflect it consistently in the active-count logic.

---

## Step 7 - Apply filters + "Save new filters?" confirmation

- **Apply logic**: disabled with no changes; turns blue and clickable when the filter state changes. Clicking validates, closes the modal (or opens the save confirmation), then reloads results.
- **Save new filters modal**: title "Save new filters?"; a chip preview of the new set (for example Senior Marketing Manager, Remote only, Tampa, FL (US), Past week); **Leave previous** (keeps prior filters) and **Apply new** (applies the new set); a close X.
- **Product decision**: only needed if filters are saved *preferences*. For temporary search filters, the confirmation may be skipped. (This repo treats filters as temporary and reuses this modal only as the unsaved-changes guard when closing while dirty.)

---

## Step 8 - Loading / re-matching state

After applying filters, show a loading state while the system rescans and recomputes scores.

- Keep the header and filter chips visible.
- Progress bar under the chip row.
- Grey skeleton cards in the list and grey skeleton content in the detail panel.
- Friendly copy that rotates: "Scanning the market for the right fit", "Pairing your resume with top openings".
- Do not show stale cards while new scores compute (unless using a clear optimistic pattern). The user should always feel the system is actively matching, not loading a generic list.

---

## Step 9 - Filtered results page

- **Chip row** updates: title chip (`+1` when multiple), Remote-only chip, location chip, and the date chip.
- **Result count** near the top of the results column, updated on every filter change (examples: 103, 14,176, 11, 116 jobs found).
- **Ranking/sort**: default is **Best match** = filter match + resume relevance + skill similarity + role seniority + recency. The top-ranked job is auto-selected unless the user picked another.
- **Detail sync**: selecting the first job shows it on the right; clicking another card updates the panel without a full reload.

---

## Step 10 - No matching jobs (empty state)

- Center illustration/visual.
- Message: "We did not find jobs matching your resume. Add recent achievements or expand your location to discover more roles."
- Keep the active filter chips visible so the cause is clear.
- Actions: Edit filters; Expand/remove location; Improve resume / Add recent achievements. Optional: suggest broader searches (Remote and on-site, Past month).
- The empty state should guide, not feel like failure.

---

## Step 11 - Changing the date filter back

- Reopening Edit filters pre-fills the current filters.
- Changing one option (for example Past week -> Past month) enables Apply; applying reloads results and updates the chip row.
- Selected titles, location, and work model are preserved - only the changed filter updates (unless the user resets).

---

## Step 12 - Reset filters flow

- **Purpose**: quickly remove strict criteria, recover from a no-results state, return to broad resume-based jobs.
- **Options**: (A) full clear of all filters, or (B) product default.
- **Recommended**: product default (not full clear) - remove the location chip if it is not part of the default, return work model to Remote and on-site, return date to Past month, and keep the primary resume role as the default title.

---

## Step 13 - Save, Not interested, Apply now, Saved jobs

Handled independently from filters.

- **Save**: adds to Saved jobs; changes the icon/button state; persists across filter changes.
- **Not interested / X**: hides the job from the current list; it should not reappear on the same filtered refresh; persist so the engine learns.
- **Apply now**: primary detail CTA; can open the external URL, an internal flow, or a modal; track click analytics. (This repo routes it through the Apply Now [gateway](README.md).)
- **Tailor resume to this job**: high-value CTA in the match card; opens the tailoring flow, passing job ID, description, score, and missing-keyword info.

---

## Step 14 - Backend and matching engine

**Data inputs**
- Resume: target job title, skills, work history, education, location, seniority, keywords, achievements.
- Job: title, company, location, work model, salary, seniority, date posted, description, requirements, skills, apply URL.
- User prefs: saved jobs, hidden/not-interested jobs, selected filters, saved filter preference (if any).

**Match score**
- Numeric percentage 0-100.
- Signals: title similarity, skill overlap, experience level, seniority fit, industry relevance, location/work-model fit, keyword coverage.
- Short per-job explanation of the strengths and the main gap.

**Suggested API shape**
| Endpoint / function | Purpose | Notes |
|---|---|---|
| `parse_resume(resume_id)` | Extract role, skills, experience, keywords | Run after upload/creation |
| `get_recommended_jobs(resume_id, filters)` | Ranked jobs with scores | Main page + filter reload |
| `get_job_detail(job_id, resume_id)` | Full detail + match explanation | On card select |
| `save_job(user_id, job_id)` | Save to Saved jobs | Persist across filters |
| `hide_job(user_id, job_id)` | Mark Not interested | Exclude from recs |
| `apply_filters(user_id, filters)` | Apply/save filter state | May trigger save confirmation |
| `tailor_resume(resume_id, job_id)` | Start tailoring flow | Pass JD + missing keywords |

**Filter schema**
```
filters = {
  job_titles: ['Senior Marketing Manager', 'Marketing Manager'],
  location: { city: 'Tampa', region: 'FL', country: 'US' },
  date_posted: 'past_week',
  work_model: 'remote_only',
  sort: 'best_match'
}
```

---

## Step 15 - QA states and test cases

- **Main page states**: default loaded, card selected, detail scroll, best-match sort, saved, not-interested hidden.
- **Edit filters states**: one title, title suggestions open, 2+ title chips, location autocomplete open, location chip selected, Past week, Past month, Remote only, Remote and on-site, Apply disabled, Apply active.
- **Apply/results states**: save confirmation, loading skeleton + progress bar, filtered results with updated count, no-jobs empty state, reset state, broad results after reset.
- **Test cases**: add 2nd title -> `+1` chip on page; type + select Tampa; switch to Remote only -> results update; switch to Past week -> results update; strict filters -> empty state; reset -> count broadens; save a job, change filters -> still in Saved jobs; mark Not interested -> removed from results.

---

## Step 16 - Short version

Build a Recommended Jobs feature connected to the user's resume. After a resume is
uploaded or created, scan the job database and show jobs ranked by Best match. Each
card shows title, company, location, salary (if available), date posted, work model,
and a resume match percentage with a label. Selecting a job opens a right-side detail
panel with metadata, Apply now, Save, Not interested, a match explanation card, and a
Tailor-resume CTA. Add an Edit filters modal for Job titles (multi-chip + suggestions,
`+1`/`+2` on the page), Location (autocomplete + chips), Date posted (24hrs / 3 days /
week / month), and Work model (Remote and on-site / Remote only / On-site only). Apply
is disabled until changed, then reloads with a loading skeleton and progress text; show
a Save-new-filters confirmation if the set is saved. Update the chip row, count, list,
detail, and scores after applying. Show a friendly empty state if nothing matches. Add
Reset filters to return to broad defaults. Save and Not interested persist independently.

---

## Implementation map (this repo)

| Brief area | Steps | Code |
|---|---|---|
| Page shell + tabs + heading/role switcher | 1, 9 | `src/app/jobs/page.tsx`, `src/components/jobs/job-search.tsx` |
| Job card (badge, save, not-interested, selected) | 1, 3, 13 | `src/components/jobs/job-card.tsx` |
| Job detail panel + Apply now -> gateway | 1, 13 | `src/components/jobs/job-detail.tsx` |
| Filter chip row (`+1` collapse) | 1, 4, 9 | `src/components/jobs/filter-chips.tsx` |
| Edit filters modal (chips, autocomplete, radios, count, Reset, Apply, Save-new confirm) | 2-7, 11-12 | `src/components/jobs/edit-filters-modal.tsx` |
| Loading / re-matching | 8 | `src/components/jobs/jobs-loading.tsx` |
| Empty state | 10 | `job-search.tsx` (RecommendedView) |
| Not-interested reasons | 13 | `src/components/jobs/not-interested-menu.tsx` |
| Saved jobs tab + undo | 13 | `job-search.tsx` (SavedView), `src/components/jobs/saved-empty-state.tsx` |
| Filters + saved/dismissed state (localStorage, DB-ready) | 13, 14 | `src/lib/store/jobs-store.ts`, `src/lib/store/jobs-sync.ts` |
| Types, generator, ranking, date/work helpers | 14 | `src/lib/jobs/job-search.ts` |
| Jobs API (Adzuna -> Remotive -> generated) with filter params | 14 | `src/app/api/jobs/route.ts` |
| Match score + explanation | 5, 14 | `src/lib/jobs/scoreboard.ts` (see [match-scoreboard.md](match-scoreboard.md)) |

Phase-by-phase build notes live in `docs/jobs/` (`phase-1-filters.md` ...
`phase-7-qa.md`).
