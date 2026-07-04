# Write a cover letter

Launched from Apply now. Generates a job-specific cover letter from the selected
job context + candidate details, then opens it in the existing cover-letter
builder to edit, design, and download.

## Journey
1. **Job listing** - user clicks Apply now; job context is kept.
2. **Decision page** - shared gateway "Let's make your application stronger"; "Write a cover letter" subtext "AI will guide you step by step".
3. **Write a cover letter** - starts the guided flow using the selected job as context.
4. **Continue without improvements** - routes directly to the source job URL (expired source shows its own message).

The letter is NOT generic: it inherits job title, company, location, source URL, and
job description, then combines them with resume/profile candidate data.

## Guided stepper (Add details -> Personalize -> Download)
Top-right stepper shows the three stages; a bottom progress bar with +percentage
nudges ("Share your educational background +14%", "Tell us about your relevant past
job +9%", "Provide your contact information +19%") encourages completing inputs.

### Step 1 - Add details: "Review your details below"
Prefilled from the resume/profile; each row has a pencil that opens an isolated edit
flow (Save changes returns and updates the row; Back keeps saved changes).
- **Education** - level (College graduate+, High school, Student, Prefer not to mention), school (free text + suggested chips), field of study (free text + suggestions).
- **Recent job** - job title + company (company optional).
- **Experience** - years selector (~1..10+).
- **Skills** - pick top 3 professional skills (chips from resume + job, e.g. SEM, ROI Optimization, Growth Marketing, Data Analytics, SEO, Paid Advertising...).
- **Strengths** - pick 3 strengths (Leadership, Strategic Planning, Analytical Thinking, Collaboration, Communication, Problem Solving...); these shape tone.
- **Personal details** - first/last name, email, phone, address (populate header/signature).

### Step 2 - Personalize (generation)
Centered loading with optimistic copy ("Building bridges to your future job",
"Unleashing your professional potential", "Designing your path to success"). Job
title + company stay attached; the letter uses job description + selected skills +
strengths + education + recent job + experience + personal details. Never lose
progress if slow.

### Step 3 - Download (in the cover-letter builder)
Opens the existing builder: **Write** tab (company name, hiring-manager name, rich-text
body) with a live preview + "Saved" indicator; **Design** tab (templates, fonts,
spacing, columns, colors); **Download** button (subscription-gated). Back/"Edit your
letter" returns without restarting.

## Data used
- **Job context** - title, company, location, source, salary (if any), description, extracted requirements.
- **Candidate context** - education, recent job, years, skills, strengths, name, email, phone, address, existing resume data.
- **AI instruction** - write a role-specific letter connecting candidate experience to employer requirements; prioritize the selected top skills/strengths rather than every keyword.
- **Output** - open in the existing cover-letter editor to edit/design/save/download.

## Download + subscription
Free users may hit the subscription screen before export (benefits: unlimited resume
downloads, AI-tailored resumes, custom AI cover letters, daily job matches). It must
not discard the generated letter/edits; after payment/authorization return to the same
state; exiting the paywall keeps the draft in the builder.

## UX rules / acceptance
- Apply now preserves job title + company across the whole flow.
- The decision page shows job context before the user chooses.
- The letter uses the selected job description (not generic).
- Each pencil opens only that row's edit flow; Save persists + returns; Back keeps saved data.
- Progress bar + nudges reflect real completeness, not decorative values.
- The letter opens in the builder with Write/Design/preview/Download.
- Download respects subscription while preserving the draft.
- Continue without improvements -> direct job URL (expired source allowed to show its own state).

## Reuse note
This is separate from the general Cover letters tab but **reuses the existing cover
letter builder** once the AI letter is generated. In this repo the Apply-now "Write a
cover letter" card routes into that existing builder (`/cover-letter/new`) carrying the
job context; the full Add-details/Personalize stepper is a follow-up.
