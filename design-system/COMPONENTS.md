# Components

Extracted from the `resume-co` source tree, commit `e33d287`, 26 Oct 2026.
Geometry is read from `cva` variant definitions and `className` strings, so
values are declarations rather than measurements. Confidence is HIGH for
geometry and color, LOW for rendered responsive and accessibility behaviour,
which was not tested this pass.

Primitives live in `src/components/{common,forms,layout}`. Feature components
live under `src/features/*/components`. The split matters: anything in
`components/` is feature-agnostic and safe to reuse.

---

## Button

`src/components/common/button.tsx` - Base UI primitive with `cva` variants.

**Purpose.** Every action in the product. Carries the system's one accepted
contrast deviation.

**Structure.** `inline-flex` centred, `rounded-[6px]`, `border` always present
(transparent when unused, so variants can add a border without shifting
layout), `bg-clip-padding`, `text-sm`, `font-semibold`, `whitespace-nowrap`.
Icons are auto-sized by a descendant selector (`size-4` default, `size-3` and
`size-3.5` at smaller sizes) rather than requiring a prop.

**Variants.**

| Variant | Treatment |
| --- | --- |
| `default` | Fill `--brand-blue` `#1A91F0`, white text, `shadow-sm`, hover to `--primary` |
| `cta` | As default with `shadow-lg shadow-primary/25` - a lifted hero action |
| `outline` | White fill, **1.5px** `--primary` border, primary text, `--accent` hover |
| `secondary` | `--secondary` fill, hover darkens via `color-mix(in oklch, ..., 5%)` |
| `ghost` | Transparent, `--muted` hover |
| `destructive` | **1.5px** `--destructive/50` border, red text, `--destructive-soft` hover wash |
| `link` | Primary text, `underline-offset-4`, underline on hover |

**Sizes.** `xs` h-6, `sm` h-7, `default` h-8, `lg` h-9, plus square
`icon-xs` / `icon-sm` / `icon` / `icon-lg` (size-6 through size-9). Smaller
sizes override radius with `rounded-[min(var(--radius-md), 10px)]` and
`...12px)]`, clamping so the radius never exceeds the control.

**States.** `focus-visible` sets `border-ring` plus `ring-3 ring-ring/50`;
`active` nudges `translate-y-px` (suppressed on menu triggers via
`active:not-aria-[haspopup]`); `disabled` is `pointer-events-none opacity-50`;
`aria-invalid` and `aria-expanded` both carry styling.

**Notable decision.** Filled buttons use the bright `#1A91F0` rather than the
AA-safe `#1170CD`, putting white text at 3.31:1. The source documents this as a
deliberate, scoped exception for the fill only. Hover resolves to `--primary`,
which does pass. Do not "fix" this without checking with design - it is
recorded as intentional.

Confidence HIGH.

---

## Input

`src/components/forms/input.tsx`

**Structure.** `h-8`, full width, `rounded-[8px]`, `border border-input`
`#DFE3EA`, fill `--field-resting` `#FAFBFD`, `px-2.5 py-1`, `text-base`
dropping to `md:text-sm`.

**States.**

| State | Treatment |
| --- | --- |
| Rest | `--field-resting` fill, `--input` border |
| Hover | `border-primary/40` |
| Focus | `border-ring`, **fill switches to `--card` white**, `ring-3 ring-ring/40` |
| Disabled | `bg-input/50`, `opacity-50`, `cursor-not-allowed` |
| Invalid | `border-destructive`, `ring-3 ring-destructive/20` |

**Notable decision.** The resting fill is a tint and the focused fill is white.
The field brightens as you enter it, which reads as the field "opening". This
is a small, good detail worth preserving.

Confidence HIGH.

---

## Textarea

`src/components/forms/textarea.tsx`

Matches Input exactly in color, border, radius and state behaviour. Differs
only in box: `min-h-16`, `py-2` instead of `py-1`, and
`field-sizing-content` so it grows with content rather than scrolling.

Confidence HIGH.

---

## Select

`src/components/forms/select.tsx`

**Trigger.** Shares the field vocabulary - `rounded-[8px]`, `border-input`,
`--field-resting` fill, same hover, focus and invalid states. Sizes via data
attributes: `data-[size=default]` h-8, `data-[size=sm]` h-7 with a clamped
`rounded-[min(var(--radius-md), 8px)]`. Placeholder text uses
`data-placeholder:text-muted-foreground`.

