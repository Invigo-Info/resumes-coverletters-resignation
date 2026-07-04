# Phase 5 - Saved jobs

The Saved jobs tab: heading, count, empty state, the save toast, an undo stack
for removals, and saved-state synchronization across every view.

## Data - `src/lib/store/jobs-store.ts`

```ts
interface PendingRemoval { jobId: string; job: JobPosting; removedAt: number; }
```

State + actions:
- `saved: Record<jobId, JobPosting>` - full snapshots keyed by job id (survives role switches / regeneration).
- `toggleSave(job)` - save / un-save from Recommended (calls `pushSavedJob` / `deleteSavedJob`).
- `removeSaved(id)` - Saved-tab removal: moves the job out of `saved` into `pendingRemovals` (undoable).
- `restoreSaved(id)` - Undo: moves it back into `saved`.
- `expirePending(id)` - finalizes a removal after its undo window.
- `pendingRemovals` is transient (excluded from persistence via `partialize`), so a reload starts with a clean list.

## Functionality - `src/components/jobs/job-search.tsx` (`SavedView`) + `saved-empty-state.tsx`

### Tab + count + sort
- Second tab "Saved jobs" (with a count pill). Heading "Your saved jobs".
- Count: `"{n} job/jobs"` (singular/plural), reflecting active saved jobs only.
- Best-match sort: saved jobs are ordered by `matchScore` (highest first).

### Empty state - `src/components/jobs/saved-empty-state.tsx`
Shown when there are no active saved jobs AND no pending undo cards: an inline SVG
binoculars scene (built from plain shapes, no emoji / no external asset) + "Nothing
saved yet. Save interesting jobs to return to them later." No count / sort / detail
in the fully-empty state.

### Save toast
Saving from Recommended fires a sonner toast `"Job saved"` with a **"View saved jobs"**
action that switches to the Saved tab. (Toaster is mounted in `layout.tsx`.)

### Undo stack
- Removing a saved job (clicking `Saved` in the Saved tab) drops the count immediately and inserts a grey undo card: `"[title], [company] is removed from your bookmarks."` + **Undo**.
- Multiple removals stack multiple cards; each `Undo` restores that exact job to the sorted list.
- Cards expire ~6s after removal (scheduled from `removedAt`); once active saved jobs and pending cards both reach zero, the view transitions to the clean empty state.

### Synchronization
Saved state is keyed by job id, so `Save / Saved` reflects the same state on the
Recommended card, the Recommended detail panel, and the Saved tab. Un-saving anywhere
flips it back to `Save` everywhere.

## Files
- `src/lib/store/jobs-store.ts` (saved / undo actions)
- `src/components/jobs/saved-empty-state.tsx` (new)
- `src/components/jobs/job-search.tsx` (`SavedView`, toast, undo timers)
- `src/components/jobs/job-card.tsx` / `job-detail.tsx` (Save button state)
