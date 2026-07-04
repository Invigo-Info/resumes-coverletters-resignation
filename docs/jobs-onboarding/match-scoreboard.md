# Detailed Match Scoreboard

Extracted from `jobs-oboarding/Resume_Relevant_Jobs_Feature_Brief_With_Scoreboard.docx`
(Steps 17-18). Steps 1-16 of that file are identical to
[recommended-jobs.md](recommended-jobs.md); this doc covers the added scoreboard.

The scoreboard turns a plain match percentage into an **explainable checklist**. It
lives inside the selected job's detail panel and helps the user see why the resume
matches, what is already covered, and which gaps to fix before applying.

---

## Step 17 - Designer / Programmer brief

### 1. Purpose
The scoreboard answers three questions:
- How strong is my resume match for this specific job?
- Which requirements, responsibilities, tools, and position signals are already covered?
- Which missing items should I fix by tailoring my resume?

It makes the recommendation feel intelligent and trustworthy - the user is not shown
only a number (94, 96), they can expand it and see the reasoning behind it.

### 2. Placement inside the job detail panel
- **Top**: company name, job title, date posted, location, work model, seniority, action buttons.
- **Middle**: match summary card with circular score and the Tailor-resume CTA.
- **Expanded**: detailed category cards (Position, Requirements, Responsibilities).
- **Lower**: the full Job Description text stays available below the match card.

### 3. Collapsed state
A compact match card only:
- Title, for example "Perfect match - tailor your resume to get noticed".
- A short, AI-generated explanation of match quality.
- A circular score badge on the right (for example 94 or 96).
- A small chevron button attached to the score.
- CTA: **Tailor resume to this job**.
- The Job Description begins immediately below.

The user grasps the score without reading the full breakdown; the page stays clean.

### 4. Expanded state
Clicking the chevron expands the card downward:
- The score ring stays visible at the top-right; the chevron flips.
- Category cards appear below the summary. Each has an icon, title, divider, and checklist rows.
- Each row = one job-fit signal + a right-aligned status icon: green check (covered) or X (missing/weak).
- Everything stays inside the same scrollable detail panel - no separate page or modal.

### 5. Score ring / percentage badge
- Large number 0-100 with a circular progress ring.
- Green for strong scores (90+).
- A chevron control near the ring signals it can expand.
- Keep the score visible while expanded.

**Suggested labels** (thresholds tunable by product):
- 90-100: Perfect match / Strong match.
- 75-89: Good match.
- 50-74: Partial match.
- Below 50: Low match / Needs tailoring.

### 6. Match explanation copy
A short paragraph beside the score summarizing the strengths and the main gap. Keep it
specific, not generic.
- AssetWatch example: "The resume is a strong match for a senior integrated campaign role because it shows B2B marketing, HubSpot, Salesforce, and pipeline-focused experience. The main gap is direct manufacturing SaaS exposure."
- Hospitality example: "The resume is a strong match because the title, seniority, hospitality-adjacent growth experience, and key qualifications are closely aligned."

### 7. Detailed categories
| Category | Purpose | Examples |
|---|---|---|
| **Position** | Role identity, seniority, industry context, core positioning | Title match; senior integrated campaign-manager level; B2B SaaS / demand-gen background; HubSpot execution; Salesforce alignment; manufacturing/industrial buyer experience |
| **Requirements** | Formal qualifications, years of experience, required skills, education, judgment | BA in Marketing/Sales/Business; 5+ years leadership; channel understanding; communication + creative thinking; budget-management/professional judgment |
| **Responsibilities** | Evidence of doing the main duties | Oversee campaigns; implement marketing/social strategy; represent marketing cross-functionally; update leadership; lead/train a team; analyze data to improve exposure |
| **Job Description** | Keeps the full original posting visible below the score | Company overview, duties, qualifications, pay, benefits, location |

