# Apply Now - application-strengthening flows

Three connected features that launch from the **Apply now** action on a job, all
sharing one entry gateway and the same job context. Source briefs live in
`resume-co/jobs-oboarding/*.docx`; this folder is the extracted, structured spec.

### Upstream: the `/jobs` page (where Apply Now starts)
| Feature | Doc | One-line |
|---------|-----|----------|
| Resume-based recommended jobs | [recommended-jobs.md](recommended-jobs.md) | The `/jobs` page: matching, filters, loading, empty, reset, save/dismiss (Steps 1-16) |
| Detailed match scoreboard | [match-scoreboard.md](match-scoreboard.md) | Explainable Position/Requirements/Responsibilities checklist + score ring (Steps 17-18) |

### The Apply Now flows (this folder)
| Feature | Doc | One-line |
|---------|-----|----------|
| Apply Now gateway (shared) | this file | The "Let's make your application stronger" decision screen |
| Tailor your resume | [tailor-your-resume.md](tailor-your-resume.md) | Analyze the job vs resume, section-by-section AI suggestions, score ring |
| Prepare for the interview | [prepare-for-the-interview.md](prepare-for-the-interview.md) | Interview-type selection + a generated, job-specific prep sheet |
| Write a cover letter | [write-a-cover-letter.md](write-a-cover-letter.md) | Guided add-details -> personalize -> download in the cover-letter builder |

## Shared: the Apply Now gateway

### Behaviour
- **Apply now** on a job detail (or **Tailor resume to this job** from the Scoreboard) does NOT immediately send the user to the employer. It first opens a full-page decision screen.
- Heading: **"Let's make your application stronger"** with a small job-context line above it (job title, company).
- Four options:
  1. **Tailor your resume** - primary card, sparkle icon, subtext "Boost your interview chances 3x". Starts the resume-tailoring flow.
  2. **Write a cover letter** - subtext "AI will guide you step by step". Starts the cover-letter flow with the same job.
  3. **Prepare for the interview** - subtext "Go in confident". Starts interview prep for the same job.
  4. **Continue without improvements** - neutral button; opens the original apply/source URL directly (external).
- The job context must be preserved regardless of which card is clicked.

### Job context object (passed into every flow)
```
job_id, job_title, company_name, company_logo, job_location, salary,
work_model, seniority, posted_date, match_score, job_description,
apply_url / source_url, resume_id, baseline_match_score
```

### Rules
- Use a unique `job_id` (similar jobs share titles) - do not key on title text.
- Create/resume a session before AI generation so payment detours, share popups, and reloads never lose progress.
- Cover letter and interview prep are separate modules but reuse the same job-context object.
- "Continue without improvements": if `apply_url` is missing, disable it with a safe message; an expired external job showing its own error page is an external state, not an internal failure.

## Implementation status (in this repo)
- Gateway route: `src/app/apply/page.tsx`; job context in `src/lib/store/apply-store.ts`.
- Interview prep: `src/app/interview-prep/*` + `src/components/interview-prep/*` + `/api/ai` `interviewPrep` task (new module).
- Write a cover letter: routes into the existing cover-letter builder (`/cover-letter/new`) with job context.
- Tailor your resume: opens the existing `TailorDialog` pre-filled with the job description (the full section-by-section tailoring editor from the brief is documented as a follow-up).
