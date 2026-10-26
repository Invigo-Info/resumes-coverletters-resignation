# Resumewriter.ai — UX Redesign & Design System

Blue + white identity, a persistent app shell, and a reimagined dashboard — grounded
in the app's real workflow, delivered without changing any route, URL, API, or the
resume document output.

- Status: design spec (pre-implementation). Interactive preview:
  https://claude.ai/code/artifact/8778cb7a-669b-47fe-8f39-520ea5bc3eb7
- Scope: app chrome (navigation, dashboard, section landings, editor chrome, forms,
  cards, interview-prep cards, marketing, auth, onboarding, billing, account).
- Out of scope (carve-out): the rendered resume/letter document and its selectable
  themes (see "Carve-outs").
- Source of truth for color today: `src/app/globals.css` `:root` (single file, no
  `tailwind.config`, no token JSON pipeline). This doc drives edits to that file.
- Repo-grounded facts (purpose, hero, critical files, real tokens verbatim, content
  inventory, native data shapes, goals): [`design-foundation.md`](./design-foundation.md).
  Read it first — it is the grounding layer this spec builds on.

---

## 1. Principles

Decision order (higher never sacrificed for lower):

1. User needs — the task must be completable.
2. Accessibility — perceivable, operable, understandable, robust (WCAG 2.2 AA min).
3. Consistency — one shared token theme, one component vocabulary across every page.
4. Aesthetics — the blue + white identity is expressed here, never above 1-3.
5. Developer experience — token-driven, one place to change, no per-page palettes.

Committed direction (confirmed with the product owner):

- Scope is POLISH ONLY on the existing application. Keep the current structure exactly:
  the existing top-nav navigation, the current page layouts, and the current dashboard.
  No sidebar shell, no re-layout, no new navigation model.
- Strict blue + white. Fold the legacy purple AI gradient, teal brand mark, and the
  orange to green progress ramp into a disciplined blue + white + neutral system. Keep
  only genuine semantic status (success/warning/danger) and multi-hue data-viz.
- Interview-prep question cards folded into a blue family (a color change, not a layout
  change).
- Everything else is visual refinement in place: color, spacing, type hierarchy, shadow,
  and component consistency on the pages exactly as they are. Every page's layout,
  interaction model, and workflow stay identical.

Not in scope (dropped): the earlier sidebar shell and reimagined-dashboard ideas, and the
sample preview artifact. Those were exploration only and are NOT the design to build.

---

## 2. Application workflow (grounded in real routes)

The full click-by-click journey — every button and what shows next — lives in
[`user-workflow.md`](./user-workflow.md). This section is the summary.

The product is a hub-and-spoke career toolkit. Every AI feature is grounded only in the
user's own resume; nothing about the candidate is invented. Routes below are real
(`src/app/(public|authenticated)/...`).

### 2.1 Acquisition and entry

```
Visitor
  -> "/"  (public)                      Landing page (marketing) when signed out;
  |                                     Resumes home when signed in
  -> "/login"                           Google OAuth or email; toggles sign in / sign up
  -> back to "/" (signed in)
```

### 2.2 Onboarding — "How should we start?"  (`/resume-creation-menu`, feature: onboarding)

```
/resume-creation-menu
  |-- Upload your resume  -> import (PDF/DOCX, Drive/Dropbox/LinkedIn)
  |        -> /resumes/write/personal?source=upload
  |-- Start from scratch  -> /builder/template  -> /resumes/write/personal
  \-- Over free resume cap -> /payment            (resume-limit gate)
```

Confirmed in `features/onboarding/components/resume-onboarding.tsx`
(`push("/resumes/write/personal?source=upload")`, `push("/builder/template")`,
`push("/payment")`). An imported resume unlocks every section immediately.

### 2.3 Core loop — build a resume

