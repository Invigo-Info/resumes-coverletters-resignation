# AI Cover Letter Generator — Onboarding Plan (Phase-Wise)

Source of truth: `Cover_Letter/Cover-Letter-Flow-Architecture.docx`, `Cover_Letter/Cover-Letter-UX-Design-Spec.docx`, and the 30 step screenshots `Cover_Letter/step 1.png … step 30.png`. Nothing in those files is omitted — every screen, field, branch, CTA, progress message, and AI touch-point below is traced back to them.

This mirrors the existing **resume builder** (Next.js 16 + Tailwind v4 + Base UI + Zustand + Gemini via `/api/ai` + jsPDF/html2canvas-pro). We reuse those primitives wherever possible.

---

## 1. Product Overview

The Cover Letter generator is a **guided AI wizard** with **three entry flows** that all converge on a shared generation + edit + download experience.

| Entry flow | Effort | Path summary |
|---|---|---|
| **Use your resume** | Lowest (1‑click) | Select saved resume → parse → **Review** → job intent → generate |
| **Upload a resume** | Low | Upload file → parse → **Review** → job intent → generate |
| **Start from scratch** | Guided | Full step wizard (job intent → skills → experience → … → personal details) → generate |

All three converge at: **Job intent → (targeted or generic) → AI generation → Final preview (Design default) → Write/Design/Download.**

### Global UX systems (present on every wizard screen)
- **Top‑right step indicator:** `1 Add details → 2 Personalize → 3 Download` (current phase highlighted). *(screenshots 3–13, 18–27)*
- **Bottom progress bar** with an emoji + contextual "+X%" message + percent. Messages are screen‑specific (catalogued in §4).
- **Bottom nav:** `Back` (left) + primary CTA (right). CTA = **Next** in onboarding mode, **Save changes** in edit mode.
- **Minimal header:** logo left; step indicator right. No dashboard chrome inside the wizard.

---

## 2. Screen Inventory → Screenshot / Doc Map (nothing skipped)

| # | Screen | Screenshot | Flow(s) | CTA |
|---|--------|-----------|---------|-----|
| D | Cover Letters **Dashboard** | `step 1` | entry | Write one more / Create new |
| E | **"How will you make your cover letter?"** (3 options) | `Step 2`, `step 17` (upload expanded), `step 29` (use‑resume expanded) | entry | select method |
| 1 | **Job intent** — "Do you have a specific job in mind?" (Yes/No) | `step 25` | scratch + resume | Next |
| 2A | **Job details** (YES) — title, company, hiring mgr, description | `Step 3`, `step 26` | all | Next |
| 2B | **Desired job title** (NO) — input + role chips | `step 12`, `step 27` | all | Next |
| 3 | **Pick top 3 professional skills** (multi‑select chips, max 3) | `step 4`, `step 13` (selected state) | all | Next |
| 4 | **Experience level** — ~1…10+ + dynamic helper text | `Step 5` | scratch | Next |
| 5 | **Recent job** (experienced only) — job title, company | `step 6` | scratch | Next |
| 6 | **Education level** — 4 radio cards | `step 7`, `step 19` (selected) | scratch | Next |
| 7 | **Where did you earn your degree?** (graduate only) — input + uni chips | `Step 8` | scratch | Next |
| 8 | **Your field of study** (graduate only) — input + field chips | `Step 9` | scratch | Next |
| 9 | **Choose 3 strengths** (multi‑select chips, max 3) | `step 10` | all | Next |
| 10 | **Personal details** — first/last, email/phone, address | `Step 11` | scratch | Next → generate |
| R | **Review your details below** (6 editable rows) | `step 18` (upload), `step 30` (use‑resume) | upload + use‑resume | Next |
| R‑a | Edit **Education** | `step 19` | review | Save changes |
| R‑b | Edit **Recent job** | `step 20` | review | Save changes |
| R‑c | Edit **Experience** | `step 21` | review | Save changes |
| R‑d | Edit **Skills** | `step 22` | review | Save changes |
| R‑e | Edit **Strengths** | `step 23` | review | Save changes |
| R‑f | Edit **Personal details** | `step 24` | review | Save changes |
| G | **AI generation** (loading: "Analyzing…/Preparing your details…") | (transition) | all | — |
| P | **Final preview** (A4 doc, Design mode default) | `step 14` (targeted), `step 28` (generic) | all | Download |
| W1 | **Write → Personal details** (3‑panel + live preview) | `step 15` | all | Next |
| W2 | **Write → Letter content** (company/hiring mgr + rich editor) | `step 16` | all | Back/Next |
| Des | **Design mode** (templates carousel + Styles/Fonts/Colors) | `step 14`/`step 28` controls | all | Download |