### 8. Position category logic
Evaluates whether the profile fits the overall identity of the role - a resume can have
the right title yet miss the target industry, buyer type, seniority, or tool context.
AssetWatch example: senior integrated campaign level (matched), B2B SaaS / demand-gen
(matched), HubSpot execution (matched), Salesforce alignment (matched),
manufacturing/industrial buyer experience (missing).

### 9. Requirements category logic
Checks must-have qualifications from the posting; should feel like a qualification
checklist, more formal than Position. Example: BA (matched), 5+ years leadership
(matched), channel understanding (matched), communication/creative thinking (matched),
budget-management judgment (missing).

### 10. Responsibilities category logic
Checks evidence the candidate has performed the actual duties - moves beyond keywords.
Example: oversee campaigns, implement strategy, represent cross-functionally, update
leadership, lead/train a team, analyze data - all matched.

### 11. Checklist row design
- Left: requirement / match-signal text. Right: status icon.
- Matched = green check; missing = X.
- Generous row spacing; divider between the category header and the rows (not between every row).
- Optional: a row can expand or show a tooltip explaining what evidence was found or why it is missing.

### 12. Job Description relationship
The full Job Description stays below the scoreboard - the scoreboard is an extracted
interpretation, the description is the source. The panel scrolls; match categories are
generated from the same description text shown below.

### 13. Tailor Resume CTA behaviour
The conversion point from discovery into optimization. On click, pass: `resume_id`,
`job_id`, job title + company, full job description, match score, matched items, missing
items, main-gap summary, and the category breakdown. The tailor flow uses the missing
items to suggest edits, keyword additions, stronger bullets, or a rewritten summary.

---

## Step 18 - Data logic and API

### 1. Required inputs
- Parsed resume: titles, skills, tools, industries, years of experience, education, achievements, prior responsibilities.
- Job posting: title, company, location, work model, seniority, description, responsibilities, requirements, qualifications, tools, salary, benefits, metadata.
- User context: selected resume, filters, saved/rejected jobs, whether already tailored for this job.

### 2. Job description parsing
Parse the description into structured groups:
- **Position signals**: title, seniority, industry, company type, buyer type, core identity.
- **Requirements**: degree, years, required tools, certifications, mandatory skills, work authorization.
- **Responsibilities**: duties, leadership, reporting, execution, collaboration, analytics/strategy.
- **Nice-to-have**: preferred tools, industry exposure, domain experience, extra benefits.

Show only the most important **4-7 items per category** so the panel stays readable.

### 3. Resume evidence matching
For each extracted job signal, check the resume for: direct keyword match, semantic
match, experience match (a prior role/bullet proves the duty), seniority match,
industry/domain match, or missing/weak (no clear evidence).

### 4. Suggested scoring formula (weighted)
| Score area | Weight | Measures |
|---|---|---|
| Position fit | 30% | Title similarity, seniority, industry fit, role scope, business context |
| Requirements fit | 35% | Must-have qualifications, education, years, core tools, required skills |
| Responsibilities fit | 25% | Evidence of performing the posted duties |
| Preferred / bonus fit | 10% | Nice-to-have tools, industry exposure, extra keywords, domain knowledge |

Example: matching most Position/Requirements/Responsibilities but missing one
industry-specific gap can still score high, for example 94.

### 5. Category item object
```json
{
  "label": "Manufacturing/industrial buyer experience",
  "category": "Position",
  "matched": false,
  "importance": "medium",
  "resumeEvidence": null,
  "gapReason": "No clear manufacturing or industrial buyer exposure found in resume",
  "recommendation": "Add a bullet or summary phrase if the user has relevant manufacturing SaaS experience"
}
```

