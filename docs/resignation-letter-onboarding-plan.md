# Resignation Letter Generator — Onboarding Plan (Step-Wise & Phase-Wise)

Source of truth: `Resignation letters/Flow.docx`, `Resignation letters/Resignation letters.docx`, and the 10 step screenshots `Resignation letters/Step 1.png … Step 10.png`. **Nothing in those files is omitted** — every screen, field, helper line, chip, button, progress value, stepper label, design control, and AI touch-point below is traced back to them.

This mirrors the existing **resume builder** and **cover-letter generator** (Next.js 16 + Tailwind v4 + Base UI + Zustand + Gemini via `/api/ai` + jsPDF/html2canvas-pro). We reuse those primitives wherever possible (StepShell, chip widgets, `RichTextEditor`, design panel, paywall gate, PDF download).

---

## 1. Product Overview

The Resignation Letter generator is a **single linear guided AI builder** — *not* a multi-entry flow like the cover-letter feature. There is **one path**:

```
Dashboard ─► Create new ─► 7-step guided builder ─► AI generation ─► Final document
                                                                       │
                                            ┌──────────────────────────┴───────────────────────┐
                                       Design mode (default)                              Write mode (Edit)
                                       size / font / color                       sections + rich editor + Improve with AI
                                            └──────────────────────────┬───────────────────────┘
                                                                  Download (PDF)
```

The funnel is deliberately staged (per `Flow.docx` §"What the designer should understand"):
1. **Start easy** — one field (full name).
2. **Build the skeleton** — recipient, position, dates (these are the required document spine).
3. **Enrich optionally** — reason, gratitude, assistance (emotional/tone content, all skippable).
4. **Optional contacts** — least-critical info last.
5. **Generate → polish → download.**

### Global UX systems (present on every builder screen) — *Step 2–8.png*
- **Top progress stepper:** 7 pill segments, the active one tinted green with its label beneath it. Completed segments are solid dark; upcoming segments are light grey. Labels in order: **Heading → Recipient → Position & Dates → Reason → Gratitude → Assistance → Contacts**.
- **Top-right completion meter:** percent + emoji chip (🙂 in the builder; 😋 on the final document at 85%).
- **Two-pane body:** left = form/question area, right = **live letter preview** (always visible, updates in real time).
- **Bottom nav:** `Back` (left, hidden on the very first step) + **Next** (right, primary blue). 
- **Help pill:** fixed bottom-right.
- **Minimal header** — only the logo mark (no dashboard nav chrome inside the builder).

---

## 2. Screen Inventory → Screenshot / Doc Map (nothing skipped)

| # | Screen | Screenshot | Stepper label | CTA |
|---|--------|-----------|---------------|-----|
| D | **Resignation Letters Dashboard** (library) | `Step 1` | — | Create new / card actions |
| 1 | **Start with your full name** | `Step 2` | Heading | Next *(no Back)* |
| 2 | **Provide employer's information** | `Step 3` | Recipient | Back · Next |
| 3 | **Add a few crucial details** (position & dates) | `Step 4` | Position & Dates | Back · Next |
| 4 | **Provide a reason** (chips, optional) | `Step 5` | Reason | Back · Next |
| 5 | **Express your gratitude** (emoji chips, optional) | `Step 6` | Gratitude | Back · Next |
| 6 | **Offering assistance?** (binary buttons) | `Step 7` | Assistance | Back · Next |
| 7 | **Add contact details** (optional) | `step 8` | Contacts | Back · Next → generate |
| G | **AI generation** (transition/loading) | (transition) | — | — |
| P/Des | **Final document — Design mode** (default) | `Step 9` | — | Download |
| W | **Final document — Write mode** ("Edit your letter") | `Step 10` | — | Back/Next · Download |

---

## 3. Step-by-Step Specification (exact copy & fields)

### Screen D — Dashboard `/resignation-letters` — *Step 1.png*
The library / management screen. Top navigation: **Resumes · Cover letters · Resignation letters (active) · Jobs**. Top-right: **Subscribe now** (link with rocket icon), user avatar (`J`), blue **+ Create** button.

- **Saved letter cards** (each): thumbnail preview (light *or* dark letterhead variant), **Title** (e.g. *"John Mayer"* / *"John Mayer at Microsoft Corporation"*), **Updated <relative/absolute date>** (e.g. "Updated 44 minutes ago", "Updated 14 Nov 2025"), and four actions: **Download** (blue, download icon) · **Edit** · **Copy** · **Delete**.
- **Primary CTA (centered):** **+ Create new resignation letter** → routes into the builder at Step 1.
- **Footer:** `© 2026, Resume.co. All rights reserved · Support · Privacy policy · Terms of use`.
- **Help pill** bottom-right.
- *Design intent (Flow.docx §1):* feel like a document workspace, surface key actions immediately, keep "create new" central.

