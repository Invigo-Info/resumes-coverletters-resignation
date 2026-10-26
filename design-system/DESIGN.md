# Design System

Extracted from the `resume-co` source tree on branch `handover/production-readiness`
at commit `e33d287`, 26 Oct 2026. Harness: Claude Design Harness, MODE = EXTRACT.

> **Evidence note.** The harness is written for reverse-engineering a reference
> website from screenshots and computed CSS. Here the reference *is* the source
> tree, so most findings are read directly from declarations rather than inferred
> from rendered output. That raises baseline confidence: a token declared in
> `src/app/globals.css` is a fact, not an observation. What stays uncertain is
> rendered behaviour (actual contrast on screen, responsive results, motion
> timing in a browser), which is marked accordingly.

---

## 1. Executive Summary

A single-theme, token-driven system for an AI career toolkit (resume builder,
cover and resignation letters, job search, interview prep). Everything visual
derives from one `:root` layer in `src/app/globals.css`; no component carries a
hardcoded brand hex.

The character is **utility software that wants to feel reassuring**: a light gray
page, white cards with soft two-layer elevation, a confident blue primary, and
generous 18px base type. It is not a marketing aesthetic applied to an app - the
type scale, field geometry and card rhythm are built for long editing sessions.

Three decisions define it:

1. **Blue carries identity, purple carries AI.** The product blue (`#1A91F0` /
   `#1170CD`) owns navigation, primaries and focus. A separate purple
   (`#7B61FF` / `#6247E0`) marks AI-generated surfaces, so users can see which
   parts of the product are machine-authored.
2. **Contrast is an explicit, documented tradeoff.** The token layer records
   measured contrast ratios inline and names one deliberate WCAG deviation
   (the filled-button fill). This is unusually disciplined and should be
   preserved.
3. **Motion is global and opt-out, not per-component.** Page entrance, card
   scroll-reveal and hover transitions are declared once in `globals.css` and
   apply app-wide, entirely behind `prefers-reduced-motion`.

**Stack:** Tailwind CSS v4 (`@theme` / `@theme inline` in CSS, no
`tailwind.config.js`), shadcn-style primitives over Base UI, `framer-motion` for
six components, `next/font/google` for type.

---

## 2. Design Character

| Dimension | Reading |
| --- | --- |
| Temperature | Cool. Neutrals are blue-biased (`#F4F5F8` page, `#1E2532` ink), never warm gray. |
| Density | Comfortable, not dense. 18px base, `h-8` (32px) controls, 12px default radius. |
| Elevation | Soft and layered. Two-shadow stacks at low opacity, never a single hard drop. |
| Geometry | Rounded throughout. `rounded-full` and `rounded-2xl` are the two most used radii. |
| Contrast | Moderate. Ink on white is strong; secondary text deliberately softened to `#5E6B7E`. |
| Voice | Encouraging. The progress ramp climbs amber to green rather than staying neutral. |

**What it is not:** not brutalist, not flat, not high-contrast, not dark-first,
not a gradient-heavy marketing page. Gradients exist but are reserved for brand
moments (logo, AI surfaces, progress) rather than used as decoration.

---

## 3. Evidence Quality

| Area | Confidence | Basis |
| --- | --- | --- |
| Color tokens | HIGH | Declared literally in `globals.css:98-190`, with inline contrast notes |
| Type scale | HIGH | Declared in a `@theme` block, `globals.css:77-91` |
| Radius scale | HIGH | Computed from `--radius` in `@theme inline`, `globals.css:63-69` |
| Shadows | HIGH | Two named utilities with literal values, `globals.css:303-315` |
| Motion | HIGH | Keyframes, durations and easings declared, `globals.css:336-430` |
| Component geometry | HIGH | Read from `cva` variants and `className` strings |
| Usage frequency | HIGH | Counted across the `src` tree |
| Spacing scale | MEDIUM | Tailwind v4 defaults, not overridden; inferred not declared |
| Breakpoints | MEDIUM | Tailwind v4 defaults; only the prefixes used were counted |
| Rendered contrast | MEDIUM | Ratios are quoted from source comments, not re-measured here |
| Responsive result | LOW | No viewport testing was performed this pass |
| Accessibility result | LOW | No audit tool was run; findings are structural only |

