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
import { templates } from "@/lib/templates";

const FONTS: { id: FontId; label: string; sub: string; family: string }[] = [
  { id: "roboto", label: "Verdana", sub: "Verdana", family: "Verdana, Geneva, sans-serif" },
  { id: "georgia", label: "Georgia", sub: "Arial", family: "Georgia, serif" },
  { id: "garamond", label: "Garamond", sub: "Garamond", family: "'EB Garamond', Garamond, serif" },
];

const SPACINGS: { id: SpacingId; label: string; icon: LucideIcon }[] = [
  { id: "dense", label: "Compact", icon: Rows4 },
  { id: "normal", label: "Standard", icon: Rows3 },
  { id: "loose", label: "Spacious", icon: Rows2 },
];

const COLUMNS: { id: ColumnsId; label: string; icon: LucideIcon }[] = [
  { id: "left", label: "Left", icon: PanelLeft },
  { id: "centered", label: "Single", icon: RectangleVertical },
  { id: "right", label: "Right", icon: PanelRight },
];

// Solid swatches apply an accent on a white page. "Combination" swatches (with
// `bg`) tint the whole resume: light page background + dark accent/heading color.
type Swatch = { accent: string; bg?: string };
const COLORS: Swatch[] = [
  { accent: "#111827" },
  { accent: "#2563eb" },
  { accent: "#e11d48" },
  { accent: "#f59e0b" },
  { accent: "#0f6e51", bg: "#e7f3ee" },
  { accent: "#2f855a", bg: "#eaf5ec" },
  { accent: "#0e7490", bg: "#e3f1f4" },
  { accent: "#374151", bg: "#eef0f2" },
];

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

export function DesignPanel({ onBack }: { onBack: () => void }) {
  const design = useResumeStore((s) => s.design);
  const setDesign = useResumeStore((s) => s.setDesign);
  const templateId = useResumeStore((s) => s.templateId);
  const applyTemplate = useResumeStore((s) => s.applyTemplate);

  const [start, setStart] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const visible = templates.slice(start, start + 3);
  const canPrev = start > 0;
  const canNext = start < templates.length - 3;

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
            <div className="grid grid-cols-3 gap-2">
              {visible.map((t) => {
                const active = t.id === templateId;
                return (
                  <button
                    key={t.id}
                    onClick={() => applyTemplate(t.id)}
                    className={cn(
                      "relative aspect-[210/297] overflow-hidden rounded-md ring-1 transition-all",
                      active ? "ring-2 ring-primary" : "ring-border hover:ring-primary/40"
                    )}
                  >
                    <Image src={t.image} alt={t.name} fill className="object-cover object-top" />
                    {active && (
                      <span className="absolute left-1 top-1 grid size-4 place-items-center rounded-full bg-primary text-white">
                        <Check className="size-2.5" />
                      </span>
                    )}
                    {/* ATS badge */}
                    <span className="absolute bottom-1 right-1 inline-flex items-center gap-0.5 rounded bg-emerald-600 px-1 py-0.5 text-[8px] font-bold leading-none text-white">
                      <Check className="size-2" />
                      ATS
                    </span>
                  </button>
                );
              })}
            </div>

            {canPrev && (
              <button
                onClick={() => setStart((i) => Math.max(0, i - 1))}
                aria-label="Previous styles"
                className="absolute -left-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-neutral-800 text-white shadow-md transition-colors hover:bg-neutral-700"
              >
                <ChevronLeft className="size-4" />
              </button>
            )}
            {canNext && (
              <button
                onClick={() => setStart((i) => Math.min(templates.length - 3, i + 1))}
                aria-label="More styles"
                className="absolute -right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-neutral-800 text-white shadow-md transition-colors hover:bg-neutral-700"
              >
                <ChevronRight className="size-4" />
              </button>
            )}
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
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-card text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="size-4" />
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
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-card text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="size-4" />
                  {c.label}
                </button>
              );
            })}
          </div>
        </PanelGroup>

        {/* Colors */}
        <PanelGroup icon={Palette} title="Colors">
          <div className="flex flex-wrap gap-2.5">
            {COLORS.map((sw) => {
              const active =
                design.color === sw.accent && (design.bg || "") === (sw.bg || "");
              return (
                <button
                  key={sw.accent}
                  onClick={() => setDesign({ color: sw.accent, bg: sw.bg ?? "" })}
                  className="flex flex-col items-center gap-1"
                  aria-label={sw.bg ? `Theme ${sw.accent}` : `Accent ${sw.accent}`}
                >
                  <span
                    className={cn(
                      "grid size-9 place-items-center rounded-xl ring-1 ring-black/5 transition-all",
                      active && "ring-2 ring-primary ring-offset-2"
                    )}
                    style={sw.bg ? { backgroundColor: sw.bg } : undefined}
                  >
                    <span
                      className={cn("rounded-lg", sw.bg ? "size-5 rounded-full" : "size-7")}
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
