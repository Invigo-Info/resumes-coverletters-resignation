# Resume.co design-sync notes

This repo is a **Next.js application**, not a published component library. The sync scopes to the
17 shadcn/Base-UI primitives in `src/components/ui/` and runs the converter in **synth-entry mode**
(no `dist/`). Several non-standard steps are required on every sync — do them in order.

## Required setup before every build (recreate — these are ephemeral)

1. **Compile Tailwind v4 to a static stylesheet** (the app has no shipped CSS; utilities are
   build-time). From `resume-co/`:
   `npx @tailwindcss/cli@4 -i src/app/globals.css -o .design-sync/.cache/compiled.css`
   Brand/token edits do NOT reach the DS unless this is re-run.
2. **Recreate the package-dir shim** at `node_modules/resume-co` (the app doesn't self-install, so
   `PKG_DIR = node_modules/<pkg>` is missing). Make it a **real directory** (a junction to the repo
   root causes an infinite glob over `.next/` and OOMs; a real dir avoids that) containing:
   - `package.json` = `{"name":"resume-co","version":"0.1.0"}`
   - `tsconfig.json` = copy of the repo `tsconfig.json` (gives esbuild `@/*` -> `./src/*`)
   - `compiled.css` = copy of `.design-sync/.cache/compiled.css` (this is what `cfg.cssEntry` points at)
   - `src` = a **junction** to the real `../../src` (bounded; no `.next`, no node_modules)
   The shim intermittently disappears between commands on Windows — recreate it **inline in the same
   command as the build**, guarded by an existence check.
3. **Build with a large heap**: `NODE_OPTIONS="--max-old-space-size=8192"`.

One-liner shim recreate (run from `resume-co/`):
```
node -e 'const fs=require("fs"),p=require("path");const r=process.cwd();const l=p.join(r,"node_modules","resume-co");if(!fs.existsSync(p.join(l,"package.json"))){fs.mkdirSync(l,{recursive:true});fs.writeFileSync(p.join(l,"package.json"),JSON.stringify({name:"resume-co",version:"0.1.0"}));fs.copyFileSync(p.join(r,"tsconfig.json"),p.join(l,"tsconfig.json"));fs.copyFileSync(p.join(r,".design-sync/.cache/compiled.css"),p.join(l,"compiled.css"));fs.symlinkSync(p.join(r,"src"),p.join(l,"src"),"junction");}'
```

## Config choices (`.design-sync/config.json`)
- `shape: package`, `srcDir: src/components/ui` (scopes the synth entry to the 17 primitives, not the whole app).
- `cssEntry: compiled.css` (relative to PKG_DIR = the shim).
- `runtimeFontPrefixes: ["Inter","Geist"]` — the app serves these via `next/font`, so the bundle
  intentionally ships no `@font-face`. Designs render in a system fallback close to Inter. To ship
  true Inter, add the woff2 via `cfg.extraFonts` (fidelity improvement, not required).
- `overrides` set `cardMode:single` for Dialog / DropdownMenu / Tooltip (portalled open states).

## Known render warns (benign — do not chase)
- **Dialog `[RENDER_THIN]`**: the dialog is `position:fixed`, so the measured root height is 0px even
  though it renders correctly (screenshot-confirmed). Benign.
- **Toaster on the floor card**: `sonner` is a runtime toast *host* — it renders nothing statically
  (needs a `next-themes` ThemeProvider + a fired toast). Left on the floor card deliberately; the
  component is still fully functional in the bundle.

## Environment
- Playwright: chromium **1228** is cached at `%LOCALAPPDATA%\ms-playwright` (the Windows default) and
  matches the repo's `playwright@1.61.1`. No `PLAYWRIGHT_BROWSERS_PATH` needed.
- **EBUSY on `ds-bundle`**: Windows occasionally locks the out dir between runs — `rm -rf ds-bundle`
  with a short retry loop before rebuilding.

## Re-sync risks (watch-list)
- `compiled.css` is a **generated artifact** — stale unless re-run; token/brand changes silently
  won't appear otherwise.
- The shim + `src` junction are ephemeral — recreated every run, never committed.
- **Synth-entry means weaker `.d.ts` contracts** (props derived by ts-morph from source, no shipped
  types). If a component's `<Name>Props` looks thin, add `cfg.dtsPropsFor.<Name>`. The real fix is to
  add a library build to the app and point `--entry` at it.
- Adding/removing a `ui/` component means updating `componentSrcMap` (17 pinned paths).
