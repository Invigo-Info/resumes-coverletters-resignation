"use client";

import { useState } from "react";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  PanelLeft,
  Columns2,
  PanelRight,
  Download,
  AlignJustify,
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

const FONTS: { id: FontId; label: string; family: string }[] = [
  { id: "roboto", label: "Roboto Flex", family: "var(--font-sans)" },
  { id: "georgia", label: "Georgia", family: "Georgia, serif" },
  { id: "garamond", label: "Garamond", family: "'EB Garamond', Garamond, serif" },
];

const SPACINGS: SpacingId[] = ["dense", "normal", "loose"];

const COLUMNS: { id: ColumnsId; label: string; icon: LucideIcon }[] = [
  { id: "left", label: "Left Column", icon: PanelLeft },
  { id: "centered", label: "Centered", icon: Columns2 },
  { id: "right", label: "Right Column", icon: PanelRight },
];

const COLORS = [
  "#111827",
  "#2563eb",
  "#e11d48",
  "#f59e0b",
  "#0d9488",
  "#16a34a",
  "#0f766e",
  "#06b6d4",
  "#7c3aed",
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
        <PanelGroup icon={Columns2} title="Styles">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStart((i) => Math.max(0, i - 1))}
              disabled={start === 0}
              className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-foreground disabled:opacity-40"
            >
              <ChevronLeft className="size-4" />
            </button>
            <div className="grid flex-1 grid-cols-3 gap-2">
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
                      <span className="absolute bottom-1 left-1 grid size-4 place-items-center rounded-full bg-primary text-white">
                        <Check className="size-2.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setStart((i) => Math.min(templates.length - 3, i + 1))}
              disabled={start >= templates.length - 3}
              className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-foreground disabled:opacity-40"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </PanelGroup>

        {/* Fonts */}
        <PanelGroup icon={AlignJustify} title="Fonts">
          <div className="flex gap-1 rounded-xl bg-muted p-1">
            {SPACINGS.map((sp) => (
              <button
                key={sp}
                onClick={() => setDesign({ spacing: sp })}
                className={cn(
                  "flex-1 rounded-lg py-2 text-sm font-medium capitalize transition-colors",
                  design.spacing === sp
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {sp}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {FONTS.map((f) => (
              <button
                key={f.id}
                onClick={() => setDesign({ font: f.id })}
                style={{ fontFamily: f.family }}
                className={cn(
                  "rounded-xl border px-3 py-3 text-left transition-colors",
                  design.font === f.id
                    ? "border-primary ring-1 ring-primary"
                    : "border-border hover:border-primary/40"
                )}
              >
                <span className="block text-sm font-bold text-foreground">
                  {f.label}
                </span>
              </button>
            ))}
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
                    "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-colors",
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
        <PanelGroup icon={Columns2} title="Colors">
          <div className="flex flex-wrap gap-2.5">
            {COLORS.map((color) => {
              const active = design.color === color;
              return (
                <button
                  key={color}
                  onClick={() => setDesign({ color })}
                  className={cn(
                    "grid size-9 place-items-center rounded-xl transition-all",
                    active && "ring-2 ring-primary ring-offset-2"
                  )}
                  aria-label={`Accent ${color}`}
                >
                  <span
                    className="size-7 rounded-lg"
                    style={{ backgroundColor: color }}
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
