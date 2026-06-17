"use client";

import { useState } from "react";
import {
  useResignationLetterStore,
  type RLFontId,
  type RLFontSize,
} from "@/lib/store/resignation-letter-store";
import { cn } from "@/lib/utils";

const SIZES: RLFontSize[] = ["S", "M", "L"];

const FONTS: { id: RLFontId; label: string; family: string }[] = [
  { id: "georgia", label: "Georgia", family: "Georgia, serif" },
  { id: "inter", label: "Inter", family: "var(--font-sans), sans-serif" },
  { id: "garamond", label: "Garamond", family: "'EB Garamond', Garamond, serif" },
];

/**
 * Color combinations. A plain swatch sets an accent on a white page; a tinted
 * swatch also fills the page with a soft background; the dark swatch flips the
 * whole letterhead to a dark theme. Tints use a dark-enough accent so the
 * colored letter text stays readable.
 */
type Combo = { accent: string; bg?: string; dark?: boolean };
const COMBOS: Combo[] = [
  { accent: "#111827" },
  { accent: "#0f766e", bg: "#e8f5ef" },
  { accent: "#1d4ed8", bg: "#eaf0fe" },
  { accent: "#0e7490", bg: "#e7f6fb" },
  { accent: "#ffffff", bg: "#0e4b5a", dark: true },
];

/**
 * Floating vertical design toolbar (Step 9.png): text size, font, and
 * color/theme swatches — including the dark-letterhead theme (filled square).
 */
export function DesignToolbar() {
  const design = useResignationLetterStore((s) => s.design);
  const setDesign = useResignationLetterStore((s) => s.setDesign);
  const [fontOpen, setFontOpen] = useState(false);

  const activeFont = FONTS.find((f) => f.id === design.font) ?? FONTS[0];

  return (
    <div className="flex w-14 flex-col items-center gap-2 rounded-2xl bg-card p-1.5 shadow-card ring-1 ring-border">
      {/* Text size */}
      <div className="flex w-full flex-col overflow-hidden rounded-xl">
        {SIZES.map((sz) => {
          const active = design.fontSize === sz;
          return (
            <button
              key={sz}
              onClick={() => setDesign({ fontSize: sz })}
              className={cn(
                "py-2 text-sm font-semibold transition-colors",
                active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              )}
              aria-pressed={active}
              aria-label={`Text size ${sz}`}
            >
              {sz}
            </button>
          );
        })}
      </div>

      <span className="h-px w-7 bg-border" />

      {/* Font selector */}
      <div className="relative">
        <button
          onClick={() => setFontOpen((v) => !v)}
          className="grid size-10 place-items-center rounded-xl text-primary transition-colors hover:bg-muted"
          style={{ fontFamily: activeFont.family }}
          aria-label="Font"
        >
          <span className="text-base font-bold leading-none">Aa</span>
        </button>
        {fontOpen && (
          <div className="absolute left-12 top-0 z-10 w-40 overflow-hidden rounded-xl bg-card p-1 shadow-card-lg ring-1 ring-border">
            {FONTS.map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setDesign({ font: f.id });
                  setFontOpen(false);
                }}
                style={{ fontFamily: f.family }}
                className={cn(
                  "block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                  design.font === f.id ? "font-bold text-foreground" : "text-muted-foreground"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <span className="h-px w-7 bg-border" />

      {/* Color combinations (accent + page background) */}
      <div className="flex flex-col items-center gap-2 pb-1">
        {COMBOS.map((c) => {
          const active = c.dark
            ? design.theme === "dark"
            : design.theme === "light" &&
              design.accent === c.accent &&
              (design.bg || "") === (c.bg || "");
          return (
            <button
              key={`${c.accent}-${c.bg ?? ""}`}
              onClick={() =>
                setDesign({
                  accent: c.accent,
                  bg: c.bg ?? "",
                  theme: c.dark ? "dark" : "light",
                })
              }
              className={cn(
                "grid size-7 place-items-center transition-all",
                c.bg ? "rounded-md" : "rounded-full",
                active && "ring-2 ring-primary ring-offset-2"
              )}
              aria-label={c.dark ? "Dark letterhead" : c.bg ? `Theme ${c.accent}` : `Accent ${c.accent}`}
            >
              {c.dark ? (
                <span className="size-5 rounded-[5px] bg-neutral-900" />
              ) : c.bg ? (
                <span
                  className="grid size-6 place-items-center rounded-[6px] ring-1 ring-black/5"
                  style={{ backgroundColor: c.bg }}
                >
                  <span className="size-3 rounded-full" style={{ backgroundColor: c.accent }} />
                </span>
              ) : (
                <span className="size-5 rounded-full" style={{ backgroundColor: c.accent }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
