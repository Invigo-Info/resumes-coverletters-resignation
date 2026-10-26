# Evidence

Traceability for every significant finding in this extraction.

**Source of evidence.** The Claude Design Harness is written for
reverse-engineering a reference website from screenshots and computed CSS. This
extraction had something better: the source tree itself. A token declared in
`src/app/globals.css` is a fact, not an inference from rendered pixels.

That shifts what is uncertain. Values are near-certain; **rendered behaviour is
not assessed at all**. Nothing in this directory was verified in a browser, at
any viewport, with any assistive technology, or against any measurement tool.

| Context | Value |
| --- | --- |
| Branch | `handover/production-readiness` |
| Commit | `e33d287` |
| Date | 26 Oct 2026 |
| Mode | EXTRACT |
| Primary source | `src/app/globals.css` (521 lines) |
| Method | Source reading plus usage counting across `src` |
| Not used | Browser rendering, screenshots, computed styles, devtools |

---

## Finding 1 - Single source of truth for color

**Source:** `src/app/globals.css:98-190`; absence of hex literals in components.

**Observed:** All color resolves through `:root` custom properties, mapped into
Tailwind through `@theme inline`. Components reference semantic names
(`bg-primary`, `text-muted-foreground`) or token functions
(`bg-(--brand-blue)`).

**Normalized:** Keep as the system's defining rule.

**Confidence:** HIGH.

**Notes:** This discipline is the system's main asset and the reason the whole
palette could be swapped from one file during the blue+white redesign.

---

## Finding 2 - Primary blue is two values, deliberately

**Source:** `globals.css:122-130`; `components/common/button.tsx:12,14,17`.

**Observed:** `--brand-blue #1A91F0` (filled button fill) and
`--primary #1170CD` (everything else: text, links, borders, outline buttons).

**Normalized:** Two tokens, not one. Do not collapse them.

**Confidence:** HIGH.

**Notes:** The source records the reason in a comment: white on `#1A91F0` is
3.31:1, below WCAG AA 4.5:1, and this is an accepted deviation **scoped to the
button fill only**. `#1170CD` at 4.97:1 is the AA-safe value for all text use.
An auditor who flags this without reading the comment will "fix" an intentional
decision.

---

## Finding 3 - Type scale overrides Tailwind at every step

**Source:** `globals.css:77-91` (`@theme` block).

**Observed:** `--text-base: 18px` with a roughly 1.2 ratio; every step is
2-3px above Tailwind's default.

**Normalized:** Base-18 scale, line heights left to Tailwind's unitless
defaults so they scale with the sizes.

**Confidence:** HIGH.

**Notes:** The source comment states "spacing, radii and fixed-px values are
unchanged" - so only type was rescaled. That asymmetry is intentional.

---

## Finding 4 - Radius scale is bypassed by 185 usages

**Source:** `globals.css:63-69` for the scale; `grep -rhoE "rounded-..."` across
`src` for usage.

**Observed:**

| Class | Count |
| --- | --- |
| `rounded-full` | 151 |
| `rounded-2xl` | 142 |
| `rounded-[10px]` | **119** |
| `rounded-xl` | 117 |
| `rounded-lg` | 103 |
| `rounded-[6px]` | **66** |
| `rounded-md` | 26 |
| `rounded-3xl` | 12 |

The declared scale computes to 7.2 / 9.6 / 12 / 16.8 / 21.6 / 26.4 / 31.2px
from `--radius: 0.75rem`.

**Normalized:** Promote `6px` and `10px` to real tokens rather than migrating
185 usages onto the multiplier scale.

**Confidence:** HIGH on counts, MEDIUM on the recommendation.

**Notes:** 10px falls between `--radius-md` (9.6px) and `--radius-lg` (12px);
6px falls just under `--radius-sm` (7.2px). Neither has a clean home. The
arbitrary values are the de facto system; the multiplier scale is aspirational.

---

## Finding 5 - Elevation vocabulary is split

**Source:** `globals.css:303-315`; usage counts across `src`.

**Observed:** `shadow-sm` 93 (Tailwind stock), `shadow-card` 87 (custom),
`shadow-card-lg` 41 (custom), `shadow-lg` 7, `shadow-md` 5, `shadow-none` 5.

**Normalized:** Pick one vocabulary. Either replace stock `shadow-sm` with
`.shadow-card`, or formally admit `shadow-sm` as the system's small step.

**Confidence:** HIGH on counts, MEDIUM on which direction to resolve.

**Notes:** Stock `shadow-sm` is a single-layer shadow; the custom utilities are
two-layer. They are visually different treatments doing the same job.

---

## Finding 6 - Purple is semantic, not decorative

**Source:** `globals.css:155-160`; `.bg-gradient-ai` and `.text-gradient-ai`.

**Observed:** `--ai-from #7B61FF`, `--ai-to`/`--ai-text`/`--ai-solid #6247E0`,
with a comment distinguishing graphic use (bright) from text use (AA-safe).

**Normalized:** Purple means "machine-generated". Treat as a reserved signal.

**Confidence:** HIGH on values, MEDIUM on the strength of the semantic rule -
it is strongly implied by naming and the carve-out but never stated as policy.

---

## Finding 7 - Progress ramp is motivational, not neutral

**Source:** `globals.css:173-190`.

**Observed:** Five stages climbing `#F6A21E` amber to `#21A45D` green, with a
source comment calling it "a motivational climb".