---

## 4. Color System

Single light theme. A `.dark` variant is wired (`@custom-variant dark`) and a few
components carry `dark:` classes, but no dark palette is defined, so dark mode is
**not usable** today.

### Primitive brand colors

| Token | Value | Role |
| --- | --- | --- |
| `--brand-blue` | `#1A91F0` | Bright blue: filled button fill, gradient, focus ring |
| `--brand-blue-dark` | `#1170CD` | White-text-safe blue: text, links, borders |
| `--brand-blue-soft` | `#E8F4FE` | Tint: icon tiles, chips, hover washes |
| `--brand-purple` | `#7B61FF` | AI accent and gradient partner |
| `--success` | `#21A45D` | Checks, completion, Pro badge |
| `--success-soft` | `#E8F5EC` | Success wash |
| `--destructive` | `#DC2626` | Danger |
| `--destructive-soft` | `#FBEAEA` | Danger hover wash |
| `--text-mute` | `#9AA6B8` | Eyebrows, timestamps |
| `--field-resting` | `#FAFBFD` | Input resting fill |

### Semantic surfaces and text

| Token | Value | Role |
| --- | --- | --- |
| `--background` | `#F4F5F8` | Page ground |
| `--foreground` | `#1E2532` | Body text |
| `--card` / `--popover` | `#ffffff` | Raised surfaces |
| `--card-foreground` | `#111418` | Headings ink |
| `--primary` | `#1170CD` | Primary text, links, borders (white 4.97:1) |
| `--primary-strong` | `#0E63A8` | Hover fill and border (white 6.0:1) |
| `--secondary` / `--muted` | `#F1F4F9` | Field and pill gray |
| `--muted-foreground` | `#5E6B7E` | All secondary text |
| `--accent` | `#E8F4FE` | Hover and tile tint |
| `--accent-foreground` | `#0F5FB0` | AA-safe text on that tint (4.5:1) |
| `--border` | `#E7EAF0` | Hairlines |
| `--input` | `#DFE3EA` | Input resting border |
| `--ring` | `#1A91F0` | Focus ring (graphic 3:1) |

### Semantic families

- **AI surfaces:** `--ai-from #7B61FF`, `--ai-to #6247E0`, `--ai-text #6247E0`,
  `--ai-solid #6247E0`. Gradients use the bright purple; anything carrying text
  uses `#6247E0`, which is AA-safe in both directions.
- **Logo mark:** `--logo-from #4CB0FF` to `--logo-to #1A91F0`.
- **Icon tiles:** a strong pair (`#4CB0FF` to `#1A91F0`) and a soft pair
  (`#8CCBFF` to `#4CB0FF`).
- **Progress ramp:** `--progress-low #F6A21E`, `--progress-early #F0AE1F`,
  `--progress-mid #C7D22B`, `--progress-high #35B558`, `--progress-done #21A45D`.
  A motivational climb from amber to green, not a neutral bar.
- **Charts:** five hues (`#1A91F0`, `#14b8a6`, `#f59e0b`, `#7B61FF`, `#ef4444`).
  A deliberate multi-hue exception to the blue system, correct for data viz.
- **Sidebar:** its own eight-token set, all mapping onto the same values.
- **Avatar mark:** `--brand-teal #1e40af` (named teal, actually deep navy -
  a naming inconsistency worth fixing, see section 18).

### Documented contrast position

The source records these measurements and one accepted deviation:

| Pair | Ratio | Status |
| --- | --- | --- |
| White on `#1170CD` | 4.97:1 | Passes AA |
| White on `#0E63A8` | 6.0:1 | Passes AA |
| `#0F5FB0` on `#E8F4FE` | 4.5:1 | Passes AA |
| White on `#1A91F0` (filled button fill) | 3.31:1 | **Below AA, accepted** |
| `--ring` `#1A91F0` as graphic | 3:1 | Passes AA for non-text |

