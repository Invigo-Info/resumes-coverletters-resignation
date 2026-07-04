# Phase 6 - Two-resume role switcher and Tailor wiring

The "Top picks for [role]" dropdown that switches between the target roles of the
user's resumes, and the Tailor-resume dialog opened from the Scoreboard.

## Data - `src/components/jobs/job-search.tsx`

```ts
interface Profile extends ResumeProfile {   // role, skills, location
  resume: ScoreResume;                       // role, skills, summary, experience
}
```

`profiles` is built (memoized) from every saved resume in `useDocumentsStore`
plus the in-progress resume in `useResumeStore`, de-duplicated by role:
- `role` = `personal.jobTitle` or the first non-empty employment title.
- `skills` = the resume's skill names.
- `location` = `contact.location`.
- `resume.summary` = the professional summary as plain text (HTML stripped).
- `resume.experience` = every employment title + company + description concatenated as plain text (fed to the Scoreboard).

## Functionality

### Role switcher
- The heading renders a dropdown when more than one profile exists; each item is a resume's target role.
- `switchRole(i)` sets the active profile, replaces the job-title filter with that role (`setFilters({ ...filters, jobTitles: [role] })`), and clears the selection - which re-runs the fetch and re-matches jobs for that resume.
- With a single resume the role renders as plain highlighted text.

### Tailor-resume wiring
- The Scoreboard's **Tailor resume to this job** CTA calls `onTailor(job, scoreboard)`.
- `openTailor` seeds the dialog description from the job: the live `description`, or the summary + responsibilities + qualifications, plus each `mainGaps` item as a `Requirement:` line.
- `TailorDialog` (`src/components/dashboard/tailor-dialog.tsx`) was extended with an optional `initialJobDescription` prop: when opened from a job it pre-fills the description and auto-runs the AI tailoring (`/api/ai` `tailor`), returning an optimized summary + keywords.

## Files
- `src/components/jobs/job-search.tsx` (profiles, `switchRole`, `openTailor`)
- `src/components/dashboard/tailor-dialog.tsx` (pre-fill + auto-run)
