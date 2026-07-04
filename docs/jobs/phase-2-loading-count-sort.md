# Phase 2 - Loading, count, and sort

The re-matching loading state, the dynamic result count, and the Best-match sort
control.

## Data

### Loading copy + progress keyframe
- `LOADING_COPY` in `src/components/jobs/jobs-loading.tsx`:
  `"Scanning the market for the right fit"` and `"Pairing your resume with top openings…"` (rotates every ~1.6s).
- `@keyframes jobs-progress` in `src/app/globals.css` drives the indeterminate progress bar (a blue fill sliding across a grey track).

### Count source
- `liveCount` (component state) holds the total from `/api/jobs` (`count`).
- Fallback `jobCountFor(role)` in `job-search.ts` supplies a stable large number when the generated fallback is used.
- Displayed count = `liveCount ?? jobCountFor(role)`.

## Functionality

### Loading / re-matching state - `src/components/jobs/jobs-loading.tsx`
Shown while fetching with nothing to display yet (`jobsLoading && liveJobs === null`), after applying filters or switching role. Keeps the page header + chip row visible (rendered by the parent) and shows:
- a thin progress bar under the chip row,
- rotating reassurance copy,
- grey skeleton job cards (left) and a skeleton detail panel (right).

### Result count
- Rendered in the count row: `"{count} jobs found"` when the list is non-empty, `"No matching jobs"` when empty. Updates on every filter/role change because it is recomputed from the fetch response.

### Best-match sort
- A `Best match` pill is shown next to the count. Results arrive already ranked by match score: live postings are sorted by `matchScore` server-side (`sortByScore`), generated postings are ordered by the deterministic generator, and saved jobs are sorted by score in the Saved tab. `sort` is carried in `JobFilters` (`best_match`) for the API and future sort options.

## Files
- `src/components/jobs/jobs-loading.tsx` (new)
- `src/app/globals.css` (progress keyframe)
- `src/components/jobs/job-search.tsx` (count + sort wiring)