```
/resumes/write/[section]        section-by-section guided writer (personal, experience,
      |                         education, skills, summary, custom...)
      v
/builder                        full editor: three panes + tabs [Write | Design | Improve]
      |                         - Write: section forms
      |                         - Design: /builder/template + accent + fonts
      |                         - Improve: AI suggestions per section
      |  (free cap reached)  -> /payment           (top-bar.tsx push("/payment"))
      v
Download PDF                    completion meter climbs; export is ATS-safe
```

### 2.4 Adjacent spokes (all reachable from the shell)

```
Cover letters   /cover-letters -> /cover-letter/new -> /cover-letter/builder
                 -> /cover-letter/preview -> /cover-letter/review
Resignation     /resignation-letters -> /resignation-letters/write/[section]
                 -> /resignation-letter/builder -> .../preview
Jobs            /jobs (master/detail, match score) -> /tailoring -> /apply
Interview prep  /interview-prep (pick a resume, then a mode)
                 - Just practicing (resume-only): screening-call | meeting-with-a-manager
                   | technical | other
                 - Interview at a specific company (resume + job description)
                 - /interview-prep/saved , /interview-prep/saved/[id]
Account         /account (profile, plan, preferences, danger zone)
Billing         /payment -> /payment/checkout -> /payment/success
```

### 2.5 Cross-cutting states in every flow

- Resume-limit gating routes free users to `/payment` at create time.
- Empty states guide to the first action (no data is never a dead end).
- Autosave + server merge (Zustand stores hydrate instantly, then reconcile server copy).
- Print/PDF hides app chrome; the document keeps its own neutral, ATS-safe styling.

### 2.6 What the workflow implies for UX

- The build loop is the money path -> the editor, its live preview, and the completion
  meter get the most polish; the meter must read as progress at a glance.
- Landings are scanned, not read -> keeping type, spacing, and card styling consistent
  across the existing pages lowers cognitive load as the user moves between them.

---

## 3. Navigation model — keep the existing structure

No navigation change. The current sticky `TopNav` (`features/dashboard/components/
top-nav.tsx`) stays as the navigation for every hub page, and the focused surfaces (resume
editor, letter builders/preview, tailoring, onboarding, interview-prep run pages) keep
their existing minimal chrome. There is NO sidebar and NO new shell.

Polish the existing nav in place only: retune it to the blue+white tokens, tighten
spacing and the active-tab treatment, keep the same tabs, Create menu, and account
dropdown wired exactly as they are today. Do not add, move, or remove any nav destination.

---

## 4. Color system (blue + white)

Token indirection stays: `utility -> --color-* (@theme inline) -> --token (:root)`. Edit
only the `:root` values in `src/app/globals.css`. Each blue token is an independent copy
(they do not chain to `--primary`), so retune each by hand.

### 4.1 Neutrals — the app's real tokens (KEEP as-is)

The existing neutrals are already clean white / near-white with a neutral bias. Polish
scope KEEPS them; do not swap the neutral palette. Real token names in `globals.css`:

| Token | Light value | Role |
|---|---|---|
| `--background` | `#f6f7f9` | page ground |
| `--card` / `--popover` | `#ffffff` | cards, panels |
| `--foreground` | `#18181b` | primary text |
| `--secondary` | `#f1f2f4` | quiet fills, active tab |
| `--muted-foreground` | `#6b7280` | secondary text |
| `--border` / `--input` | `#e7e8eb` / `#e2e3e7` | hairlines, field borders |
| `--border` | `#e3e8f1` | `#1e2b46` | hairlines, dividers |

### 4.2 Brand + primary

| Token | Light | Dark | Notes |
|---|---|---|---|
| `--primary` | `#2563eb` | `#3b82f6` | main CTA (unchanged hue) |
| `--primary-strong` | `#1d4ed8` | `#93c5fd` | hover/emphasis |
| `--primary-tint` | `#ecf3ff` | `#14223d` | soft fills (icon tiles, banners) |
| `--ring` | `rgba(37,99,235,.32)` | same idea | focus/selection ring |

### 4.3 Folded-in (the strict-blue changes)

