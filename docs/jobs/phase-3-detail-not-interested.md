# Phase 3 - Detail panel and Not-interested flow

The right-side job detail panel (metadata + actions + description) and the
Not-interested reason menu that hides a job from recommendations.

## Data

### Not-interested reasons - `src/components/jobs/not-interested-menu.tsx`
`NOT_INTERESTED_REASONS`:
1. I'm not interested in this company
2. I'm not interested in this job
3. The requirements don't match my skillset
4. It's irrelevant to my search
5. The salary is too low
6. Location doesn't match my needs
7. I already applied
8. None of the above

### Dismissal persistence - `src/lib/store/jobs-store.ts`
`dismiss(id, reason)` adds the id to `dismissed[]` and records `dismissedReasons[id] = reason`. Both persist to localStorage, so a dismissed job stays hidden across reloads and refetches. `clearDismissed()` restores everything.

## Functionality

### Detail panel - `src/components/jobs/job-detail.tsx`
- Header: company (with logo initial) + job title.
- Metadata row: posted date, location, work model, seniority, and salary (salary only shown when disclosed).
- Actions: **Apply now** (an external `<a>` to `applyUrl` opening in a new tab when present, else a button), **Save / Saved** toggle, and **Not interested** (button variant of the reason menu, Recommended tab only).
- Body (scrolls inside the panel, `max-h-[62vh]`): the match Scoreboard (Phase 4) then the **Job description** - the live description text when present, otherwise the generated summary + Responsibilities + Qualifications.

### Not-interested menu - `src/components/jobs/not-interested-menu.tsx`
- Two variants: an icon-only `X` (on job cards) and a full labelled button (in the detail panel).
- Picking a reason calls `onDismiss(reason)` -> `dismiss(id, reason)`; the job leaves the recommended list immediately and the selection advances to the next job.
- The trigger is wrapped so its click does not also select the card.

## Files
- `src/components/jobs/job-detail.tsx` (new)
- `src/components/jobs/not-interested-menu.tsx` (new)
- `src/components/jobs/job-card.tsx` (uses the icon-variant menu)
