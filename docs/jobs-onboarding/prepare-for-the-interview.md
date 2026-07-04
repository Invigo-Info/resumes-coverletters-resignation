# Prepare for the interview

The third Apply-now improvement path. Uses the selected job context + the
candidate's resume/profile to generate a practical, job-specific interview-prep
sheet the user can read, extend, download (print to PDF), or take into the interview.

## Flow (Steps 1-16)

1. **Apply now entry** - store job id, title, company, source/apply URL, description, logo, salary, location, seniority, work model, match score before leaving Jobs. Session tied to user + job (unique job id, not title text).
2. **Application-strengthening choice page** - shared gateway. "Prepare for the interview" card, subtext "Go in confident". Continue without improvements opens the source URL.
3. **Create interview-prep session** - reuse the existing job + candidate context; never ask the user to paste the job description again.
4. **Interview type selection** - four paths:
   - **Screening call** - "Basics and expectations" (recruiter / first call).
   - **Meeting with a manager** - "Your background and skills".
   - **Technical** - "Problem-solving and hard skills".
   - **Other** - expands inline with a textarea ("Describe the format here..."); Continue disabled until filled; stored as `interview_type_detail`.
5. **Screening call path** - company card + "Get to know the company" + "Take a closer look at the role" + "Questions to think through before you go" (tell me about yourself, recent role, salary expectations, availability, interest) with short conversational framing + "You get to ask questions too". Reference the posted salary range if present but don't push a single number.
6. **Meeting-with-a-manager path** - focus on experience, leadership, impact, role fit. Pull the strongest resume accomplishments (numbers, team size, revenue/lead growth, CAC, conversion) into answer prompts; coach connecting examples to the job description.
7. **Technical path** - hard-skill proof: process, tools, measurement, troubleshooting, tradeoffs, frameworks, results. For non-engineering roles, "technical" = practical domain skill (for marketing: CRM, reporting, automation, A/B testing, analytics, ROI). Answers grounded in the profile; no invented projects/metrics.
8. **Other / custom path** - user text is the primary lens; still include job + company context. Compensation example -> salary expectations, justification, competing offers, current comp, flexibility, start date, benefits, negotiation. Panel/presentation/take-home/culture/portfolio -> format-specific guidance.
9. **Generated page structure (common)** - top nav with **Interview prep** active; small job-context line; heading "Everything you need to ace your interview"; company card (logo, links, description, founded, HQ, employees when available); "Get to know the company"; "Take a closer look at the role" (title, salary/location, key skills); "What they value in people"; "Worth mentioning in your answers"; "Questions to think through before you go"; "You get to ask questions too"; "Take this page with you" (download); final Apply + "See more roles like this".
10. **Company/role data quality** - never invent company facts (founded, HQ, employees, clients, acquisitions, revenue). If unverifiable, use "Research this before the call" / "Ask about this in the interview". Skills from the job description + resume, not the company name. Missing logo -> placeholder; missing links -> hide the chip; missing salary -> no salary advice unless Other requests comp prep.
11. **Questions to think through + Get more questions** - each card: question headline, 2-3 coaching lines, optional sample-answer block (only with enough profile data), colour-coded background. "Get more questions" appends (never replaces), shows "Coming up with more..." while loading, no duplicates, stays aligned to type + job.
12. **Candidate questions** - "You get to ask questions too": 3-5 questions to ask the interviewer, varied by type (recruiter: process/timeline; manager: expectations/success measures; technical: tools/workflows/standards); phrased naturally.
13. **Download / printable sheet** - "Take this page with you" card + top-nav Download. Opens the browser print dialog -> Save as PDF; print CSS hides decorative CTAs; keep the session after print/save/cancel; friendly error if print is blocked.
14. **Final CTAs** - **Apply** (opens the stored apply/source URL; disabled with a safe message if missing; an expired external job is an external state) + **See more roles like this** (returns to Jobs, filtered around the same role/location/profile; keeps the prep session).
15. **Header + nav state** - after generation the product is in the Interview prep module (nav highlighted); job context stays above the heading; Download visible when ready; Download/Apply don't restart generation.
16. **User flow summary** - select job -> Apply now -> gateway -> Prepare for the interview -> choose type (Other needs details) -> generated prep page -> Get more questions -> Download -> Apply / See more roles.

## Interview type matrix
| Type | Input | Generated focus | User need |
|------|-------|-----------------|-----------|
| Screening call | click | expectations, intro, availability, salary, recruiter framing | ready for the first call |
| Manager | click | leadership, background, fit, impact, collaboration | why their experience fits |
| Technical | click | hard-skill proof, process, tools, examples | specific skill answers |
| Other | textarea + Continue | custom from user text | non-preset formats |

## Edge cases
Missing/partial job description -> lighter prep from title/company/location/salary/resume; no invented duties. Missing company facts -> hide or "unknown"; use research prompts. Generation failure -> friendly retry, back to type selection, keep job context. Missing apply URL -> disable Apply. Print failure -> "Try again"; cancel keeps the page. Prep sessions tied to job/session ids (a user can prep many jobs/types).

## Core principle
Job-specific, not a generic interview article. Every section answers: **what should
this user say for this job?** Answer examples use only resume/profile data.
