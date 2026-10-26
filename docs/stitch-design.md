# Design System: Resumewriter.ai (Stitch prompt source-of-truth)

> SCOPE NOTE (updated): the build scope is now POLISH-ONLY on the existing app — no
> sidebar and no re-layout (see `design-system.md`). This Stitch file still describes a
> navy sidebar shell, which was exploration only. Use it just to explore looks in Stitch;
> it is NOT the build spec. For the actual work, the only parts that still apply are the
> typography (section 3) and the anti-pattern list (section 7).
>
> TOKENS ARE GROUNDED ELSEWHERE: the hex values in section 2 below are exploratory names
> and do NOT match the code. The real, shipped tokens are in
> [`design-foundation.md`](./design-foundation.md) (pulled verbatim from
> `src/app/globals.css`). Always inherit those — never the invented palette here.

Paste the relevant parts of this file into Google Stitch (labs.google.com/stitch) as the
design language, then generate each screen with a brief from
[`stitch-briefs.md`](./stitch-briefs.md). This encodes the app chrome only. The rendered
resume/letter DOCUMENT is a deliberate carve-out (its own neutral, ATS-safe styling) and
must NOT be restyled with the app — never ask Stitch to recolor the resume preview.

Deliberate deviations from the generic Stitch taste defaults (project system wins):
- Font: this product has a committed UI type system, so `Inter` (body) + `Gabarito`
  (display) are KEPT, not banned. If you want to explore a more distinctive face,
  `Geist` or `Satoshi` are the sanctioned alternates — but the shipped app uses Inter.
- Accent: the brand is blue `#2563EB`. It is used as a FLAT fill only — never a neon
  glow or gradient halo. That satisfies the "no blue neon" rule; blue-as-brand stays.
- Variance/density: this is a daily productivity SaaS with forms and a builder, so
  variance is calm (4-5), not artsy-chaotic. Usability outranks visual drama here.

---

## 1. Visual Theme & Atmosphere

