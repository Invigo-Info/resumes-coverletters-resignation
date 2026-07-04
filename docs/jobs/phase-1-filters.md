# Phase 1 - Filters foundation

Filter model, the Edit-filters modal, the on-page chip row, the jobs store
(filters + undo + dismissed reasons), the save-sync stub, and the API filter
params.

## Data

### Filter types - `src/lib/jobs/job-search.ts`

```ts
type DatePosted = "24h" | "3d" | "week" | "month";
type WorkModelFilter = "remote_and_onsite" | "remote_only" | "onsite_only";

interface JobFilters {
  jobTitles: string[];   // one or more target titles (OR-matched)
  location: string;      // free text; "" = anywhere
  datePosted: DatePosted;
  workModel: WorkModelFilter;
  sort: "best_match";
}
```

Helpers:
- `defaultFilters(role)` - product default: `[role]`, no location, `month`, `remote_and_onsite`, `best_match`.
- `DATE_POSTED_LABEL`, `WORK_MODEL_LABEL` - value -> human label maps.
- `DATE_POSTED_DAYS` - value -> day count (`24h`=1, `3d`=3, `week`=7, `month`=30).
- `activeFilterCount(filters)` - number of "active" groups (each title + a set location + non-default date + non-default work model). Drives the count badge.
- `relatedTitles(role)` - up to 6 related job-title suggestions for the modal.
- `postedWithinDays(job, maxDays)` - date-filter predicate; uses `postedAt` (live) or parses `postedLabel` (generated).

### JobPosting additions

`seniority?: string` and `postedAt?: number` (epoch ms) were added so postings can be date-filtered and labelled by level.

### Store - `src/lib/store/jobs-store.ts` (persisted, localStorage `resume-co:jobs`)

New state + actions:
- `filters: JobFilters`, `setFilters(filters)`, `resetFilters(role)`
- `dismissed: string[]`, `dismissedReasons: Record<jobId, reason>`
- `pendingRemovals: PendingRemoval[]` (transient; NOT persisted via `partialize`)
- `removeSaved(id)`, `restoreSaved(id)`, `expirePending(id)` (see Phase 5)

### Sync stub - `src/lib/store/jobs-sync.ts`

`pushSavedJob(job)` / `deleteSavedJob(id)` - no-ops today; the single place to wire a `/api/jobs/saved` backend later (mirrors `documents-sync.ts`).

### API filter params - `src/app/api/jobs/route.ts`

`GET /api/jobs` now accepts: `role`, `titles` (comma list -> Adzuna `what_or`), `where`, `skills`, `date` (-> `max_days_old`), `work`, `sort`. Returns `{ jobs, count, source }`.

## Functionality

### Edit-filters modal - `src/components/jobs/edit-filters-modal.tsx`
- Holds a local `draft` seeded from the applied filters each time it opens.
- Header: title + black circular active-count badge + close X.
- Job titles: removable chips; an input adds a custom title on Enter; suggestion chips add related titles on click; duplicates ignored.
- Location: `AutocompleteInput` (`aiKind="location"`) sets a single location chip.
- Date posted / Work model: radio groups (one selection each).
- `Reset filters` restores `defaultFilters(role)`; `Apply filters` is disabled until `draft` differs from applied, then commits via `onApply` and refetches.

### Filter chip row - `src/components/jobs/filter-chips.tsx`
- Reflects applied filters: Edit filters + first job title (with `+N` when more) + work model + location + date. Any chip opens the modal.

### Wiring
- On first load the orchestrator seeds `resetFilters(role)` when `jobTitles` is empty.
- Changing filters updates the store; the fetch effect re-runs (keyed on role + serialized filters). Work-model and date are also applied client-side so the generated fallback stays consistent.

## Files
- `src/lib/jobs/job-search.ts` (extended)
- `src/lib/store/jobs-store.ts` (extended)
- `src/lib/store/jobs-sync.ts` (new)
- `src/app/api/jobs/route.ts` (extended)
- `src/components/jobs/edit-filters-modal.tsx` (new)
- `src/components/jobs/filter-chips.tsx` (new)