**Normalized:** Keep the ramp. A flat progress color would lose the intent.

**Confidence:** HIGH on values, HIGH on intent (stated in source).

---

## Finding 8 - Motion is global and reduced-motion-gated

**Source:** `globals.css:326-440`.

**Observed:** Page entrance `0.45s cubic-bezier(0.22,1,0.36,1)`; card scroll
rise 28px via `animation-timeline: view()` guarded by `@supports`; hover lift
`-3px` for interactive cards only; universal `0.18s` interactive transition.
All displacement inside `prefers-reduced-motion: no-preference`.

**Normalized:** Keep the positive guard pattern.

**Confidence:** HIGH on declarations, LOW on rendered timing (not profiled).

**Notes:** The `@supports` guard matters - it is what prevents content being
left invisible in browsers without scroll timelines, the classic scroll-reveal
failure.

---

## Finding 9 - Effectively a two-breakpoint system

**Source:** breakpoint prefix counts across `src`.

**Observed:** `sm:` 258, `lg:` 68, `md:` 7, `xl:` 7, `2xl:` 0.

**Normalized:** Treat as mobile / `sm` / `lg`. Do not add breakpoints without
a reason.

**Confidence:** HIGH on counts, MEDIUM on the characterisation, LOW on whether
it actually works - no viewport testing was done.

**Notes:** The practical consequence is that 768-1024px (portrait tablets)
inherits phone rules.

---

## Finding 10 - Form fields brighten on focus

**Source:** `forms/input.tsx:13`, `forms/textarea.tsx`, `forms/select.tsx`.

**Observed:** Resting fill `--field-resting #FAFBFD`; on focus the fill
switches to `--card` white, plus `border-ring` and `ring-3 ring-ring/40`.

**Normalized:** Keep. Consistent across all three field primitives.

**Confidence:** HIGH.

---

## Finding 11 - Type size steps down, not up, on forms

**Source:** `text-base md:text-sm` on Input, Textarea and Select.

**Observed:** 18px on mobile, 16px from 768px.

**Normalized:** Keep. This prevents iOS Safari zooming on focus, which happens
below 16px.

**Confidence:** HIGH on the declaration, MEDIUM on the intent - the reasoning
is not stated in source, but the pattern is a well-known iOS accommodation and
no other explanation fits a downward step.

---

## Finding 12 - Dark mode is wired but empty

**Source:** `globals.css:5` (`@custom-variant dark`); `dark:` classes in
button, input, textarea, select.

**Observed:** The variant and the classes exist. **No dark palette is declared
anywhere.**

**Normalized:** Either build the palette or remove the classes.

**Confidence:** HIGH.

**Notes:** Deliberately not invented in `variables.css` or
`tailwind-theme.css`. Generating a plausible dark palette is exactly the
guessing this extraction forbids.

---

## Finding 13 - Token naming inconsistencies

**Source:** `globals.css:153` and `globals.css:206`.

**Observed:**

| Issue | Detail |
| --- | --- |
| `--brand-teal` | Value is `#1e40af`, a deep navy. Not teal. |
| Body color | `#27272a` on `body`, while `--foreground` is `#1E2532`. |

**Normalized:** Rename the first to something true (`--avatar-navy`);
reconcile the second to `--foreground`.

**Confidence:** HIGH.

**Notes:** The body color is the one place a literal hex escapes the token
layer for a core surface.

---

## Finding 14 - Semantic color living outside the token layer

**Source:** `features/jobs/lib/keyword-match.ts`.

**Observed:** The jobs fair-match ring is score-banded (amber for fair, green
for strong) through a `ringTheme` helper in feature code, not through a CSS
token.

**Normalized:** Acceptable, but record it - a token-level audit will miss it.

**Confidence:** HIGH that it exists; not visually verified.

---

## Finding 15 - No aspect-ratio system

**Source:** `grep -rhoE "aspect-[a-z0-9/\[\]]+" src` returns nothing.

**Observed:** Zero `aspect-*` utilities in the entire codebase. Template
preview proportions come from the thumbnail assets themselves.

**Normalized:** None available. If images gain prominence, this must be
designed.

**Confidence:** HIGH.

---

## Finding 16 - Document fonts are carved out of the UI system

**Source:** `src/app/layout.tsx:53-62`; `src/config/resume-themes.ts`.

**Observed:** Roboto Flex, EB Garamond, IBM Plex Sans and IBM Plex Serif load
with `preload: false` and serve resume document templates only. App chrome uses
Inter and Gabarito exclusively.

**Normalized:** Keep the carve-out. Document typography is a separate system.

**Confidence:** HIGH.

---

## What this extraction did not assess

Recorded explicitly so nothing here is mistaken for verified:

| Not assessed | Why it matters |
| --- | --- |
| Rendered contrast | Ratios are quoted from source comments, not re-measured |
| Responsive behaviour | No viewport was tested; see `RESPONSIVE.md` risks |
| Accessibility outcomes | No audit tool run; findings are structural only |
| Motion in a browser | No profiling; timings are declarations |
| Visual QA | No screenshots taken or compared |
| Performance | No bundle, paint or layout-shift measurement |
| Dark mode | Cannot be assessed - no palette exists |
| Print and PDF output | Print styles exist but were not rendered |

A follow-up pass with Playwright (already installed, currently unused) would
convert most of these from LOW to HIGH confidence.
