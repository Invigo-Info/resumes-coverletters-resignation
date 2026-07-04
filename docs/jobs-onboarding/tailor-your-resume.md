# Tailor your resume

Job-specific resume tailoring launched from Apply now. Analyzes the selected job
against the resume, extracts keywords, lets the user guide the AI, generates
section-by-section suggestions, updates the resume preview live, raises the match
score, and gates download/share behind subscription rules.

## Flow (Steps 1-12)

1. **Entry from Apply now** - capture the full job context + `resume_id` + `baseline_match_score`; create a `TailoringSession` before any AI runs so progress survives reloads/payment/sharing. Same flow opens from "Tailor resume to this job".
2. **Application improvement gateway** - the shared "Let's make your application stronger" screen (see README).
3. **AI analysis loading sequence** - rotating messages: "Analyzing job description", "Checking how your resume lines up", "Extracting keywords", "Optimizing for hiring systems", "Polishing your summary". Constant subtext: "Every suggestion is based on your experience - just better framing." Centered illustration, white background. Failure -> friendly retry ("Retry analysis" / "Continue without tailoring").
4. **Keyword selection + AI guidance** - heading "Choose keywords to highlight"; extracted keywords render as blue-bordered chips (important ones pre-selected; selected shows a check). Optional "Add your note" -> "Note to AI" textarea (placeholder "Focus on my sales experience..."). Continue starts generation. `POST /api/tailoring/session/{id}/keywords { selected_keyword_ids, user_note }`.
5. **Tailoring editor layout** - looks like the resume builder with a **Tailoring** tab active. Left = suggestion panel ("Your resume tailored to [Job] at [Company]", score ring, accordion of suggestions with +N% badges, sticky footer Back / Apply all / Download). Right = live resume preview (keeps template + design; multi-page nav). The left panel never overwrites the resume without an explicit Apply/Add/Apply-all.
6. **Section-by-section suggestions** - individual cards, not a full rewrite. Each card: section title, score-impact badge, guidance ("ATS ranks resumes with matching titles higher"), before value, editable suggested value, Skip, Apply/Add, applied (green check). Covers Job title, Professional summary, and per-entry Work experience ("Work experience: [Role] - [Company]").
7. **Skills suggestion** - special: appends missing keywords rather than rewriting. Guidance box, collapsible "Before skills", editable green-bordered "Skills to add", **Add** (not Apply). Duplicate prevention: normalize case/spacing; treat "SEO" ~ "Search Engine Optimization" as related; match the template's list style (commas vs bullets).
8. **Score ring, Apply, Skip, Apply all** - numeric score in ring; yellow/orange low, green high; animates up on Apply; never exceeds session `max_score`. Apply updates the preview + adds the delta + autosaves. Skip dismisses (no change; optional undo). Apply all applies every non-skipped suggestion, marks all complete, confetti on completion.
9. **Download + subscription gate + upsell** - free users hitting Download (or premium limits) see the subscription page (7-day trial, $1.95, benefits, Trustpilot). After paying, return to the SAME session with applied suggestions + score + design intact.
10. **Final tailored resume + Design tab + download** - all cards green, final score in ring, confetti, CTA becomes **Download resume**. Switching to Design (template/font/spacing/columns/color) preserves tailored content; design changes don't affect the score.
11. **Share resume** - "Share your resume" modal: copy-link + Twitter/Facebook/LinkedIn popups + subscribe-to-customize. Public link = clean read-only resume page with Resume.co branding + "Build my resume" CTA (optional token/password params).
12. **Progress recovery** - autosave sessions; on return offer "Save your progress" -> Continue (reopen last session) / Close (dismiss, keep saved). "Start from scratch" and "Upload your resume" remain as new-entry paths.

## Data models
- `TailoringSession` - id, user_id, resume_id, job_id, status, baseline_score, current_score, final_score, selected_keywords, user_note, timestamps.
- `TailoringKeyword` - id, session_id, label, source, selected, confidence, category.
- `TailoringSuggestion` - id, session_id, section, target_resume_field, score_delta, before_text, suggested_text, status, rationale.
- `TailoredResumeVersion` - id, session_id, resume_id, version_number, content_json, design_json, score, is_final.
- `ResumeShareLink` - id, resume_version_id, public_token, password_token, expires_at, is_custom_slug, click_count.

## API endpoints
```
POST /api/tailoring/sessions                         create from job_id + resume_id
GET  /api/tailoring/sessions/{id}/analysis-status    loading step + progress + failure
GET  /api/tailoring/sessions/{id}/keywords           extracted chips
POST /api/tailoring/sessions/{id}/keywords           save selected keywords + note
GET  /api/tailoring/sessions/{id}/suggestions        section-by-section suggestions
POST /api/tailoring/suggestions/{id}/apply           apply one -> updated preview + score
POST /api/tailoring/suggestions/{id}/skip            mark skipped
POST /api/tailoring/sessions/{id}/apply-all          apply remaining eligible
POST /api/tailoring/sessions/{id}/finalize           create final version
POST /api/resumes/{version_id}/download              generate file (subscription-gated)
POST /api/resumes/{version_id}/share-link            create/return public link
```

## AI safety rules
Only inputs: job description, selected keywords, optional note, existing resume.
Never invent employers, titles, certifications, tools, metrics, years, education,
or responsibilities. Reframe existing experience only; keep it ATS-friendly and in
the user's voice; preserve template/section order unless changed in Design; if a
requirement is missing, suggest highlighting adjacent experience but never claim it.

## Scoring weights (tunable)
Title 5-10 · Summary 10-20 · Skills/keywords 20-30 · Work experience 25-35 ·
Industry/seniority 10-15 · ATS formatting 5-10. User-facing rule stays constant:
each suggestion shows a score delta; applying increases the score toward the max.

## Frontend states
Gateway · loading sequence · keyword chips (selected/unselected/hover/focus/disabled) ·
note collapsed/expanded · editor default · suggestion expanded/collapsed/applied/skipped ·
apply-all + completed · final success (confetti) · subscription gate · share modal ·
public share page · error/retry.
