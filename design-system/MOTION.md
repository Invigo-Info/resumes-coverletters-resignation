# Motion

Extracted from `src/app/globals.css` (lines 326-440) and six `framer-motion`
components, commit `e33d287`. All values are declared, not measured.
Confidence HIGH on the declarations; rendered timing was not profiled.

---

## Motion philosophy

Three principles are visible in how this system is built:

1. **Motion is declared once, globally.** Page entrance, card scroll-reveal and
   the universal interactive transition live in `globals.css` and apply
   app-wide. Components do not wire their own entrance animations. This is why
   the product feels consistent in motion rather than animated in patches.

2. **Transitions are safe; displacement is not.** The source draws an explicit
   line: color, background, border and shadow transitions run unconditionally,
   because a state change easing is "a safe, expected micro-interaction".
   Anything that *moves* an element sits behind
   `prefers-reduced-motion: no-preference`.

3. **Movement is a signal, not decoration.** Only cards that are actually
   interactive (rendered as `<a>` or `<button>`) lift on hover. Static
   informational cards stay put. Motion communicates affordance.

---

## Duration tokens

Not declared as named tokens upstream - these are the literal values in use.
`variables.css` in this directory promotes them to tokens.

| Duration | Value | Applied to |
| --- | --- | --- |
| Trace | `0.15s` | `.card-trace` border and shadow |
| Fast | `0.18s` | Universal interactive transition (the most common) |
| Transform | `0.2s` | Hover lift, scale, border and outline color |
| Shadow | `0.25s` | Card elevation change |
| Page enter | `0.45s` | Route `<main>` entrance |
| Popup | `0.1s` | Select popup open and close (`tw-animate-css`) |

The spread is narrow and fast: everything except the page entrance sits between
0.1s and 0.25s.

---

## Easing tokens

| Token | Value | Use |
| --- | --- | --- |
| Standard | `ease` | Every transition |
| Entrance | `cubic-bezier(0.22, 1, 0.36, 1)` | Page entrance only |

The entrance curve is an ease-out-quint: it starts fast and settles gently,
which is why routes feel like they arrive rather than slide.

---

## Hover motion

**Universal transition.** Any `a`, `button`, `summary`, `select`, `label[for]`,
`[role="button"]`, `[role="tab"]` or `[role="menuitem"]` that does not declare
its own transition gets one over `0.18s ease`, covering `color`,
`background-color`, `border-color`, `box-shadow`, `opacity` and `transform`.

The source notes the reasoning: Tailwind's `transition-*` utilities have higher
class specificity, so a component that sets its own still wins. This rule only
fills the gaps site-wide - a well-judged safety net rather than an override.

**Card lift.** `a.shadow-card:hover`, `button.shadow-card:hover` and the `-lg`
equivalents translate `-3px` on Y. Static cards are excluded by selector.

**Opt-in utilities.** `.hover-lift` (`-2px`) and `.hover-scale` can be applied
to any element. Their `transform 0.2s ease` transition is unconditional; only
the movement is reduced-motion gated.

---

## Entrance motion

**Page entrance** runs on every route:

```css
main { animation: page-enter 0.45s cubic-bezier(0.22, 1, 0.36, 1) both; }

@keyframes page-enter {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: none; }
}
```

Because `<main>` remounts per route, this re-runs on client navigations too,
so in-app navigation feels the same as a fresh load.

---

## Scroll motion

Cards rise and fade as they enter the viewport, using a native scroll-driven
animation rather than an intersection observer:

```css
@supports (animation-timeline: view()) {
  main :is(.shadow-card, .shadow-card-lg) {
    animation: card-rise linear both;
    animation-timeline: view();
    animation-range: entry 0% entry 45%;
  }
}

@keyframes card-rise {
  from { opacity: 0; transform: translateY(28px); }
  to   { opacity: 1; transform: none; }
}
```

Two guards make this safe:

- `@supports` means browsers without scroll timelines simply show content
  normally. Content is never left hidden by a failed animation, which is the
  usual bug with scroll reveals.
- The whole block sits inside `prefers-reduced-motion: no-preference`.

The animation completes within the first 45% of the element's entry, so cards
finish settling well before they reach the middle of the viewport.

---

## Modal and drawer motion

Handled by `tw-animate-css` data-attribute utilities rather than custom
keyframes. The Select popup is representative: `data-open:animate-in
fade-in-0 zoom-in-95` paired with `data-closed:animate-out fade-out-0
zoom-out-95`, plus a directional `slide-in-from-*` chosen by `data-[side]` so
the popup emerges from the edge it is anchored to.

`framer-motion` is present in six components for cases needing orchestration
(`initial` 13, `animate` 14, `transition` 10, `exit` 7 usages). It is used
sparingly and is not the primary motion mechanism.

---

## Image motion

None. No image-specific transitions, parallax, zoom-on-hover or reveal
treatments exist. Images inherit card motion when inside a card. Stated rather
than invented, per the harness.

---

## Loading motion

One custom keyframe animation, `jobs-progress`, drives an indeterminate
progress bar for the jobs re-matching state by translating a bar from `-100%`.

The resume-builder progress bar is a *color* progression rather than a motion
one: it climbs the amber-to-green ramp as completion rises. Treated as color in
`DESIGN.md` section 4, not as motion.

---

## Reduced-motion behavior

The policy is a positive guard (`prefers-reduced-motion: no-preference`) rather
than a negative override (`prefers-reduced-motion: reduce { animation: none }`).

This is the stronger pattern: motion is opt-in by capability, so nothing can
leak past the guard by being declared later in the cascade.

**With reduced motion requested, these stop:** page entrance, card scroll-rise,
card hover lift, `.hover-lift` and `.hover-scale` displacement, and the
universal interactive transition.

**These continue:** `.shadow-card` box-shadow, transform, border-color and
outline-color transitions, declared outside the guard. The source justifies
keeping the transition itself as a safe micro-interaction. Note this means a
card's *transform* property still transitions - but since no rule moves it
under reduced motion, there is nothing to animate.

---

## Observed vs inferred

**Observed:** every duration, easing, keyframe, displacement value, selector
and guard above - all read directly from `globals.css`.

**Inferred:** the three philosophy points in the opening section. They are
strongly supported by source comments but remain an interpretation.

**Not assessed:** real frame timing, jank, animation cost on low-end devices,
and whether the 0.45s page entrance feels right in use. No profiling was run.
