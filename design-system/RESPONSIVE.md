# Responsive Behavior

Extracted from the `resume-co` source tree, commit `e33d287`.

**Confidence warning.** This document describes what the source *declares*. No
viewport testing, device testing or visual QA was performed in this pass, so
nothing here is a statement about how the product actually behaves on a phone.
Rendered responsive behaviour is marked LOW confidence throughout and should be
verified before launch (task R5 in the launch worklist).

---

## Breakpoints

Tailwind v4 defaults. The project declares no overrides, so these are inherited
rather than designed. Confidence MEDIUM on the values, HIGH on the usage counts.

| Prefix | Min width | Usages in `src` |
| --- | --- | --- |
| `sm:` | 640px | **258** |
| `md:` | 768px | 7 |
| `lg:` | 1024px | **68** |
| `xl:` | 1280px | 7 |
| `2xl:` | 1536px | 0 |

**The significant finding:** this is effectively a **two-breakpoint system**.
`sm:` and `lg:` carry 326 of the 340 responsive declarations. `md:` and `xl:`
are used 7 times each, and `2xl:` never.

That is not necessarily wrong - two well-chosen breakpoints beat five
half-used ones - but it means the real layout model is:

- **Below 640px:** mobile
- **640px to 1024px:** a single intermediate state doing duty for both large
  phones and tablets
- **1024px and up:** desktop

The 768px-to-1024px range (most tablets in portrait) is served by the same
rules as a 640px phone. Whether that holds up is exactly what testing needs to
establish.

---

## Layout transformation by viewport

### Content container

`mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8`

| Viewport | Horizontal padding | Width |
| --- | --- | --- |
| Mobile | 16px | Fluid |
| `sm` and up | 24px | Fluid |
| `lg` and up | 32px | Capped at `max-w-6xl` (1152px) |

**What stays constant:** vertical rhythm (`py-8`, 32px) and the centring. Only
the gutter grows and the width eventually caps.

### App shell

The left sidebar (`dashboard-shell.tsx`) is the main structural element. Its
collapse behaviour at mobile width was **not verified** in this pass - this is
the single most important thing to check first, since every authenticated page
sits inside it.

### PageHead

`flex flex-wrap items-start justify-between gap-4`

| Viewport | Behaviour |
| --- | --- |
| Narrow | Action wraps below the title block (`flex-wrap`) |
| Wide | Title left, action right on one row |

Title scales `text-2xl` (27px) to `sm:text-3xl` (33px). The eyebrow and
subtitle do not scale.

**What stays constant:** the eyebrow, the 24px bottom margin, the 16px gap.

### Form controls

Input, Textarea and Select all carry `text-base md:text-sm` - 18px on mobile,
16px from 768px up.

This is a deliberate iOS accommodation: Safari zooms the viewport when a focused
input has a font size below 16px. Starting at 18px and stepping *down* to 16px
avoids that zoom on phones while keeping desktop forms compact. It is also one
of the only meaningful uses of `md:` in the codebase.

**What stays constant:** control height (`h-8`), radius, fill, border, and
every state treatment. Only the type size changes.

---

## What stays constant across all viewports

- The entire color system. No viewport-conditional color anywhere.
- Radius and border weights.
- Shadow definitions.
- Control heights (`h-8` default throughout).
- `scrollbar-gutter: stable` on `html`, which prevents horizontal shift
  between pages of differing height at every width.
- All motion behaviour. No breakpoint-conditional motion exists.

---

## Known responsive risks

Structural observations from the source, not test results:

1. **The sidebar shell at mobile width** is unverified and is the highest-value
   thing to test.
2. **The 768px-to-1024px gap.** Tablets in portrait inherit phone rules.
3. **Wide content inside cards.** The resume live preview and template gallery
   render fixed-proportion documents; whether they scroll inside their
   container or push the page sideways at narrow widths was not checked.
4. **`max-w-md` dominance** (40 usages, the most common width cap) suggests
   many dialogs and forms share one width. At 448px this is comfortable on
   desktop and full-bleed on a phone, which is usually correct, but worth a
   look.
5. **No `2xl` handling.** On a very wide display the content caps at 1152px and
   the remainder is page ground. Likely fine and arguably correct, but it is an
   inherited default rather than a decision.

---

## Recommended verification

Before launch, check each at 375px, 768px, 1024px and 1440px:

- The sidebar shell and its collapse or drawer behaviour
- All five section dashboards
- The resume builder editor with its live preview
- The template gallery
- Checkout and payment screens
- Every dialog and popover

Playwright is already installed and unused, so this can be scripted rather than
done by hand - and it pairs naturally with the end-to-end journey tests the
launch worklist calls for (task P13).