### 6. Full API response example
```json
{
  "jobId": "assetwatch-integrated-campaign-manager",
  "resumeId": "user-resume-123",
  "matchScore": 94,
  "matchLabel": "Perfect match",
  "summary": "You are a strong match for this senior integrated campaign role, with deep B2B marketing, HubSpot, Salesforce, and pipeline-focused experience. Your main gap is direct manufacturing SaaS exposure.",
  "categories": [
    {
      "name": "Position",
      "icon": "user",
      "items": [
        {"label": "Senior integrated marketing/campaign manager level", "matched": true},
        {"label": "B2B SaaS / demand generation background", "matched": true},
        {"label": "Hands-on HubSpot campaign execution", "matched": true},
        {"label": "Salesforce CRM and marketing-sales alignment", "matched": true},
        {"label": "Manufacturing/industrial buyer experience", "matched": false}
      ]
    }
  ],
  "mainGaps": ["Manufacturing/industrial buyer experience"],
  "tailorCtaEnabled": true
}
```

### 7. Frontend states
- **Collapsed**: summary, score ring, chevron, tailor CTA.
- **Expanded**: summary + detailed category cards.
- **Loading**: skeleton/spinner while analysis computes.
- **Error**: show the score if available, hide detailed rows if analysis failed.
- **No-data**: description too short -> "score unavailable" / limited explanation.
- **Persisted**: keep a job expanded while selected; collapse when another is selected.

### 8. Loading model
- Precomputed: score every job up front (fast panel, more backend cost).
- Lazy: compute the breakdown only on select/expand.
- **Hybrid (recommended)**: precompute score + summary for ranking, lazy-load the detailed category cards on expand.

### 9. Tailoring connection
The scoreboard powers the tailoring flow: matched items preserve what is strong, missing
items become the priority edits, the main gap becomes the first recommended improvement.
Clicking Tailor opens the editor with job-specific recommendations prepared; missing
terms become keyword suggestions, summary rewrites, or bullet prompts.

### 10. Figma states
A: collapsed with 94/96 ring. B: expanded showing Position. C: scrolled to Requirements.
D: scrolled to Responsibilities. E: mixed matched/missing (at least one X). F: all matched.
G: loading analysis. H: Tailor clicked -> tailoring flow opens.

### 11. Short version
Design the scoreboard as an expandable explanation card in the job detail panel.
Collapsed: match label, short AI explanation, circular score, chevron, Tailor CTA.
Expanded: checklist cards grouped by Position, Requirements, Responsibilities, each row a
job signal with a green check (covered) or X (missing). The Job Description stays below.
The backend parses the description, compares it to resume evidence, returns a 0-100 score
with matched and missing items, and passes missing gaps into the Tailor flow.

---

## Implementation map (this repo)

| Brief area | Step | Code |
|---|---|---|
| Types: `MatchScoreboard`, `ScoreCategory`, `ScoreItem` | 18.5, 18.6 | `src/lib/jobs/scoreboard.ts` |
| Weighted heuristic (Position 30 / Requirements 35 / Responsibilities 25 / bonus 10) | 18.2-18.4 | `buildHeuristicScoreboard` in `scoreboard.ts` |
| Hybrid AI-first, heuristic fallback, lazy per job | 18.8 | `getScoreboard` / `callScoreAi` in `scoreboard.ts` |
| AI task returning the scoreboard JSON | 18.6 | `/api/ai` `scoreJob` task in `src/app/api/ai/route.ts` |
| Labels from score (90+/75+/50+/<50) | 17.5 | `matchMeta` in `src/lib/jobs/job-search.ts` |
| Collapsed card: label, summary, ring, chevron, Tailor CTA | 17.3 | `src/components/jobs/match-scoreboard.tsx` |
| Expanded category checklists (check / X), ring stays visible | 17.4, 17.11 | `match-scoreboard.tsx` |
| Green ring (80+/#16A34A) vs amber (#D97706) | 17.5 | `ScoreRing` in `match-scoreboard.tsx` |
| Loading skeleton state | 18.7 | `match-scoreboard.tsx` (loading prop) |
| Tailor CTA passes JD + main gaps into the tailor flow | 17.13, 18.9 | `openTailor` in `job-search.tsx` -> `TailorDialog` |
| Job Description remains below, panel scrolls | 17.12 | `src/components/jobs/job-detail.tsx` |
