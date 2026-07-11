"use client";

import { useState } from "react";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  PanelLeft,
  PanelRight,
  RectangleVertical,
  Columns2,
  LayoutTemplate,
  Type,
  Palette,
  Rows2,
  Rows3,
  Rows4,
  Download,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { downloadResume } from "@/lib/download-pdf";
import { cn } from "@/lib/utils";
import {
  useResumeStore,
  type FontId,
  type SpacingId,
  type ColumnsId,
} from "@/lib/store/resume-store";
import { templates, isAtsFriendly } from "@/lib/templates";

// Font choices offered in the Design panel. Each option previews itself: the
// name renders in its own family, so the difference is visible before picking.
// `family` mirrors live-preview's FONT_STACK, or the swatch would lie.
const FONTS: { id: FontId; label: string; sub: string; family: string }[] = [
  { id: "roboto", label: "Roboto Flex", sub: "Roboto Flex", family: "var(--font-roboto-flex), Verdana, sans-serif" },
  { id: "georgia", label: "Georgia", sub: "Georgia", family: "Georgia, serif" },
  { id: "garamond", label: "Garamond", sub: "Garamond", family: "'EB Garamond', Garamond, serif" },
];

// Density presets controlling per-entry spacing in the resume preview.
const SPACINGS: { id: SpacingId; label: string; icon: LucideIcon }[] = [
  { id: "dense", label: "Compact", icon: Rows4 },
  { id: "normal", label: "Standard", icon: Rows3 },
  { id: "loose", label: "Spacious", icon: Rows2 },
];

// Layout options: which side the sidebar column sits on, or a single column.
const COLUMNS: { id: ColumnsId; label: string; icon: LucideIcon }[] = [
  { id: "left", label: "Left", icon: PanelLeft },
  { id: "centered", label: "Single", icon: RectangleVertical },
  { id: "right", label: "Right", icon: PanelRight },
];

// Solid swatches apply an accent on a white page. "Combination" swatches (with
// `bg`) tint the whole resume: light page background + dark accent/heading color.
type Swatch = { accent: string; bg?: string; name: string };
const COLORS: Swatch[] = [
  { accent: "#111827", name: "Black" },
  { accent: "#2563eb", name: "Blue" },
  { accent: "#e11d48", name: "Rose" },
  { accent: "#f59e0b", name: "Amber" },
  { accent: "#0f6e51", bg: "#e7f3ee", name: "Emerald" },
  { accent: "#2f855a", bg: "#eaf5ec", name: "Green" },
  { accent: "#0e7490", bg: "#e3f1f4", name: "Teal" },
  { accent: "#374151", bg: "#eef0f2", name: "Slate" },
];

/** Labelled section wrapper (icon + title + content) for one Design panel group. */
function PanelGroup({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className="size-4 text-muted-foreground" />
        {title}
      </div>
      {children}
    </div>
  );
}

/**
 * The Design tab's control panel: pick a template style (paged carousel), font,
 * density, column layout, and color theme - each writing straight into the resume
 * store so the live preview updates - plus Back and Download actions.
 */