### Screen 1 — Heading / Full name — *Step 2.png* — stepper **Heading**, ~29%, 🙂
- **H1:** `Start with your full name`
- **Helper:** `Place your name at the top of the letter. This sets a clear and straightforward tone right from the start.`
- **Field:** label `Your full name`, pre-filled `John Mayer` (autofill from session/account where available), focused.
- **Live preview:** title **Resignation Letter** · name (highlighted with a small name-badge accent on this step) · `April 14, 2026` · opening line `I am writing to formally resign from my position, with my last working day being April 28, 2026.` · email footer `john.mayer17800@gmail.com`.
- **Nav:** **Next only** (intentional low-friction first step — reduce abandonment).

### Screen 2 — Recipient / Employer — *Step 3.png* — stepper **Recipient**
- **H1:** `Provide employer's information`
- **Helper:** `Address your resignation letter to your immediate supervisor or manager.`
- **Fields:**
  - `Manager's name` — placeholder `David Williams` *(focused/primary)*
  - `Company name` — placeholder `Apple Inc.`
  - `Company address (optional)` — placeholder `500 W 2nd St, Austin, TX 78701`
- **Nav:** Back · Next.

### Screen 3 — Position & Dates — *Step 4.png* — stepper **Position & Dates**
- **H1:** `Add a few crucial details`
- **Helper:** `State the position you're leaving and your final working day. These essential details provide clarity and help your employer make plans for the transition.`
- **Fields:**
  - `Opening salutation` — **auto-filled** from the manager's name → `Dear David Williams,` (editable). *This is the "smart" continuity moment — prior input reused automatically.*
  - `Position you are leaving` — placeholder `Account Manager`
  - `Letter submission date` — **date picker**, default `14 Apr 2026` (today)
  - `Last working day` — **date picker**, default `28 Apr 2026` (suggest +14 days / two-weeks notice)
- **Nav:** Back · Next.

### Screen 4 — Reason — *Step 5.png* — stepper **Reason**
- **H1:** `Provide a reason`
- **Helper:** `You may briefly mention your reason for resigning, though this is optional. If you choose to include it, our AI will help keep the tone positive and professional.`
- **Chips (select one):** `Personal Reasons` · `Relocation` · `Career Advancement` · `Health Reasons` · `Change in Career Path` · `Work-Life Balance` · `Other Reason`
  - *Decision:* **single-select** (a letter states one reason). `Other Reason` reveals a small free-text input.
- **Optional** — Next enabled with no selection.
- **Nav:** Back · Next.

### Screen 5 — Gratitude — *Step 6.png* — stepper **Gratitude**
- **H1:** `Express your gratitude`
- **Helper:** `In this optional paragraph, our AI can help you express gratitude for the opportunities you've been given, laying the groundwork for a positive long-term relationship.`
- **Emoji chips (multi-select):** 🔥 `Professional Growth` · 💪 `Mentorship and Guidance` · 🤝 `Team Collaboration` · 🧫 `Learning Opportunities` · ✌️ `Company Culture` · 🚀 `Career Advancement` · 🎯 `Challenging Projects` · ⭐ `Personal Development` · 🍇 `Networking Opportunities`
  - *Decision:* **multi-select, max 3** (same pattern as cover-letter strengths) so the AI weaves a focused paragraph.
- **Optional.** **Nav:** Back · Next.

### Screen 6 — Assistance — *Step 7.png* — stepper **Assistance**
- **H1:** `Offering assistance?`
- **Helper:** `Offering to assist with a smooth transition, such as training a replacement or completing pending projects, can leave a lasting positive impression and benefit your career in the long run.`
- **Binary choice buttons:** 🔥 `Yes, I'd love to offer my help` · ✌️ `I am okay with skipping this point`
- **Nav:** Back · Next.

### Screen 7 — Contacts — *step 8.png* — stepper **Contacts** (last builder step)
- **H1:** `Add contact details`
- **Helper:** `This step is optional. Fill in these fields only if your company requires it.`
- **Fields:**
  - `Your email` — **pre-filled** `john.mayer17800@gmail.com`
  - `Your phone` — placeholder `999 888 7777`
  - `Address` — placeholder `500 W 2nd St, Austin, TX 78701`
- **Nav:** Back · **Next → triggers AI generation** and routes to the final document.

