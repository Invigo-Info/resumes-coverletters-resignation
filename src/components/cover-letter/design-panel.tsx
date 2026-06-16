"use client";

import { useState } from "react";
import {
  Type,
  Palette,
  LayoutTemplate,
  Rows2,
  Rows3,
  Rows4,
  ChevronLeft,
  ChevronRight,
  Check,
  Download,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import {
  useCoverLetterStore,
  type CLFontId,
  type CLSpacingId,
} from "@/lib/store/cover-letter-store";
import { coverLetterTemplates } from "@/lib/cover-letter/templates";
import { CoverLetterThumb } from "@/components/cover-letter/cover-letter-thumb";
import { downloadCoverLetter } from "@/lib/cover-letter/download";
import { usePaywall } from "@/lib/cover-letter/paywall";
import { cn } from "@/lib/utils";

const FONTS: { id: CLFontId; label: string; sub: string; family: string }[] = [
  { id: "georgia", label: "Georgia", sub: "Georgia", family: "Georgia, serif" },
  { id: "inter", label: "Inter", sub: "Inter", family: "var(--font-sans), sans-serif" },
  { id: "garamond", label: "Garamond", sub: "Garamond", family: "'EB Garamond', Garamond, serif" },
];

const SPACINGS: { id: CLSpacingId; label: string; icon: LucideIcon }[] = [
  { id: "dense", label: "Compact", icon: Rows4 },
  { id: "normal", label: "Standard", icon: Rows3 },
  { id: "loose", label: "Spacious", icon: Rows2 },
];

// Solid swatches set an accent on a white page. Combination swatches tint the
// page (light `bg`) or fill it dark (`dark` → white text).
type Swatch = { accent: string; bg?: string; dark?: boolean };
const COLORS: Swatch[] = [
  { accent: "#111827" },
  { accent: "#2563eb" },
  { accent: "#e11d48" },
  { accent: "#f59e0b" },
  { accent: "#0f766e", bg: "#e7f3ee" },
  { accent: "#0d9488", bg: "#eafaf6" },
  { accent: "#ffffff", bg: "#0e4b5a", dark: true },
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

export function CoverLetterDesignPanel({ onEdit }: { onEdit?: () => void }) {
  const design = useCoverLetterStore((s) => s.design);
  const setDesign = useCoverLetterStore((s) => s.setDesign);
  const [start, setStart] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const requestDownload = usePaywall((s) => s.requestDownload);

  const visible = coverLetterTemplates.slice(start, start + 3);
  const canPrev = start > 0;
  const canNext = start < coverLetterTemplates.length - 3;

  const spacing = design.spacing ?? "normal";

  function handleDownload() {
    requestDownload(async () => {
      setDownloading(true);
      try {
        await downloadCoverLetter();
      } finally {
        setDownloading(false);
      }
    });
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col rounded-2xl bg-card p-5 shadow-card ring-1 ring-border">
      <div className="flex-1 space-y-7 overflow-y-auto pr-1">
        {/* Styles */}
        <PanelGroup icon={LayoutTemplate} title="Styles">
          <div className="relative">
            <div className="grid grid-cols-3 gap-2">
              {visible.map((t) => {
                const active = t.id === design.template;
                return (
                  <button
                    key={t.id}
                    onClick={() =>
                      setDesign({
                        template: t.id,
                        font: t.preset.font,
                        accent: t.preset.accent,
                        layout: t.preset.layout,
                        bg: "",
                        dark: false,
                      })
                    }
                    className={cn(
                      "relative aspect-[210/297] overflow-hidden rounded-md ring-1 transition-all",
                      active ? "ring-2 ring-primary" : "ring-border hover:ring-primary/40"
                    )}
                  >
                    <CoverLetterThumb template={t} />
                    {active && (
                      <span className="absolute left-1 top-1 grid size-4 place-items-center rounded-full bg-primary text-white">
                        <Check className="size-2.5" />
                      </span>
                    )}
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
                onClick={() => setStart((i) => Math.min(coverLetterTemplates.length - 3, i + 1))}
                aria-label="More styles"
                className="absolute -right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-neutral-800 text-white shadow-md transition-colors hover:bg-neutral-700"
              >
                <ChevronRight className="size-4" />
              </button>
            )}
          </div>
        </PanelGroup>

        {/* Fonts (with spacing) */}
        <PanelGroup icon={Type} title="Fonts">
          <div className="flex gap-1 rounded-xl bg-muted p-1">
            {SPACINGS.map((sp) => {
              const Icon = sp.icon;
              const active = spacing === sp.id;
              return (
                <button
                  key={sp.id}
                  onClick={() => setDesign({ spacing: sp.id })}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors",
                    active ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
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
                    active ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/40"
                  )}
                >
                  <span className="block text-sm font-bold text-foreground" style={{ fontFamily: f.family }}>
                    {f.label}
                  </span>
                  <span className="block text-xs text-muted-foreground">{f.sub}</span>
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
                design.accent === sw.accent && (design.bg || "") === (sw.bg || "");
              return (
                <button
                  key={`${sw.accent}-${sw.bg ?? ""}`}
                  onClick={() => setDesign({ accent: sw.accent, bg: sw.bg ?? "", dark: !!sw.dark })}
                  className="flex flex-col items-center gap-1"
                  aria-label={sw.dark ? "Dark theme" : sw.bg ? `Theme ${sw.accent}` : `Accent ${sw.accent}`}
                >
                  <span
                    className={cn(
                      "grid size-9 place-items-center rounded-xl ring-1 ring-black/5 transition-all",
                      active && "ring-2 ring-primary ring-offset-2"
                    )}
                    style={sw.bg ? { backgroundColor: sw.bg } : undefined}
                  >
                    {sw.dark ? null : (
                      <span
                        className={cn("rounded-lg", sw.bg ? "size-5 rounded-full" : "size-7")}
                        style={{ backgroundColor: sw.accent }}
                      />
                    )}
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
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 rounded-full bg-muted px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted/70"
        >
          <ChevronLeft className="size-4" />
          Edit your letter
        </button>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          {downloading ? "Preparing…" : "Download"}
        </button>
      </div>
    </div>
  );
}
