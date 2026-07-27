# Resume.co UI — conventions for building with this library

These are the shadcn-style primitives from Resume.co (a resume / cover-letter / job-search product),
built on Base UI with Tailwind v4 tokens. `window.ResumeCoDS` exposes every export.

## Setup and wrapping
- **Import the stylesheet once** at the app root (`styles.css` → it pulls in the compiled token +
  utility layer). Nothing renders on-brand without it.
- **Most components need no provider** — import and use them directly.
- **Two exceptions:** wrap tooltips in `<TooltipProvider>` (controls open delay); mount one
  `<Toaster />` at the app root and call `sonner`'s `toast()` to show messages (it renders nothing on
  its own — it is a host, not an inline element).
- **Compound components** are composed from parts, all on the global: `Dialog` = `Dialog` +
  `DialogTrigger` + `DialogContent` (+ `DialogHeader/Title/Description/Footer`); likewise
  `DropdownMenu*`, `Select*`, `Tabs*`, `Accordion*`, `Card*`, `Avatar*`. Read the component's
  `.prompt.md` for the exact part list.

## Styling idiom — Tailwind utilities with semantic token names (never raw hex)
Style layout/spacing with Tailwind utilities and colour with the DS's **semantic token classes**, so
everything themes from one place and works in light + dark. Real class names in this system:

| Role | Classes |
|---|---|
| Surfaces | `bg-background` (page), `bg-card`, `bg-popover`, `bg-muted`, `bg-accent` |
| Text | `text-foreground`, `text-muted-foreground`, `text-primary-foreground` |
| Primary action | `bg-primary` + `text-primary-foreground` |
| Secondary / neutral | `bg-secondary` + `text-secondary-foreground` |
| Destructive | `bg-destructive` / `text-destructive` (danger only — never for a normal action) |
| Borders / inputs | `border-border`, `border-input` |
| Focus ring | the `ring-*` utilities driven by the ring token (e.g. `focus-visible:ring-ring/50`) |

Merge conditional classes with the `cn()` helper (clsx + tailwind-merge) the components use. Do not
hardcode colours or px — reach for a token utility, or `var(--primary)`, `var(--muted-foreground)`,
`var(--radius)` etc. when you need a raw value. Pick colour **by intent**: primary = the one main
action, secondary = neutral, destructive = danger.

## Where the truth lives
- Per component: `<Name>.d.ts` (the exact props/variants) and `<Name>.prompt.md` (usage + examples).
  `Button`, `Badge`, and `Tabs` carry `variant` (and `Button`/`Select`/`Avatar` a `size`).
- The token + utility source is `styles.css` → `_ds_bundle.css`; read it before inventing a class.

## One idiomatic example
```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction, Button, Badge } from 'resume-co'

<Card className="max-w-sm">
  <CardHeader>
    <CardTitle>Product Manager Resume</CardTitle>
    <CardDescription>Last edited 2 days ago</CardDescription>
    <CardAction><Badge>ATS-friendly</Badge></CardAction>
  </CardHeader>
  <CardContent>
    <p className="text-muted-foreground">Tailored for senior B2B SaaS roles.</p>
  </CardContent>
  <CardFooter className="gap-2">
    <Button size="sm">Edit</Button>
    <Button size="sm" variant="outline">Download</Button>
  </CardFooter>
</Card>
```