| Legacy token | Was | Becomes |
|---|---|---|
| `--ai-from/-to/-text/-solid` | purple `#8b5cf6` to magenta `#d946ef` | blue: from `#4f8bff` -> to `#2563eb`, text `#1d4ed8`, solid `#1d4ed8` (verify white-on-solid >= 4.5:1) |
| `--brand-teal` (avatar/logo) | teal `#0f766e` | navy-blue `#1e40af` (verify white text >= 4.5:1) |
| resume-card AI banner | `#F3F2FF` / `#4F46E5` / `#8B5CF6` | `--primary-tint` + `--primary-strong` (component hardcode; step 2) |

KEPT AS-IS (product-owner decision): the resume-builder completion meter stays its current
orange-to-green motivational ramp (`--progress-*`). Do NOT recolor it to blue.

### 4.4 Semantic (kept — separate from the accent, never the brand hue)

| Token | Light | Meaning |
|---|---|---|
| `--ok` | `#16a34a` | success / complete |
| `--warn` | `#d97706` | caution |
| `--danger` | `#dc2626` | destructive / error (AA on white both ways) |

### 4.5 Data-viz (carve-out)

`--chart-1..5` stay multi-hue — distinguishable, color-blind-safe series need more than
one hue. Anchor single-series charts on blue; document this as the intentional exception.

### 4.6 Contrast requirements (verify, never assert)

| Element | Min ratio |
|---|---|
| Body text (< 24px) | 4.5:1 |
| Large text (>= 24px / 18.66px bold) | 3:1 |
| UI component / graphic boundary | 3:1 |
| Focus indicator | 3:1 |

Gate before shipping any token change: `python ../scripts/validate_contrast.py` (light +
dark), then real-render `node ../scripts/verify_states.mjs` on rendered pages.

### 4.7 Dark mode

Swap at the token level only: `:root` (light) + `@media (prefers-color-scheme: dark)` +
`:root[data-theme="dark"|"light"]` overrides so the in-app toggle wins both directions.
Style components through tokens, never inside the media query. Note: the app is currently
light-only (no `.dark` palette is defined); keep it light-only unless dark mode is
explicitly requested — polish scope does not add it.

---

## 5. Typography

- One UI family: Inter (`--font-sans`) via `next/font`. Display headings: Gabarito
  (`--font-heading`). A mono utility face for numbers that align (counts, scores, prices,
  ranges) — `font-variant-numeric: tabular-nums`.
- Scale (Major Third, existing): 12 / 14 / 16 / 18 / 20 / 24 / 30 / 36 / 48 ...
- Rules: one `h1` per page; never skip heading levels; body line length 45-75ch (65ch
  optimal); headings `line-height: 1.1-1.25`, body `1.5`; weights — 400 body, 500 label,
  600 heading, 700-800 page title only; headings `text-wrap: balance`; uppercase eyebrows
  get letter-spacing.

Standardize the heading treatment across all landings (today they range from no heading
to `text-5xl`): page title `font-heading`, extrabold, ~28-30px, left-aligned, optional
one-line muted subtitle.

---

## 6. Spacing, layout, grid

- 4px base unit; use semantic spacing over raw values; outer padding > element gap >
  element padding; related items sit closer.
- One content container for hub pages: centered, `max-width: 1200px`, `padding: 26px`
  (Jobs and Payment keep their wider two-column / hero content).
- Card radius: 16px standard, 22px for large document cards; 11px controls.
- Elevation: soft two-layer shadow at rest, a deeper shadow on hover/lift.

---

## 7. Components (one vocabulary)

Centralize in `src/components/common` and `src/components/forms` so a change cascades.

- Buttons: `primary` (blue fill, white text), `ghost` (card + border), `quiet`
  (transparent), `danger` (destructive). Sizes sm / default / lg. Consistent role -> one
  variant everywhere; destructive is always the danger variant (trigger and confirm both).
- Card: `rounded-2xl bg-card border border-border shadow`, lift on hover. One idiom for
  document cards, list rows, settings, plans, tiles.
- Action row: promote the 4-variant `ActionButton` from `resume-card.tsx` into a shared
  primitive; replace the single-variant copies in cover-letter and resignation cards.