Confidence HIGH that these are the intended positions; MEDIUM that they are the
true rendered ratios, since they are quoted from source comments and were not
re-measured in this pass.

---

## 5. Typography

**Families** (all via `next/font/google`, `display: swap`):

| Variable | Family | Role |
| --- | --- | --- |
| `--font-sans` | Inter | Body and UI |
| `--font-heading` | Gabarito | Headings, via the `.font-heading` utility |
| `--font-geist-mono` | Geist Mono | Mono |

Additional families are loaded with `preload: false` for **resume document
templates only** (Roboto Flex, EB Garamond, IBM Plex Sans, IBM Plex Serif). These
belong to the user's document, not the app chrome, and must not leak into UI.

**Scale.** Every Tailwind `text-*` utility is overridden to a base-18, roughly
1.2-step scale - about 2-3px larger than stock at every step:

| Token | Value | Token | Value |
| --- | --- | --- | --- |
| `--text-xs` | 14px | `--text-3xl` | 33px |
| `--text-sm` | 16px | `--text-4xl` | 39px |
| `--text-base` | **18px** | `--text-5xl` | 51px |
| `--text-lg` | 21px | `--text-6xl` | 63px |
| `--text-xl` | 23px | `--text-7xl` | 75px |
| `--text-2xl` | 27px | `--text-8xl` | 99px |

Line heights keep Tailwind's unitless defaults, so they scale with the sizes.

**Body defaults:** `18px / 400`, color `#27272a`, antialiased, with
`font-kerning`, `font-optical-sizing` and `font-variation-settings` all set
explicitly. The explicit body `color: #27272a` sits slightly off `--foreground`
`#1E2532`, which is an inconsistency (section 18).

**Eyebrow label** (`.eyebrow`): 11px, weight 700, `letter-spacing: 0.16em`,
uppercase, `--text-mute`. The one strongly styled micro-label in the system.

---

## 6. Spacing

No spacing scale is declared, so Tailwind v4's default applies:
`--spacing: 0.25rem` with utilities as multiples (`p-2` = 8px, `p-4` = 16px).

Confidence MEDIUM - inferred from the absence of an override, not from a
declaration. Component padding is expressed in those multiples
(`px-2.5` = 10px, `py-1.5` = 6px), which is consistent with the default scale.

---

## 7. Layout

- **Page ground:** `--background #F4F5F8` with white cards floating on it.
- **Scrollbar gutter reserved** (`scrollbar-gutter: stable` on `html`) so pages
  of differing height never shift sideways. A deliberate stability choice.
- **App shell:** a left sidebar (`dashboard-shell.tsx`) with its own token set,
  wrapping all five section dashboards.
- **Content width:** the recurring authenticated container is
  `mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8`.

Observed `max-w-*` frequency: `max-w-md` 40, `max-w-5xl` 14, `max-w-sm` 12,
`max-w-6xl` 12, `max-w-xl` 11, `max-w-2xl` 11, `max-w-3xl` 7, `max-w-lg` 6.
The `max-w-md` dominance reflects forms and dialogs, not page width.

---

## 8. Grid

No custom grid system is defined. Layout uses Tailwind flex and grid utilities
per component. There is no 12-column abstraction and none is needed.

---

## 9. Borders

One hairline weight and one emphasis weight:

- **Hairline:** `1px solid --border #E7EAF0`, the default for cards and dividers.
  Applied globally through `@layer base { * { @apply border-border ... } }`.
- **Input resting:** `1px solid --input #DFE3EA`, slightly darker than a hairline.
- **Emphasis:** `1.5px`, used only by outline and destructive buttons, so an
  outlined control reads as deliberate rather than as a hairline box.

---

## 10. Radius

`--radius: 0.75rem` (12px) is the root. The `@theme inline` block derives a
multiplier scale from it:

| Token | Multiplier | Computed |
| --- | --- | --- |
| `--radius-sm` | 0.6 | 7.2px |
| `--radius-md` | 0.8 | 9.6px |
| `--radius-lg` | 1.0 | 12px |
| `--radius-xl` | 1.4 | 16.8px |
| `--radius-2xl` | 1.8 | 21.6px |
| `--radius-3xl` | 2.2 | 26.4px |
| `--radius-4xl` | 2.6 | 31.2px |

**Observed usage across `src`:** `rounded-full` 151, `rounded-2xl` 142,
`rounded-[10px]` 119, `rounded-xl` 117, `rounded-lg` 103, `rounded-[6px]` 66,
`rounded-md` 26, `rounded-3xl` 12, then a long tail of one-off pixel values
(`8px`, `5px`, `2px`).

This is the system's clearest tension: **185 of the radius usages are arbitrary
pixel values that bypass the scale** (`rounded-[10px]` and `rounded-[6px]`
together). 10px sits between `--radius-md` (9.6px) and `--radius-lg` (12px);
6px sits just under `--radius-sm` (7.2px).

**Normalization recommendation:** adopt 6px and 10px as real tokens
(`--radius-xs: 6px`, `--radius-sm: 10px`) rather than rounding 185 usages onto
the multiplier scale. The arbitrary values are the de facto system; the
multiplier scale is the aspiration. Confidence HIGH on the counts, MEDIUM on the
recommendation.

---

## 11. Shadows

Two named elevation utilities, both two-layer and low-opacity on a blue-black:

```css
.shadow-card {
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04),
              0 8px 24px rgba(16, 24, 40, 0.06);
}
.shadow-card-lg {
  box-shadow: 0 4px 12px rgba(16, 24, 40, 0.06),
              0 18px 40px rgba(16, 24, 40, 0.10);
}
```

A third appears inline on hover in `.card-trace`:
`0 10px 26px rgba(30, 37, 50, 0.1)`.

**Observed usage:** `shadow-sm` 93, `shadow-card` 87, `shadow-card-lg` 41,
`shadow-lg` 7, `shadow-none` 5, `shadow-md` 5. Tailwind's stock `shadow-sm` is
used as often as the custom system, which dilutes it (section 18).

---

## 12. Components

Full documentation in `COMPONENTS.md`. Summary of the primitives:

| Component | Geometry |
| --- | --- |
| Button | `rounded-[6px]`, `h-8` default, `text-sm`, `font-semibold`, 8 variants, 8 sizes |
| Input | `h-8`, `rounded-[8px]`, `--field-resting` fill, 3px focus ring at 40% |
| Chip | `rounded-full`, `px-3 py-1.5`, `text-sm`, selected and removable variants |
| Card | White, hairline border, `.shadow-card`, radius by context |
| PageHead | Section dashboard header, pairs with `.eyebrow` |

---

## 13. Images

No image optimization system is configured beyond Next.js defaults. Assets in
`public/` are SVG illustrations, resume template thumbnails and interview-prep
art. One `<img>` escapes `next/image` (flagged by `@next/next/no-img-element`).

No art direction rules, aspect-ratio tokens or image treatment conventions are
defined anywhere in the source.

---

## 14. Gallery

See `GALLERY.md`. In short: this product has **no image gallery** in the sense
the harness anticipates (no lightbox, no masonry, no pagination). The nearest
equivalents are the resume template picker and the jobs list, both documented
there rather than invented into a gallery spec.

---

## 15. Responsive Behavior

See `RESPONSIVE.md`. Breakpoints are Tailwind v4 defaults; the system is
effectively **two-breakpoint in practice**: `sm:` (258 usages) and `lg:` (68),
with `md:` (7) and `xl:` (7) near-unused.

---

## 16. Motion

See `MOTION.md`. Three global behaviours - page entrance, card scroll-reveal,
universal interactive transition - declared once and gated behind
`prefers-reduced-motion: no-preference`.