---

## 3. Branching Logic (exact, from Flow Architecture)

```
Entry: "How will you make your cover letter?"
 ├─ Use your resume   → select saved resume → PARSE → Review → (job intent) → generate
 ├─ Upload a resume   → upload/import file → PARSE → Review → (job intent) → generate
 └─ Start from scratch→ Job intent (no Review)

Job intent: "Do you have a specific job in mind?"
 ├─ YES → Job details (title, company, hiring manager, job description)   ─┐
 └─ NO  → Desired job title (typed/chip)                                   ─┘→ MERGE 1 → Skills

[Start from scratch only, after Skills]
Experience level (~1 … 10+)
 ├─ ~1 / "Just starting out" → skip Recent job → Education
 └─ >1                       → Recent job → Education            → MERGE 2 → Education

Education level
 ├─ College graduate or higher → Degree (university) → Field of study → Strengths
 └─ High school / Student / Prefer not to mention → skip → Strengths   → MERGE 3 → Strengths

Strengths → Personal details → GENERATE → Final preview
```

**Key difference — resume/upload flows skip the manual middle** (skills/experience/education/strengths/personal are already captured on the **Review** screen). After Review → Next they only go through **Job intent → (Yes/No) → generate**. *(Flow Architecture §12, screenshots 25→26/27→28.)*

**YES vs NO downstream:** YES = company required, highly targeted output ("…position at Apple"). NO = no company, generic reusable output ("…Marketing Manager role"). *(UX spec NO‑vs‑YES table.)*

---

## 4. Progress + Step‑Indicator Spec (verbatim from screenshots)

Step indicator phase per screen: **Add details** = job intent/details, desired title, recent job, education, degree, field, personal details. **Personalize** = skills, experience, strengths. **Download** = final preview.

| Screen | Progress message | % (sample) |
|---|---|---|
| Job details / Desired job title | `Tell us about your desired job +14%` | 10–50% |
| Skills | `Tell us about your best skills +12%` | 24–36% |
| Experience | `Tell us about your relevant experience +17%` | 24% |
| Recent job | `Tell us about your relevant experience +17%` | 53% |
| Education / Degree / Field | `Share your educational background +14%` | 36–86% |
| Strengths | `Let us know what you're good at +14%` | 55% |
| Personal details | `Provide your contact information +19%` | 69% |
| Edit recent job (review) | `Tell us about your relevant past job +9%` | 86% |
| Edit experience (review) | `Tell us about your relevant experience +8%` | 86% |
| Final preview | progress bar = **100%** + happy emoji | 100% |

Emoji ramps with completion (🤔 → 🙂 → 😎 → 😍), matching the resume builder's `emojiFor()` pattern.

---

## 5. AI Integration Points (real Gemini via `/api/ai`)

Extend the existing server bridge `src/app/api/ai/route.ts` with cover‑letter tasks (key never leaves the server; falls back to canned content on error — same contract as the resume builder).

| Task | Input | Output | Used by |
|---|---|---|---|
| `coverLetter` | jobIntent, jobDetails (title/company/hiringMgr/description), skills[3], strengths[3], experience, recentJob, education{level,university,field}, personal | full letter body (greeting → intro → experience → skills+strengths → education → closing → signature) | Generation (G), regenerate |
| `clSkills` | desiredJobTitle / job description | suggested professional‑skill chips | Skills screen (chips can be AI‑ranked) |
| `clStrengths` | role + skills | suggested strength chips | Strengths screen |
| `clRoles` | partial text | desired‑job‑title chip suggestions | Desired job title (NO) |
| `parseResume` | uploaded file text / saved resume data | structured {education, recentJob, experience, skills[], strengths[] (inferred), personal} | Upload + Use‑resume parsing |
| `improveLetter` (enhancement) | selected text + intent ("more formal", "shorten", "impactful") | rewritten text | Write → Letter content assist |

**Generation prompt rules:** targeted vs generic decided by `jobIntent.hasSpecificJob`. Letter must weave in: recent role + years (experience), top‑3 skills, top‑3 strengths, degree/field, and (if YES) company + hiring manager greeting (`Dear <hiringManager>,` else `Dear Hiring Manager,`). Output plain paragraphs, no markdown — consistent with `step 14`/`step 28`.