### Screen G — AI generation (transition)
Loading state ("Generating your resignation letter… / Writing with AI") while `/api/ai` task `resignationLetter` composes the full body from all collected inputs. Falls back to a deterministic template on any failure (same `callAi → null → fallback` contract as cover letters).

### Screen Des — Final document, **Design mode** (default) — *Step 9.png* — 85%, 😋
- **Top bar:** Home icon · **Write | Design** toggle (**Design active**) · emoji + green progress **85%** · **Download** (blue, top-right).
- **Left floating vertical toolbar:**
  - **Text size:** `S` · `M` · `L` (M active/blue)
  - **Font style:** `Aa` (typeface selector with caret dropdown)
  - **Color/theme swatches:** black (selected ring) · green · blue · teal (filled) · black (filled — dark letterhead theme, matching the dark card on the dashboard)
- **Center canvas:** print-ready A4 document — **Resignation Letter** (large serif) · **John Mayer** (bold) · `April 14, 2026` · body `I am writing to formally resign from my position, with my last working day being 28 April 2026.` · footer email.
- *UX intent:* confidence, polish, export — no more data collection.

### Screen W — Final document, **Write mode** ("Edit your letter") — *Step 10.png* — 85%
- **Top bar:** Home · **Write (active) | Design** · 85% · Download.
- **Left sidebar — section navigation:** `Personal details` · `Employer's info` · `Letter content` (active). *Non-linear structured editor — distinct from the linear builder.*
- **Center editor card:** `Letter content` heading · `Write the content of the letter.` · `Letter body` label · **rich-text toolbar** (Bold, Italic, bullet list, ordered list, link) · **Improve with AI ▾** button (purple sparkle) · editable pre-generated body. Footer: **Back · Next**.
- **Right pane:** live formatted preview + **Saved** indicator (autosave).
- **Help pill** bottom-right.

---

## 4. Letter Document Model (what the preview/PDF renders)

```
                 Resignation Letter            ← serif title
                 John Mayer                     ← bold name
[recipient block, when present]
   To David Williams
   Apple Inc.
   500 W 2nd St, Austin, TX 78701

April 14, 2026                                  ← submission date

Dear David Williams,                            ← salutation (auto)

I am writing to formally resign from my position as Account Manager,
with my last working day being April 28, 2026.   ← core sentence (position + dates)

[reason paragraph]      ← AI, positive tone, only if a reason chosen
[gratitude paragraph]   ← AI, from selected gratitude chips
[assistance paragraph]  ← AI, only if "Yes, offer help"
Sincerely,
John Mayer
                                                 ← contacts footer
john.mayer17800@gmail.com · 999 888 7777 · 500 W 2nd St, Austin, TX 78701
```

The light vs dark letterhead seen on the dashboard cards is the **theme/color swatch** chosen in Design mode (black filled swatch = dark letterhead).

---

## 5. Data Model — Zustand store (`resume-co:resignation-letter`, persisted)

```ts
type RLStep =
  | "heading" | "recipient" | "position" | "reason"
  | "gratitude" | "assistance" | "contacts"
  | "generate" | "preview";

type RLFontId = "georgia" | "inter" | "garamond";
type RLFontSize = "S" | "M" | "L";

interface ResignationLetterState {
  fullName: string;
  employer: { managerName: string; companyName: string; companyAddress: string };
  salutation: string;                 // auto from employer.managerName, editable
  position: string;
  submissionDate: string;             // ISO; default today
  lastWorkingDay: string;             // ISO; default +14 days
  reason: string | null;              // single select; "Other" → otherReasonText
  otherReasonText: string;
  gratitude: string[];                // multi-select, max 3
  assistance: boolean | null;         // Yes / Skip
  contacts: { email: string; phone: string; address: string };

  letter: { body: string };           // generated HTML
  design: { font: RLFontId; accent: string; fontSize: RLFontSize };

  step: RLStep;
  mode: "onboarding" | "edit";
  // setters + goNext/goBack/hydrate/reset (same shape as cover-letter store)
}
```

Pure helpers (mirroring the cover-letter store): `stepSequence()` (linear: heading→recipient→position→reason→gratitude→assistance→contacts→generate), `progressForStep()` (per-step % + verbatim stepper label), `canProceed()` (validation — see §7), `isValidEmail()` (reused).

---

## 6. Routes & AI

**Routes**
- `/resignation-letters` — dashboard (Screen D)
- `/resignation-letter/builder` — 7-step guided wizard (Screens 1–7)
- `/resignation-letter/preview` — final document (Design default / Write / Download)

