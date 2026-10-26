# Design Foundation — Resumewriter.ai (repo-grounded source of truth)

Every value below is pulled from the codebase, not invented. Each row cites the file it
comes from. If the repo does not contain it, the design does not show it. When any of
these files change, update this doc — it is the grounding layer that `design-system.md`
(build spec) and `stitch-design.md` (Stitch exploration) both inherit from.

> Correction of record: `stitch-design.md` §2 lists exploratory color names/hexes
> (Frame Mist `#EEF2F8`, Ink `#0D1526`, Steel `#61708C`, Hairline `#E3E8F1`,
> Blue Tint `#ECF3FF`) that do NOT exist in the code. The **real** tokens are the ones
> in section 3 below (`src/app/globals.css` `:root`). Use these; ignore the invented set.

---

## 1. Purpose (what this product is)

From `README.md` (line 3-5), verbatim intent:

> "An AI-assisted career toolkit: build a resume, generate matching cover and resignation
> letters, browse and tailor to jobs, and prepare for interviews — all grounded in the
> user's own resume, never invented content."

Core principle (`CLAUDE.md`): every AI feature is grounded ONLY in the user's own resume
(plus, for company-specific interview prep, the pasted job description and verified company
facts). Nothing about the candidate is invented — no employers, metrics, tools, years,
licences, or eligibility. Personal/eligibility facts are surfaced as fill-in templates.

Product name: **Resumewriter.ai**. Dev origin: `http://localhost:3001`
(`README.md`; `src/config/site.ts` prod origin resolution).

## 2. What the README leads with → the hero

`README.md` "Features" leads with the **Resume builder** — "guided, section-by-section
editor with a live preview, multiple templates, colors and fonts, and PDF export." That
feature dominates: it owns the most surface, the completion meter, the live document, and
the Write/Design/Improve stage switcher. Everything else (letters, jobs, interview prep)
is downstream of the resume the user builds here. Establish the builder's weight first.

Feature order (README): Resume builder → AI assistance → Cover & resignation letters →
Jobs → Interview prep.

## 3. Visual identity — the REAL tokens

Single source of truth: `src/app/globals.css` `:root` (lines ~97-176). Light theme only
(no `.dark` palette defined). Utilities resolve `--color-*` (`@theme inline`) → `:root`.

Color (verbatim):

| Token | Value | Role |
|---|---|---|
| `--background` | `#f6f7f9` | app/page ground (light gray) |
| `--foreground` | `#18181b` | primary text (near-black) |
| `--card`, `--popover` | `#ffffff` | cards, panels, menus |
| `--primary` | `#2563eb` | the single brand accent (blue) |
| `--primary-foreground` | `#ffffff` | text/icons on primary |
| `--primary-strong` | `#1d4ed8` | hover/emphasis of the accent |
| `--secondary`, `--muted` | `#f1f2f4` | quiet fills |
| `--muted-foreground` | `#6b7280` | secondary text, metadata |
| `--accent` | `#eef2ff` | soft blue tint (selected rows, AI banners) |
| `--accent-foreground` | `#1d4ed8` | text on the tint |
| `--destructive` | `#dc2626` | danger (red-600, AA-safe both ways) |
| `--border` | `#e7e8eb` | 1px borders, dividers |
| `--input` | `#e2e3e7` | input borders |
| `--ring` | `#2563eb` | focus ring |
| `--brand-teal` | `#1e40af` | account-avatar mark (navy; was teal, folded to blue) |
| `--ai-from`→`--ai-to` | `#4f8bff`→`#2563eb` | AI gradient (was purple/magenta) |
| `--ai-text`, `--ai-solid` | `#1d4ed8` | AI text/solid (>=4.5:1 verified) |
| `--logo-from`→`--logo-to` | `#4f8bff`→`#2563eb` | logo mark gradient |
| `--chart-1..5` | `#2563eb #14b8a6 #f59e0b #8b5cf6 #ef4444` | data-viz (the only multi-hue exception) |

