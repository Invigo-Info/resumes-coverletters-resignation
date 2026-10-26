# Gallery

Extracted from the `resume-co` source tree, commit `e33d287`.

---

## Relevance

**This product has no image gallery.** The harness anticipates a reference site
built around image presentation - lightboxes, masonry grids, aspect-ratio
systems, pagination and infinite scroll. None of that exists here, and none of
it is invented below.

Confirmed absent by search across `src`:

- No lightbox or image-viewer component
- No masonry or column-span layout
- **No `aspect-*` utility used anywhere in the codebase**
- No pagination component
- No infinite scroll or virtualised list
- No image hover zoom, reveal or parallax treatment

What the product does have is three **card-grid surfaces**. They are documented
here because they are the nearest structural equivalent and because they share
one grid vocabulary worth recording - not because they constitute a gallery.

---

## Grid vocabulary

Two grid shapes cover every collection surface in the product.

### Three-up content grid

Used by the resume template picker:

```
grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3
```

| Viewport | Columns |
| --- | --- |
| Mobile | 1 |
| `sm` (640px+) | 2 |
| `lg` (1024px+) | 3 |

Asymmetric gaps - 24px horizontal, 32px vertical. The extra vertical space
accounts for the caption block below each preview, so rows do not crowd.

### Four-up compact grid

Used by the dashboard document lists:

```
grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4
```

| Viewport | Columns |
| --- | --- |
| Mobile | 2 |
| `lg` (1024px+) | 4 |

Starts at 2 columns rather than 1, because these cards are small. Gap steps
12px to 16px at `sm`.

Both follow the same two-breakpoint model as the rest of the system
(`RESPONSIVE.md`): `sm` and `lg` only.

---

## Template picker

`src/features/resume-builder/components/templates/template-gallery.tsx`

**Purpose.** A decision step, not a browsing experience. The source is explicit
that this is "a quick decision step" and that the grid deliberately "doesn't
reshuffle under the user" - order is held stable so a template does not move
between the moment a user decides and the moment they click.

That stability rule is a genuine design decision and the most interesting thing
about this surface.

**Card anatomy.** Preview image, badges, a hover CTA, the template name and a
usage count.

**Selection.** The selected card carries a `size-7` circular check mark:
`grid place-items-center rounded-full bg-primary text-primary-foreground`.

**Filtering.** Category tabs above the grid.

**Image ratios.** No `aspect-*` utility is used. Preview proportions come from
the thumbnail assets in `public/` (`ATS-friendly`, `Professional`, `Simple`,
`Student`) rather than from a CSS ratio token. This means the grid depends on
the assets being consistently sized - worth noting as a fragility.

Confidence HIGH on structure, LOW on rendered appearance - not visually
inspected.

---

## Document card grids

`dashboard-resumes.tsx`, `dashboard-cover-letters.tsx` and siblings.

Resumes, cover letters, resignation letters and saved interview prep each
render as a card grid using the four-up compact shape above. Cards use the
standard card vocabulary from `COMPONENTS.md`: white fill, hairline border,
`.shadow-card`, and - because they are interactive - the `-3px` hover lift and
the scroll-rise entrance.

Each section pairs with a dedicated empty state component.

---

## Jobs list

`src/features/jobs/components/jobs-landing.tsx`

A list rather than a grid, with per-job match scoring. Its one distinctive
visual element is the fair-match ring, which is **score-banded**: amber for a
fair score, green for a strong one, resolved through a `ringTheme` helper in
`features/jobs/lib/keyword-match.ts` rather than through a CSS token.

That is a legitimate semantic-color decision living outside the token layer.
Worth knowing it exists, since a token-level color audit would miss it.

Loading uses the `jobs-progress` indeterminate bar (see `MOTION.md`).

---

## If a real gallery is ever added

The system already supplies what it would need, and the gaps are specific:

**Available:** the two grid shapes above, card elevation and hover vocabulary,
the scroll-rise entrance, `.card-trace` for hover emphasis, and chips for
filtering.

**Missing, and would need deciding:**

- An aspect-ratio token set. Nothing in the codebase establishes image
  proportions today.
- An image loading treatment. There is no skeleton, blur-up or placeholder
  convention anywhere.
- A lightbox pattern, including its motion and focus-trap behaviour.
- A pagination or infinite-scroll pattern.
- Image optimization policy. One `<img>` currently escapes `next/image`.

None of these should be invented from this document. They are design decisions
that have not been made.