- Pills/badges: `pill-blue` (primary tint), `pill-ok` (success), `pill-line` (neutral
  outline). Status is text + icon, never color alone.
- Stat tile: icon tile (primary tint), tabular count, label; hover lift; selectable
  (acts as a filter on the dashboard).
- Forms: `input`/`select`/`textarea` — card-2 fill, border, focus ring = `--ring`;
  labels 12px/700; error uses `--danger` + a message (what happened + how to fix).
- Icons: lucide only, inline SVG, `currentColor`, ~16-20px. No emoji anywhere (UI, code,
  copy, comments) — enforced by `scripts/check_no_emoji.py`.

The 8 interactive states are mandatory on every control: default, hover, focus (visible
ring), active, disabled (opacity + no pointer events), loading (spinner + `aria-busy`),
error, selected.

---

## 8. Page-by-page polish (layouts unchanged)

Every page keeps its current layout and interaction model. The list below is the
in-place visual polish only — no re-layout.

- Dashboard (`/dashboard`): keep the current layout (heading + 5 stat tiles + recent
  list). Retune tiles/cards to the blue+white tokens; keep all store + server-merge wiring
  and the delete-confirm dialog.
- Resumes home (`/`): keep the card layout; recolor the AI "Tailor" banner from lavender
  (`#F3F2FF`) to a blue tint; tidy the action-row button styling.
- Resume editor (`/builder`): keep the three panes and Write/Design/Improve tabs; recolor
  the completion meter to the blue ramp; keep the neutral document preview untouched.
- Templates & design (`/builder/template`): keep the gallery; the accent/font controls
  color the DOCUMENT only — leave that behavior and copy as is.
- Jobs (`/jobs`): keep the two-column master/detail; recolor the match rings and save
  toggle to blue; tidy the saved-empty illustration accents.
- Interview prep (`/interview-prep`): keep the picker and run pages exactly; only the
  question cards change color to the blue family (see §9). Technical stays tips-only.
- Cover letters / Resignation: keep the current card lists; recolor accents to blue.
- Account (`/account`): keep the settings-card layout; blue accents; semantic danger zone.
- Payment (`/payment`): keep the hero + plan-card layout; move emerald/Trustpilot UI
  accents to blue (keep the Trustpilot brand mark itself).
- Landing / Login / Onboarding (public): keep their layouts; recolor to blue+white; the
  login error banner moves to `bg-destructive/10 text-destructive`; Google button keeps
  Google's brand mark.

---

## 9. Interview-prep Q/A cards (light blue)

The question cards were an intentional multicolor (purple/cyan/green/teal) set. Per the
product-owner decision they now use a soft LIGHT-BLUE background with DARK text (not deep
gradients), so they sit quietly inside the blue+white app:

- Card background: `Q_GRADIENTS` / `CQ_GRADIENTS` set to `from-[#EEF4FF] to-[#E2ECFF]`
  (one light-blue tint), plus `ring-1 ring-primary/10` for definition.
- Question text: `text-foreground`; coaching tips: `text-foreground/80` with
  `border-primary/15` dividers; sample answer: `bg-primary/10` inset with
  `text-foreground/90`. Skeleton shimmer bars: `bg-primary/*` (dark bars on the light
  card), not white.