A calm, confident, product-grade SaaS interface: crisp white workspace anchored by a
deep-navy sidebar, with a single blue accent doing all the pointing. The mood is
"well-run studio" — clean, legible, quietly premium; every screen feels like part of one
tool, never a different template per page. Density is balanced (4-5): generous but not
airy, dense only where data lives (jobs list, dashboard stats). Variance is moderate
(4-5): mostly orderly grids, with one deliberate asymmetric moment per hero (the
dashboard's navy welcome band, the landing split). Motion is fluid-restrained (4):
short, physical, purposeful — never decorative.

Full light and dark themes. The sidebar stays navy in both. Two theme tokens sets swap
at the root; components are styled only through tokens.

---

## 2. Color Palette & Roles

One accent (blue). Saturation kept moderate, flat fills, no glow. Blue-biased neutrals
(never a pure mid-grey, never pure black).

Light theme:
- **Frame Mist** (#EEF2F8) — app frame behind the shell
- **Canvas** (#F5F7FB) — content-area ground
- **Pure Surface** (#FFFFFF) — cards, panels, inputs-on-focus
- **Ink** (#0D1526) — primary text (near-black, blue bias; never #000000)
- **Steel** (#61708C) — secondary text, metadata, labels
- **Hairline** (#E3E8F1) — 1px borders, dividers
- **Brand Blue** (#2563EB) — the single accent: primary buttons, active nav, focus ring, links
- **Blue Strong** (#1D4ED8) — hover/emphasis of the accent
- **Blue Tint** (#ECF3FF) — soft fills: icon tiles, selected rows, AI banners
- **Sidebar Navy** (#0A1730 to #122A5E) — the deep-navy sidebar gradient (both themes)
- **Sidebar Ink** (#C3D2EE) — sidebar nav text; active item goes pure white

Dark theme:
- **Canvas** (#0A111F), **Surface** (#111B2F), **Ink** (#E8EEFB), **Steel** (#8A97B4),
  **Hairline** (#1E2B46), **Brand Blue** (#3B82F6), **Blue Tint** (#14223D).

Semantic status (separate from the accent — never used as brand color, always paired
with an icon + word, never color alone):
- **Success** (#16A34A), **Warning** (#D97706), **Danger** (#DC2626).

Banned here: the old purple-to-magenta AI gradient, the teal brand mark, the orange-to
green progress ramp, any neon/outer-glow shadow, any second accent hue, per-page custom
colors. Charts may use multiple hues (accessibility) — that is the only multi-hue
exception, and it is not part of the chrome palette.

---

## 3. Typography Rules

- **Display / headings:** `Gabarito` — extrabold, tight tracking (-0.02em), hierarchy by
  weight and color, not by screaming size. Page titles ~28-30px, section titles ~16-18px.
  Balance headings (`text-wrap: balance`).
- **Body / UI:** `Inter` — 15-16px base, relaxed leading (1.5), max 65 characters per
  line for prose; secondary text in Steel.
- **Numbers (mono):** `Geist Mono` (or `JetBrains Mono`) with `tabular-nums` for every
  aligned figure — dashboard counts, job match scores, prices, salary ranges, sidebar
  badges. This is a data-carrying product, so numbers are always monospaced.
- **Labels / eyebrows:** uppercase, 11px, letter-spacing 0.13em, in Brand Blue or Steel.
- Never skip heading levels; one h1 per screen. No serif anywhere in the app chrome
  (serif belongs only to the carved-out resume document, which Stitch does not design).

---

## 4. Component Stylings

- **Sidebar nav:** deep-navy gradient, 252px. Items are pill rows with a lucide icon +
  label; the active item is filled (#1A3C8A), pure-white text, and a 3px blue indicator
  bar on its left edge. Grouped by label: Workspace / Create / Account. A user chip pins
  to the bottom.
- **Buttons:** flat, no outer glow. Primary = Brand Blue fill, white text, soft (not
  neon) shadow; tactile 1px press on active. Secondary = white surface + hairline border.
  Quiet = transparent. Danger = transparent with red text, red-tint on hover. One primary
  action per view.
- **Cards:** one idiom everywhere — white surface, 1px hairline, corner radius 16px (22px
  for large document cards), a soft two-layer shadow that lifts on hover. Cards are used
  when elevation communicates grouping; dense lists (jobs) use divided rows instead.
- **Stat tile:** blue-tint icon tile, big monospaced count, label; hover lift; selectable
  (acts as a filter, shows a blue ring when active).
- **Inputs:** label above, input is canvas-tint filled with a hairline; on focus the
  border goes Brand Blue with a soft blue focus ring; helper text optional; error text
  below in Danger. No floating labels.
- **Pills / badges:** blue-tint (info), green-tint (success), hairline-outline (neutral).
  Status is always icon + word.
- **Loaders:** skeleton shapes matching the real layout (card, row, meter) — never a
  generic circular spinner. Interview-prep questions stream in one card at a time.
- **Empty states:** a composed prompt with an icon tile, a one-line explanation, and a
  single primary CTA that starts the task — never a bare "No data".
- **Interview-prep question cards:** full-bleed blue-family gradients (deep navy to blue,
  sky, indigo — one hue family, varied depth), white text, tips divided by translucent
  white rules, sample answer in a translucent inset. Technical cards are tips-only.

The 8 states are mandatory on interactive components: default, hover, focus (visible
ring), active/pressed, disabled (reduced opacity, no pointer), loading, error, selected.

---

## 5. Layout Principles

- Persistent app shell: fixed navy sidebar + content column. Content is grid-first,
  centered, max-width ~1200px, 26px padding. No flexbox percentage math.
- One deliberate asymmetric moment per hub: the dashboard opens with a navy welcome band
  (greeting + progress + primary action) offset above an even stat grid.
- Section landings share ONE pattern: a page header (Gabarito title + optional one-line
  subtitle) over the unified card idiom. Do not invent a different width/heading/card
  per section.
- Jobs keeps a two-column master/detail; Payment keeps a marketing hero; those are the
  only wide layouts.
- Full-height regions use `min-h-[100dvh]`, never `h-screen`.
- Focused surfaces (resume/letter editors, wizards, tailoring, onboarding, prep run) are
  chrome-light — no sidebar — to keep the build loop distraction-free.

---

## 6. Motion & Interaction

- Durations 100-300ms, ease-out for entrances, ease-in for exits, ease-in-out for state
  changes; nothing over 500ms. Physical, not linear.
- Micro-interactions: card lift on hover, button press, blue ring on focus, meter fill,
  screen fade on navigation, sidebar drawer slide on mobile.
- Lists reveal with a short staggered cascade; the interview-prep cards paint one at a
  time as they stream.
- Animate transform and opacity only — never top/left/width/height.
- Always honor `prefers-reduced-motion`: replace with a fade or instant; no perpetual
  loops, parallax, or autoplay. (This overrides the generic "perpetual micro-loop"
  default — an accessibility requirement for this product.)

---

## 7. Anti-Patterns (Banned)

- No emoji anywhere — icons are lucide (inline SVG, currentColor) or plain words.
- No purple/magenta AI gradient, no teal, no orange-to-green ramp, no second accent.
- No neon or outer-glow shadows; no gradient text on large headings; no custom cursors.
- No pure black (#000000) — use Ink (#0D1526).
- No per-page palette — every screen reads from the one blue+white token set.
- No serif in the app chrome (serif is only the carved-out resume document).
- No three-equal-cards feature row on marketing — use a 2-column zig-zag or asymmetric grid.
- No centered hero on the landing when it competes with content — prefer a split.
- No overlapping text/images; every element gets its own spatial zone.
- No fake round numbers, no "John Doe"/"Acme"/"Nexus" placeholders — use realistic
  content (e.g. a Senior Software Engineer resume, a 92% job match, a Rs 45-55L range).
- No AI copy cliches ("Elevate", "Seamless", "Unleash", "Next-Gen").
- No "Scroll to explore" / bouncing chevrons / scroll arrows.
- No broken image links — use SVG/avatars or picsum.photos placeholders.
- Never recolor or restyle the resume/letter document preview (carve-out).