*(No "choose a method" entry screen — Create new goes straight to the builder, unlike cover letters.)*

**AI touch-points (`/api/ai`)** — add one task, reuse the rest:
- **`resignationLetter`** *(new)* — compose the full body from name, employer, salutation, position, dates, reason, gratitude[], assistance, contacts. Plain text, professional + positive tone; reason phrased diplomatically; gratitude paragraph from chips; assistance paragraph only if `Yes`. JSON:false, `callAi → null → fallback` template.
- **`improveText`** — "Improve with AI" in Write mode (reuse the resume/cover-letter improve task).
- Nav wiring: `top-nav.tsx` "Resignation letters" → `/resignation-letters`.

---

## 7. Validation & Smart Behaviors
- **Heading:** Next requires non-empty `fullName`.
- **Recipient:** Next requires `managerName` + `companyName` (address optional).
- **Position & Dates:** require `position`, `submissionDate`, `lastWorkingDay`; `lastWorkingDay ≥ submissionDate`; **auto-fill salutation** = `Dear ${managerName},` whenever the manager name changes and the user hasn't manually overridden it.
- **Reason / Gratitude / Assistance / Contacts:** all **optional** — Next always enabled (Contacts validates email format only if non-empty).
- **Autosave** ("Saved" pill) in Write mode; **draft persistence** via the store so an in-progress letter survives reloads.

---

## 8. Phase Plan (build order)

| Phase | Scope | Key files |
|---|---|---|
| **0 — Foundations** | Persisted store + types + `stepSequence/progressForStep/canProceed`; route scaffold; nav wiring | `lib/store/resignation-letter-store.ts`, `top-nav.tsx` |
| **1 — Dashboard** | `/resignation-letters` library: saved cards (Download/Edit/Copy/Delete), Create-new CTA, footer, Help, Subscribe/Create top bar | `app/resignation-letters/page.tsx`, `resignation-letter-card.tsx`, mock data |
| **2 — Builder shell + Steps 1–2** | Stepper (7 labels), % meter+emoji, two-pane live preview, Back/Next/Help; Heading + Recipient screens | `components/resignation-letter/step-shell.tsx`, `resignation-letter-preview.tsx`, `steps.tsx` |
| **3 — Steps 3–4** | Position & Dates (date pickers + auto-salutation) + Reason chips (single-select, Other→input) | `steps.tsx`, `widgets.tsx`, `suggestions.ts` |
| **4 — Steps 5–7** | Gratitude emoji chips (max 3) + Assistance binary + Contacts (pre-filled email) | `steps.tsx` |
| **5 — AI generation** | `resignationLetter` task in `/api/ai`; generate-on-finish; render body into the A4 preview; fallback template | `app/api/ai/route.ts`, `lib/resignation-letter/ai.ts`, `format.ts` |
| **6 — Design mode + Download** | `/resignation-letter/preview` Design pane (S/M/L size, Aa fonts, color/theme incl. dark letterhead) + PDF download via paywall gate | `app/resignation-letter/preview/page.tsx`, `design-panel.tsx`, `download.ts`, reuse `paywall.ts` |
| **7 — Write mode** | Sidebar sections (Personal/Employer/Letter content) + rich editor + Improve with AI + Saved/autosave | `write-mode.tsx` (reuse `RichTextEditor`) |
| **8 — Polish** | Validation, draft "Continue", Copy/Delete dashboard actions, mobile stacking, empty state | across feature |

---

## 9. Reuse Map (don't rebuild)
| Need | Reuse from |
|---|---|
| Wizard chrome / footer / progress | cover-letter `step-shell.tsx` (adapt stepper to 7 labeled segments) |
| Chip multi-select + emoji chips | cover-letter `widgets.tsx` `ChipMultiSelect` |
| Rich text editing | resume/cover-letter `RichTextEditor` |
| AI bridge + fallback contract | `/api/ai` + `callAi` pattern |
| PDF export | `download.ts` (`html2canvas-pro` + jsPDF, target `[data-rl-preview]`) |
| Paywall on Download | `lib/cover-letter/paywall.ts` + `PaywallDialog` |
| Design panel layout | cover-letter `design-panel.tsx` (add S/M/L size control) |

---

### One-line summary
A single linear, low-friction **7-step guided builder** (name → employer → position/dates → reason → gratitude → assistance → contacts) with a constant live preview, ending in an AI-generated document that the user can **Design** (size/font/theme) or **Write** (sectioned rich editor with *Improve with AI*) before **Download** — managed from a **Resignation Letters dashboard**.