**Popup.** `rounded-lg` (12px), `bg-popover`, `shadow-md`,
`ring-1 ring-foreground/10`, `min-w-36`, width bound to the anchor via
`w-(--anchor-width)` and height to `max-h-(--available-height)`.

**Motion.** Directional entrance driven by `data-[side=*]` - the popup slides
in from the side it is anchored against, with `fade-in-0 zoom-in-95` on open
and the inverse on close, over `duration-100`. This comes from
`tw-animate-css`, not hand-written keyframes.

Confidence HIGH.

---

## Chip

`src/components/common/chip.tsx`

**Purpose.** Selectable pill for search preferences, keyword picking and
filters. Feature-agnostic by design.

**Structure.** `rounded-full`, `px-3 py-1.5`, `text-sm font-medium`,
`gap-1.5`, `whitespace-nowrap`.

**Variants.** Default (`--border` border, white fill, `--foreground` text,
hover `border-primary/40` and `bg-accent/50`) and selected (`--primary` border,
`--accent` fill, `--primary` text). An optional `onRemove` adds a trailing
dismiss affordance.

**Accessibility.** Renders as a real `<button type="button">` with
`aria-pressed` reflecting selection - a toggle, correctly announced. Focus is
`ring-3 ring-ring/40`.

Confidence HIGH.

---

## PageHead

`src/components/common/page-head.tsx`

**Purpose.** The shared header for all five section dashboards (resumes, cover
letters, jobs, interview prep, account). Introduced with the v9 shell.

**Structure.** `mb-6`, `flex flex-wrap items-start justify-between gap-4`.
Left: optional `.eyebrow` (11px / 700 / 0.16em / uppercase, `mb-1.5`), then an
`<h1>` in `font-heading` at `text-2xl font-extrabold tracking-tight` rising to
`sm:text-3xl`, then an optional `text-sm text-muted-foreground` subtitle.
Right: an optional `shrink-0` action slot.

**Responsive.** The only built-in responsive step is the title size
(27px to 33px at `sm`). `flex-wrap` lets the action drop below the title when
space runs out.

Confidence HIGH.

---

## Card

Not a single component - a vocabulary applied through shared classes.

**Base.** White `--card` fill, 1px `--border` hairline, `.shadow-card`, radius
chosen per context (`rounded-2xl` is the most common at 142 usages).

**Elevated.** `.shadow-card-lg` for dialogs, popovers and hero surfaces.

**Interactive.** When a card is rendered as `<a>` or `<button>`, a global rule
lifts it `-3px` on hover. Static informational cards deliberately do not move -
the lift is a signal that the card is clickable, not decoration.

**Trace variant.** `.card-trace` starts with a transparent border and traces
`--primary` on hover while deepening the shadow to
`0 10px 26px rgba(30,37,50,0.1)`, over `0.15s`.

**Scroll entrance.** Any `.shadow-card` inside `<main>` rises 28px and fades in
on scroll, via `animation-timeline: view()` - see `MOTION.md`.

Confidence HIGH on the declarations, MEDIUM on "card" as a coherent component,
since it is a convention rather than an enforced primitive.

---

## App shell

`src/features/dashboard/components/dashboard-shell.tsx`

Left-sidebar layout wrapping the five section dashboards. The sidebar has its
own eight-token set (`--sidebar*`), all currently resolving to the same values
as the main surfaces - white fill, `#111418` ink, `--primary` active, `#F1F4F9`
accent, `--border` hairline. The separate token set means the sidebar could be
re-themed independently without touching the page.

Typical content container inside the shell:
`mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8`.

Confidence HIGH.

---

## Empty states

`resumes-empty-state.tsx`, `cover-letters-empty-state.tsx`,
`jobs-empty-state.tsx` - one per section, added with the v9 kit. Each pairs an
illustration with a title, supporting copy and a primary action.

They are separate components rather than one parameterised component, which is
a reasonable choice while the copy and artwork differ per section, but worth
revisiting if they converge.

Confidence HIGH that they exist and are per-section; not visually inspected
this pass.

---

## Components deliberately not documented

- **Resume document templates** (`features/resume-builder/components/templates`)
  are the user's output, not app chrome. They carry their own typography
  (Roboto Flex, EB Garamond, IBM Plex) and their own theme file
  (`src/config/resume-themes.ts`). They are a separate design system and are
  explicitly carved out of this one.
- **Feature components** not reused across features are left to their own
  source; documenting all of them here would duplicate the code without adding
  information.