- Technical stays tips-only (no sample). The two closing CTA cards ("Take this page with
  you", "That's it - you're ready") stay a deep blue gradient with white text; the old
  purple-pink closing card and the pink "Printable sheet" badge were recolored to blue.
- Dark text on the light-blue tint is well above 4.5:1. All constants live at the top of
  `features/interview-prep/components/interview-prep.tsx`. Live-verified via headless
  render of the screening-call output.

---

## 10. Carve-outs (do not restyle with the app)

- The rendered resume/letter document: `features/resume-builder/components/live-preview.tsx`
  neutrals + inline accents, `src/config/resume-themes.ts` (8 selectable palettes),
  `EDIT_BLUE`, template accent defaults (`config/templates.ts`,
  `cover-letter/lib/templates.ts`, `services/ai/mock.ts`), and the quality-gauge hexes in
  `sections/ai-edit|skills|professional-summary`. These are the printed document's own,
  ATS-neutral colors and the product's multi-theme value.
- Google "G" glyph and the Trustpilot mark keep their brand colors.

---

## 11. Motion

- Durations 100-300ms; never > 500ms. Ease-out entrances, ease-in exits, ease-in-out
  state changes.
- Purpose only: guide attention, show connection, confirm feedback. Card lift on hover,
  screen fade on nav, drawer slide, meter fill.
- Always honor `prefers-reduced-motion`: replace with fade/instant; no parallax or
  autoplay. Tokenize timing/easing (`tokens/motion.json`); never hardcode.

---

## 12. Accessibility (P0 on every component)

- Keyboard: Tab reaches it, Enter/Space activates, Escape closes overlays, focus returns
  to trigger after a modal closes; visible focus ring (>= 3:1).
- Screen reader: name, role, state announced; landmarks and labels present.
- Target size >= 24x24px (44x44 for primary touch actions).
- Never color alone: pair with icon + text.
- Sticky topbar must not obscure a focused element (WCAG 2.4.11).
- Gates: `node ../scripts/axe_audit.mjs`, `verify_states.mjs` (+`--dark`),
  `verify_focustrap.mjs` for modals, `verify_rtl.mjs` if logical props change.

---

## 13. Responsive

Mobile-first; no horizontal overflow at 280 / 320 / 414px. Keep the existing responsive
behavior; the polish must not regress it. Stat grid 5 -> 2 -> 1; editor and jobs collapse
to a single column at their current breakpoints; two-column heroes
stack. Gate: `node ../scripts/verify_responsive.mjs src/app`.

---

## 14. Single-theme consistency (non-negotiable)

One shared token layer imported once at the app root; every page references the same
semantic tokens; no page defines its own colors. Zero hardcoded hex/px/timing in
component/page code (adapter theme-config into a 3rd-party API is the only exception).
Switching brand/theme = editing the `:root` source once. A page that "looks different" is
a bug that bypassed the theme.

Lint/verify: `scripts/lint_hardcodes.py`, `scripts/validate_theme_refs.py`,
`scripts/validate_contrast.py`.

---

## 15. Implementation order (polish only)

1. Palette — retune `src/app/globals.css` `:root` to sections 4.1-4.5 (fold purple AI /
   teal / progress into blue+white); run contrast. This alone re-skins most of the app in
   place because everything is token-driven.
2. Tokenize stray hardcodes so the retune actually reaches them: login error banner, the
   emerald ATS/promo badges, the lavender AI banner on resume cards, jobs/payment accents.
3. Interview-prep cards -> blue family (section 9) — color only, layout unchanged.
4. Component-consistency polish on the existing primitives (`common/*`, `forms/*`) and the
   existing `top-nav` — spacing, shadow, radius, focus rings, active-tab styling. No new
   components, no layout moves. Eyeball `/style-guide`.
5. Per-page visual pass (section 8) — in place, no re-layout.
6. Verify + docs: `tsc --noEmit`, `npm run build`, `npm run test:run`, `check_no_emoji.py`,
   contrast/a11y/responsive gates, render-and-look on every page, confirm the resume PDF
   export is unchanged. Update `CLAUDE.md` + `README.md`.

Guardrails: no route/URL/API/layout/workflow change; polish in place only; never
`git add -A`; keep held LinkedIn work out; this is a customized Next.js — read
`node_modules/next/dist/docs/` before any framework-level change.

---

## 16. Definition of done (per surface)

Functional (unchanged — same layout, states, and workflow) · visual (tokens only,
responsive, dark mode) · accessible (keyboard, SR, contrast, target size) · consistent
(one token theme, one component vocabulary, semantic-correct color) · verified (gates
green, rendered and clicked, PDF carve-out intact, no route/behavior change). A number is
only stated after a gate produced it.