export function DesignPanel({ onBack }: { onBack: () => void }) {
  const design = useResumeStore((s) => s.design);
  const setDesign = useResumeStore((s) => s.setDesign);
  const templateId = useResumeStore((s) => s.templateId);
  const applyTemplate = useResumeStore((s) => s.applyTemplate);

  // Template carousel: `start` is the index of the first visible thumbnail;
  // prev/next shift the window while keeping it in bounds.
  const PER_PAGE = 4;
  const MAX_START = Math.max(0, templates.length - PER_PAGE);
  const [start, setStart] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const visible = templates.slice(start, start + PER_PAGE);
  // Wrap at both ends, so neither arrow is ever a dead control. The reference
  // shows both fully opaque at the first page, and a disabled-looking-enabled
  // arrow would be worse than either.
  const prevPage = () => setStart((i) => (i === 0 ? MAX_START : i - 1));
  const nextPage = () => setStart((i) => (i === MAX_START ? 0 : i + 1));

  // Trigger the PDF export, showing a spinner on the button until it resolves.
  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadResume();
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col rounded-2xl bg-card p-5 shadow-card ring-1 ring-border">
      <div className="flex-1 space-y-7 overflow-y-auto pr-1">
        {/* Styles carousel */}
        <PanelGroup icon={LayoutTemplate} title="Styles">
          <div className="relative">
            <div className="grid grid-cols-4 gap-2">
              {visible.map((t) => {
                const active = t.id === templateId;
                return (
                  <button
                    key={t.id}
                    onClick={() => applyTemplate(t.id)}
                    aria-pressed={active}
                    className={cn(
                      "relative aspect-[210/297] overflow-hidden rounded-md ring-1 transition-all",
                      active ? "ring-2 ring-primary" : "ring-border hover:ring-primary/40"
                    )}
                  >
                    <Image src={t.image} alt={t.name} fill className="object-cover object-top" />
                    {active && (
                      <span className="absolute bottom-0 left-0 grid size-5 place-items-center rounded-br-none rounded-tr-md bg-primary text-white">
                        <Check className="size-3" />
                        <span className="sr-only">Selected</span>
                      </span>
                    )}
                    {/* Only on templates that really are ATS-safe: a badge on a
                        template that isn't would cost the user an application. */}
                    {isAtsFriendly(t) && (
                      <span className="absolute bottom-1 right-1 inline-flex items-center gap-0.5 rounded bg-emerald-700 px-1 py-0.5 text-[8px] font-bold leading-none text-white">
                        <Check className="size-2" />
                        ATS
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Overlaid arrows, as in the reference. */}
            <button
              onClick={prevPage}
              aria-label="Previous styles"
              className="absolute -left-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-neutral-800/95 text-white shadow-lg outline-none transition-colors hover:bg-neutral-700 focus-visible:ring-3 focus-visible:ring-ring/40"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              onClick={nextPage}
              aria-label="More styles"
              className="absolute -right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-neutral-800/95 text-white shadow-lg outline-none transition-colors hover:bg-neutral-700 focus-visible:ring-3 focus-visible:ring-ring/40"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        </PanelGroup>

        {/* Fonts */}
        <PanelGroup icon={Type} title="Fonts">
          <div className="flex gap-1 rounded-xl bg-muted p-1">
            {SPACINGS.map((sp) => {
              const Icon = sp.icon;
              const active = design.spacing === sp.id;
              return (
                <button
                  key={sp.id}
                  onClick={() => setDesign({ spacing: sp.id })}
                  aria-pressed={active}
                  className={cn(
                    "flex min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-card text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {sp.label}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {FONTS.map((f) => {
              const active = design.font === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setDesign({ font: f.id })}
                  aria-pressed={active}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-left transition-colors",
                    active
                      ? "border-primary ring-1 ring-primary"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  <span
                    className="block text-sm font-bold text-foreground"
                    style={{ fontFamily: f.family }}
                  >
                    {f.label}
                  </span>
                  <span className="block text-xs text-muted-foreground">{f.sub}</span>
                </button>
              );
            })}
          </div>
        </PanelGroup>

        {/* Columns */}
        <PanelGroup icon={Columns2} title="Columns">
          <div className="flex gap-1 rounded-xl bg-muted p-1">
            {COLUMNS.map((c) => {
              const Icon = c.icon;
              const active = design.columns === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setDesign({ columns: c.id })}
                  aria-pressed={active}
                  className={cn(
                    "flex min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-card text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {c.label}
                </button>
              );
            })}
          </div>
        </PanelGroup>

        {/* Colors */}
        <PanelGroup icon={Palette} title="Colors">
          {/* Each swatch is a card showing the page it produces (white, or the
              tint) with the accent as a dot inside. `justify-between` fits all
              eight on one row without the gap having to be pixel-exact. */}
          <div className="flex items-start justify-between">
            {COLORS.map((sw) => {
              const active =
                design.color === sw.accent && (design.bg || "") === (sw.bg || "");
              return (
                <button
                  key={sw.accent}
                  onClick={() => setDesign({ color: sw.accent, bg: sw.bg ?? "" })}
                  className="flex flex-col items-center gap-1 rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
                  aria-pressed={active}
                  // A hex code tells a screen-reader user nothing. Name the colour,
                  // and say when a swatch also tints the page.
                  aria-label={sw.bg ? `${sw.name} theme, tinted page` : `${sw.name} accent`}
                >
                  <span
                    className={cn(
                      // border-2, not ring: a ring grows the box and would push
                      // the eighth swatch onto a second row when selected.
                      "grid size-9 place-items-center rounded-lg border-2 bg-card transition-colors",
                      active ? "border-primary" : "border-border hover:border-primary/40"
                    )}
                    style={sw.bg ? { backgroundColor: sw.bg } : undefined}
                  >
                    <span
                      className="size-5 rounded-full"
                      style={{ backgroundColor: sw.accent }}
                    />
                  </span>
                  <span
                    className={cn(
                      "h-0.5 w-4 rounded-full transition-colors",
                      active ? "bg-foreground" : "bg-transparent"
                    )}
                  />
                </button>
              );
            })}
          </div>
        </PanelGroup>
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-full bg-muted px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted/70"
        >
          <ChevronLeft className="size-4" />
          Back
        </button>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {downloading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          {downloading ? "Preparing…" : "Download resume"}
        </button>
      </div>
    </div>
  );
}