---

## 17. Accessibility

**Structurally present:**

- Focus is never removed: `outline-none` is always paired with a
  `focus-visible:ring-3` ring at `--ring` 40-50%.
- Global `outline-ring/50` baseline in `@layer base`.
- Contrast ratios measured and recorded at the token layer.
- All motion behind `prefers-reduced-motion`.
- Chips expose `aria-pressed`; buttons carry `aria-invalid` and
  `aria-expanded` styling.

**Gaps (structural observation, not an audit):**

- No skip-to-content link in `src/app/layout.tsx`.
- One accepted AA failure: white on `#1A91F0` at 3.31:1 for filled button fills.
- One `jsx-a11y/role-supports-aria-props` lint error outstanding.
- No dark palette despite `dark:` classes being present.
- No audit tool has ever been run against this UI.

Confidence LOW on rendered accessibility. Treat this section as a list of what
the code provides, not as a verdict.

---

## 18. Design Anti-Rules

Rules this system has chosen. Violating them makes the product look wrong.

1. **Never hardcode a brand hex in a component.** Everything resolves through
   `:root`. This is currently honoured with near-perfect discipline.
2. **Never use purple for a non-AI surface.** Purple is a semantic signal that
   content was machine-generated.
3. **Never let document fonts into app chrome.** EB Garamond, IBM Plex and
   Roboto Flex belong to resume templates only.
4. **Never give the progress bar a flat color.** The amber-to-green climb is
   motivational and intentional.
5. **Never use a single hard drop shadow.** Elevation is always two layers at
   low opacity.
6. **Never animate without a reduced-motion guard.**
7. **Never remove a focus outline without replacing it with a ring.**
8. **Charts are the one multi-hue exception.** Do not force them blue.

**Known inconsistencies to resolve rather than propagate:**

- `--brand-teal` is `#1e40af`, a deep navy. The name is wrong.
- Body `color: #27272a` does not match `--foreground: #1E2532`.
- `shadow-sm` (93) competes with `shadow-card` (87) for the same job.
- 185 arbitrary radius values sit outside the declared scale.
- Dark-mode classes exist with no dark palette behind them.

---

## 19. Observed vs Inferred

**Observed (read directly from source):** every color token and its value, the
type scale, the radius multipliers, both shadow stacks, all motion keyframes
durations and easings, component geometry, font loading, and all usage counts.

**Inferred (reasoned, not declared):** the spacing scale (Tailwind v4 default,
not overridden), the breakpoint values (same), the character reading in section
2, the normalization recommendation in section 10, and the intent behind the
progress ramp (supported by source comments but still an interpretation).

**Not assessed:** rendered contrast, real responsive behaviour, real motion
timing in a browser, accessibility outcomes, and performance of any kind.

---

## 20. Implementation Guidance

1. **Keep `globals.css` as the single source.** The discipline here is the
   system's main asset. A new component takes tokens; it never introduces a hex.
2. **Promote the two arbitrary radii to tokens** rather than normalizing 185
   usages onto the multiplier scale. Match the system to reality.
3. **Pick one elevation vocabulary.** Replace stock `shadow-sm` with
   `.shadow-card` or formally admit `shadow-sm` as the system's small step.
4. **Either build the dark palette or remove the `dark:` classes.** Half-wired
   dark mode will eventually ship broken.
5. **Rename `--brand-teal`** to something true, such as `--avatar-navy`.
6. **Reconcile the body color** with `--foreground`.
7. **Add a skip link** before the accessibility pass (R5 in the launch worklist).
8. **Do not introduce a CSS-in-JS layer or a second token source.** Tailwind v4
   plus this `:root` layer is sufficient and already coherent.

Files in this directory: `tokens.json` (machine-readable), `variables.css`
(framework-free), `tailwind-theme.css` (v4 `@theme` form), plus `COMPONENTS.md`,
`MOTION.md`, `RESPONSIVE.md`, `GALLERY.md` and `EVIDENCE.md`.
