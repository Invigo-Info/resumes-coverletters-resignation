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

/** Light accent colors (circles). */
const ACCENTS = ["#111827", "#059669", "#2563eb", "#0d9488"];

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

      {/* Color / theme swatches */}
      <div className="flex flex-col items-center gap-2 pb-1">
        {ACCENTS.map((color) => {
          const active = design.theme === "light" && design.accent === color;
          return (
            <button
              key={color}
              onClick={() => setDesign({ accent: color, theme: "light" })}
              className={cn(
                "grid size-7 place-items-center rounded-full transition-all",
                active && "ring-2 ring-primary ring-offset-2"
              )}
              aria-label={`Accent ${color}`}
            >
              <span className="size-5 rounded-full" style={{ backgroundColor: color }} />
            </button>
          );
        })}
        {/* Dark letterhead theme */}
        <button
          onClick={() => setDesign({ theme: "dark" })}
          className={cn(
            "grid size-7 place-items-center rounded-md transition-all",
            design.theme === "dark" && "ring-2 ring-primary ring-offset-2"
          )}
          aria-label="Dark letterhead"
        >
          <span className="size-5 rounded-[5px] bg-neutral-900" />
        </button>
      </div>
    </div>
  );
}