Progress ramp — deliberately KEPT orange→green (a motivational climb, not folded to
blue; per Keshav's call): `--progress-low #f97316`, `--progress-early #f59e0b`,
`--progress-mid #84cc16`, `--progress-high #22c55e`, `--progress-done #16a34a`.

Typography — families in `src/app/layout.tsx`, scale in `src/app/globals.css` `@theme`:

- `--font-sans` = **Inter** (body/UI)
- `--font-heading` = **Gabarito** (display/headings; e.g. dialog titles use `font-heading`)
- `--font-geist-mono` = **Geist Mono** (aligned numbers)
- Document-only faces (Roboto, Georgia/EB Garamond, Lora, Playfair, …) are a **carve-out**
  for the rendered resume/letter and must never style app chrome.
- Type scale (custom, `@theme` lines ~77-90; base 18px, ~1.2 step): `--text-xs 14`,
  `sm 16`, `base 18`, `lg 21`, `xl 23`, `2xl 27`, `3xl 33`, `4xl 39`, `5xl 51`, `6xl 63`,
  `7xl 75`, `8xl 99`, `9xl 131` (px). NOTE: this is larger than a stock Tailwind scale —
  `text-sm` is 16px here, not 14px.

Spacing — no custom `--spacing` override in `@theme`; Tailwind v4's default 4px unit scale.

Radius — scale in `@theme` (lines ~63-69) off `--radius` base `0.75rem` (12px):
`--radius-sm` (×0.6 ≈ 7px), `--radius-md` (×0.8 ≈ 10px), `--radius-lg` (=12px),
`--radius-xl` (×1.4 ≈ 17px), `--radius-2xl` (×1.8 ≈ 22px), `--radius-3xl` (×2.2 ≈ 26px),
`--radius-4xl` (×2.6 ≈ 31px). Applied conventions (shipped on `redesign-blue-white`):

- Action buttons and input boxes → **10px** (`rounded-[10px]`).
- Cards → `rounded-2xl`, large document cards `rounded-3xl`.
- Stay round: nav tabs, segmented toggles, avatars, badges, status pills, score rings,
  chips, progress tracks, floating Back/Help pills.

Selected/active control convention: filled **blue** (`bg-primary text-primary-foreground`),
never the old dark `bg-foreground text-background`. Home buttons are solid blue.

## 4. Content inventory (real terminology — use these exact labels)

Resume sections — built-in in `section-nav.tsx` (`SECTION_META`): Personal details,
Contact information, Professional summary, Employment history, Skills, Education
(reorderable: employment, skills, education). Addable "Additional section" presets in
`sections/additional-config.tsx` (`ADDITIONAL_CONFIG`): Internships, Courses, References,
Languages, Links, Hobbies, and a free-form Custom section. (An imported resume also groups
any heading without a dedicated home into a Custom section.)

Templates — `src/config/templates.ts` (folder membership under `/public` is the source of
truth). Default + Recommended: **Clear ATS** (`clear-ats`). Names: Clear ATS, Professional,
Leadership, Strategic, Specialist, Classic ATS, Minimalistic, Corporate, Clear (recommended),
Simple, Functional, Balanced, Essential, Executive, ATS Modern/Classic/Minimal/Professional/
Executive/Elegant. Category tabs: **All templates**, ATS-friendly, Simple, Professional,
Student.

Interview prep — `README.md`, `src/features/interview-prep/lib/interview-prep.ts`,
system prompts in `src/app/api/ai/route.ts`:
- Modes: **Screening Call**, **Meeting with a Manager**, **Technical** (+ an *Other*
  custom-topic mode in the lib).
- Flows: *Interview at a specific company* (resume + company + pasted job description) and
  *Just practicing* (resume-only). Questions stream in one card at a time.
- Per-type rules (structure verified in the lib; counts per the interview-prep specs in
  `CLAUDE.md`): exactly **7** initial questions and **3** on "get more"; coaching tips —
  Screening 2-3, Manager exactly 3, Technical exactly 2; sample answers — Screening short,
  Manager when supported, **Technical none (tips-only)**; "questions you can ask" —
  Screening/Manager 3, Technical/Other none. Company flow adds a company/role overview
  (insights 3-5, key skills 8-10, values 5, mentions 4).

Jobs match vocabulary — `src/features/jobs/lib/keyword-match.ts`:
- Labels: Strong (>=75), Good (>=55), Fair (>=30), Weak (>=15), Low.
- Ring color bands: green (>=67), amber (>=34), red (<34) — small card rings via
  `ringColor`, large detail ring via `ringTheme` (same bands; green `#116B3A`,
  amber `#B45309`, red `#B91C1C`).

Do not introduce placeholder names ("John Doe", "Acme", "Nexus"), fake round numbers, or
AI cliches ("Elevate", "Seamless", "Unleash"). Use realistic sample content (e.g. a Senior
Marketing/Software resume, a 92% job match).

## 5. Critical files (where truth lives)

| Concern | File |
|---|---|
| Design tokens (single source) | `src/app/globals.css` `:root` |
| Fonts | `src/app/layout.tsx` |
| AI endpoint (summary, bullets, skills, extraction, interview prep) | `src/app/api/ai/route.ts` |
| Resume data model + completion progress | `src/features/resume-builder/store/resume-store.ts` |
| Template gallery + categories | `src/config/templates.ts` |
| Resume DOCUMENT palettes (carve-out) | `src/config/resume-themes.ts` |
| Job scoring + match labels | `src/features/jobs/lib/{keyword-match,job-search}.ts` |
| Interview Q/A model + render | `src/features/interview-prep/{lib/interview-prep.ts,components/interview-prep.tsx}` |
| Shared UI (feature-agnostic) | `src/components/{common,forms,layout}` |
| Folder architecture map | `docs/architecture.md` |

## 6. Native shapes (let the data organize the page)

- **Resume builder = a section pipeline with a live document.** An ordered `SectionKey`
  list drives a left section-nav, a center form, and a right live preview; a completion
  meter scores fill. This is the app's spine — a builder, not a marketing page.
- **Jobs = a scored catalog (master/detail).** A left list of postings, each carrying a
  match % against the user's resume, with a right detail pane (keyword match card, apply).
- **Interview prep = streamed Q/A sets.** Per-type question cards that paint in one at a
  time as they generate; company flow adds a company/role overview.
- **Letters = generated documents.** Cover and resignation letters produced from the
  resume + target role, each with its own Write/Design editor and PDF export.

The rendered resume/letter document is a deliberate carve-out with its own neutral,
ATS-safe styling. Its Design-panel color themes are their own palette, separate from the
app's blue+white chrome — `src/config/resume-themes.ts` (`RESUME_THEMES`), 8 themes:
**Black** (default, `DEFAULT_THEME_ID`), Blue, Rose, Amber, Emerald, Teal, Cyan, Dark
(each repaints the document sidebar/page/headings together for legibility). Document faces
are chosen per template (`src/config/templates.ts` presets: `roboto` / `georgia` /
`garamond`). Never restyle the resume/letter preview with the app chrome — no blue+white
tokens, no app radius/typography. This is the single largest carve-out in the product.

## 7. Goals / non-negotiables (design must serve these)

- **Grounded, never invented** — AI output is fact-checked against the resume.
- **ATS-safe document output** — the resume/letter stays parseable; document colors are
  carved out from the blue+white chrome.
- **One theme, app-wide** — every screen reads from the single `globals.css` token set;
  no per-page palette, no hardcoded hex in components.
- **Zero emoji** — icons are lucide (inline SVG, `currentColor`) or plain words; enforced
  by `scripts/check_no_emoji.py`.
- **Accessibility** — WCAG 2.2 AA minimum; color never the only signal; verified with
  `validate_contrast.py` / `contrast.py`.
- **No workflow/route/API change during polish** — the redesign refines color, radius, and
  consistency in place on the existing top-nav layout (no sidebar).