**Loading state (G):** spinner + "Analyzing your resume…" (resume/upload) or "Preparing your details…" (scratch) before the preview, per Flow Architecture §3.

---

## 6. Data Model (Zustand `useCoverLetterStore`)

```ts
type Flow = "scratch" | "upload" | "use-resume";

interface CoverLetterState {
  flow: Flow;
  sourceResumeId?: string;          // use-resume
  uploadedFileName?: string;        // upload

  jobIntent: { hasSpecificJob: boolean | null };
  jobDetails: { desiredJobTitle: string; companyName?: string;
                hiringManagerName?: string; jobDescription?: string };

  skills: string[];                 // max 3
  experience: string;               // "~1" … "10+"
  recentJob: { jobTitle: string; company?: string };
  education: { level: "college"|"highschool"|"student"|"none";
               university?: string; field?: string };
  strengths: string[];              // max 3
  personal: { firstName; lastName; email; phone?; address? };

  letter: { companyName?: string; hiringManagerName?: string; body: string };
  design: { templateId; font; spacing; color };   // reuse resume DesignOptions

  // wizard control
  step: string;                     // current screen key
  mode: "onboarding" | "edit";      // edit ⇒ CTA "Save changes" + return to Review
  editReturnTo?: "review";
}
```

Persist to `localStorage` (reuse the resume store's hydrate pattern) so "Save your progress / Continue" works.

---

## 7. Routes (Next App Router)

| Route | Screen |
|---|---|
| `/cover-letters` | Dashboard (`step 1`) — also reachable via top‑nav "Cover Letters" tab |
| `/cover-letter/new` | "How will you make your cover letter?" (`Step 2`/`17`/`29`) |
| `/cover-letter/builder` | Wizard shell — renders the active step from store (job intent → … → personal) |
| `/cover-letter/review` | Review + edit screens (`step 18`/`30` + edits) |
| `/cover-letter/preview` | Final preview + Write/Design/Download (`step 14`/`28`/`15`/`16`) |

The builder/review/preview can also be one route driven by `store.step` (like the resume `EditorShell`) to keep transitions smooth. Final preview reuses the resume **EditorShell** layout (top bar, live preview, design panel, PDF download).

---

## 8. Component Reuse vs New

**Reuse (from resume builder):**
- `/api/ai` bridge + `callAi()` fallback contract → add CL tasks.
- `download-pdf.ts` (`[data-resume-preview]` → rename‑agnostic) for PDF export.
- `DesignPanel` (templates carousel, Styles/Fonts/Colors) for Design mode.
- `RichTextEditor` (Tiptap) for Letter content.
- `AutocompleteInput` (AI chips) for university/field/role suggestion inputs.
- Brand buttons, progress emoji helper, chip/card styling, Base UI Select.

**New components:**
- `StepShell` (minimal header + step indicator + bottom progress bar + Back/Next or Save‑changes footer).
- `ChipMultiSelect` (max‑N selection with 🔥 + blue checkmark selected state — `step 13`).
- `ExperiencePicker` (~1…10+ boxes + dynamic helper text).
- `OptionCardRadio` (education level cards with radio + selected blue border — `step 7`/`19`).
- `ReviewCard` (6 rows with Edit pencils — `step 18`/`30`).
- `CoverLetterPreview` (A4 doc: contact line → name → role subtitle → divider → recipient/greeting/body/signature).
- `UploadDropzone` (drag‑drop + Dropbox/Google Drive/LinkedIn import — `step 17`).
- `CoverLetterDashboard` + `CoverLetterCard` (Download/Edit/Copy/Delete) + stat cards (0/5, ~250, ~84).

---

## 9. Phase‑Wise Build Plan

### Phase 0 — Foundations
- `useCoverLetterStore` (data model §6) + localStorage hydrate.
- `StepShell` (header + step indicator + bottom progress bar + footer) with `mode` (onboarding/edit) driving CTA label.
- Progress message + percent map (§4); emoji ramp.
- Routes scaffold (§7); top‑nav "Cover Letters" active state.
- **AI:** add `coverLetter`, `clSkills`, `clStrengths`, `clRoles`, `parseResume`, `improveLetter` tasks to `/api/ai` (mocked fallbacks first, then live Gemini).

### Phase 1 — Dashboard + Entry (`step 1`, `Step 2`)
- Cover Letters dashboard: hero ("Secure your dream job with AI‑tailored cover letters" + "Write one more"), 3 stat cards (`0/5` Cover letters written / `~250` Job applications / `~84` Days to get an offer), saved CL list cards (thumbnail + "Software developer at <Company>" + updated date + Download/Edit/Copy/Delete), "+ Create new cover letter", footer, floating Help.
- Entry screen: 3 method cards (Use your resume = primary/expandable, Start from scratch, Upload a resume).

### Phase 2 — Start‑from‑Scratch Wizard (`step 3–13`)
- Job intent (Yes/No) → branch.
- Job details (YES) / Desired job title (NO, chips).
- Skills (ChipMultiSelect max 3) → Experience (picker + helper) → Recent job (conditional) → Education (cards) → Degree → Field (conditional) → Strengths (max 3) → Personal details.
- Wire every branch in §3; enforce Next‑enable rules (e.g. job title required, ≥1 (ideally 3) chips, one experience/education selected).

### Phase 3 — Generation + Final Preview (`step 14`, `step 28`)
- Loading/generation state → call `coverLetter` (Gemini).
- `CoverLetterPreview` A4 doc; targeted vs generic output.
- Reuse EditorShell top bar: Home, Write/Design toggle (**Design default**), 100% progress, **Download**.

### Phase 4 — Write Mode (`step 15`, `step 16`)
- 3‑panel layout: left sidebar (Personal details / Letter content) + center editor + right live preview ("Saved" indicator).
- W1 Personal details form (name, desired job title, email, phone, address) → live preview sync.
- W2 Letter content (company name, hiring manager name + Tiptap rich editor with full letter) → live preview sync.
- Optional `improveLetter` AI assist buttons (enhancement).

### Phase 5 — Design Mode + Download
- Reuse `DesignPanel` (templates carousel, Styles/Fonts/Colors) bound to CL `design`.
- PDF export via `download-pdf.ts` against the CL preview node.

### Phase 6 — Upload‑a‑Resume Flow (`step 17`, `step 18`)
- `UploadDropzone` (drag‑drop + choose file + Dropbox/Google Drive/LinkedIn).
- Parse via `parseResume` (Gemini) → populate store → **Review**.

### Phase 7 — Use‑Your‑Resume Flow (`step 29`, `step 30`)
- Expandable resume selector on the entry card (list saved resumes; switch).
- Map saved resume data → `parseResume`/direct mapping → **Review**.

### Phase 8 — Review + Edit Screens (`step 18/30` + `step 19–24`)
- `ReviewCard`: Education, Recent job, Experience, Skills, Strengths, Personal details — each with Edit pencil.
- Edit screens reuse the same UIs as onboarding **but** `mode="edit"`: CTA = **Save changes**, on save update only that section and return to Review (no full‑wizard restart).
- Dependency handling: changing Experience 10+→~1 may clear Recent job (flag/clear) per spec.
- Review → Next → Job intent → generate (shared downstream).

### Phase 9 — Live AI Wiring
- Switch all six AI tasks from mock fallback to live Gemini; verify generation (targeted + generic), parsing accuracy, and chip suggestions.

### Phase 10 — Polish
- Validation (email format, required fields), mobile stacking, sticky footers, autosave/"Saved", "Save your progress / Continue" resume card, paywall hook on Download (optional), empty/error states (resume not readable, no saved resumes → hide Use‑your‑resume).

---

## 10. Acceptance Checklist (traceability — "do not miss any content")

- [ ] All 3 entry methods reachable; Use‑your‑resume is the visually primary/expandable option.
- [ ] Job‑intent branch (YES job details / NO desired title) both merge into Skills.
- [ ] Experience ~1 skips Recent job; >1 shows it.
- [ ] Education non‑graduate skips Degree + Field; graduate shows both.
- [ ] Skills and Strengths enforce max‑3 with 🔥 + blue‑check selected state.
- [ ] Step indicator (Add details/Personalize/Download) + per‑screen "+X%" progress messages match §4.
- [ ] Review screen (6 rows + pencils) identical for upload & use‑resume; edits use **Save changes** and return to Review.
- [ ] Final preview: Design default, Write/Design toggle, Download, 100% + happy emoji.
- [ ] Write mode: Personal details first → Letter content; live preview + "Saved".
- [ ] Targeted vs generic letter output (company present vs absent).
- [ ] Real Gemini generation + parsing wired through `/api/ai` with graceful fallback.

---

*Every screen in `Cover_Letter/step 1.png` … `step 30.png` and every numbered section of both `.docx` files is represented above. Screens that share a UI (e.g. Review for upload vs use‑resume, or onboarding vs edit) are intentionally unified into one component with mode flags, as the docs instruct ("reuse existing UI", "keep identical UI, only change CTA").*
