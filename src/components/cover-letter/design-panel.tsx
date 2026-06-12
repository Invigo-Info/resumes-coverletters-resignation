"use client";

import { useState } from "react";
import { Type, Palette, Columns2, Download, Loader2 } from "lucide-react";
import { useCoverLetterStore, type CLFontId } from "@/lib/store/cover-letter-store";
import { downloadCoverLetter } from "@/lib/cover-letter/download";
import { usePaywall } from "@/lib/cover-letter/paywall";
import { cn } from "@/lib/utils";

const FONTS: { id: CLFontId; label: string; family: string }[] = [
  { id: "georgia", label: "Georgia", family: "Georgia, serif" },
  { id: "inter", label: "Inter", family: "var(--font-sans), sans-serif" },
  { id: "garamond", label: "Garamond", family: "'EB Garamond', Garamond, serif" },
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

const STYLES: { id: string; label: string; font: CLFontId; accent: string }[] = [
  { id: "classic", label: "Classic", font: "georgia", accent: "#111827" },
  { id: "modern", label: "Modern", font: "inter", accent: "#2563eb" },
  { id: "elegant", label: "Elegant", font: "garamond", accent: "#0f766e" },
];

function PanelGroup({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
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

export function CoverLetterDesignPanel() {
  const design = useCoverLetterStore((s) => s.design);
  const setDesign = useCoverLetterStore((s) => s.setDesign);
  const [downloading, setDownloading] = useState(false);
  const requestDownload = usePaywall((s) => s.requestDownload);

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
        <PanelGroup icon={Columns2} title="Styles">
          <div className="grid grid-cols-3 gap-2">
            {STYLES.map((st) => {
              const active = design.font === st.font && design.accent === st.accent;
              return (
                <button
                  key={st.id}
                  onClick={() => setDesign({ font: st.font, accent: st.accent })}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-colors",
                    active ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/40"
                  )}
                >
                  <span
                    className="block text-sm font-bold"
                    style={{ fontFamily: FONTS.find((f) => f.id === st.font)?.family, color: st.accent }}
                  >
                    Aa
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">{st.label}</span>
                </button>
              );
            })}
          </div>
        </PanelGroup>

        {/* Fonts */}
        <PanelGroup icon={Type} title="Fonts">
          <div className="grid grid-cols-3 gap-2">
            {FONTS.map((f) => (
              <button
                key={f.id}
                onClick={() => setDesign({ font: f.id })}
                style={{ fontFamily: f.family }}
                className={cn(
                  "rounded-xl border px-3 py-3 text-left transition-colors",
                  design.font === f.id ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/40"
                )}
              >
                <span className="block text-sm font-bold text-foreground">{f.label}</span>
              </button>
            ))}
          </div>
        </PanelGroup>

        {/* Colors */}
        <PanelGroup icon={Palette} title="Colors">
          <div className="flex flex-wrap gap-2.5">
            {COLORS.map((color) => {
              const active = design.accent === color;
              return (
                <button
                  key={color}
                  onClick={() => setDesign({ accent: color })}
                  className={cn(
                    "grid size-9 place-items-center rounded-xl transition-all",
                    active && "ring-2 ring-primary ring-offset-2"
                  )}
                  aria-label={`Accent ${color}`}
                >
                  <span className="size-7 rounded-lg" style={{ backgroundColor: color }} />
                </button>
              );
            })}
          </div>
        </PanelGroup>
      </div>

      {/* Footer */}
      <div className="mt-4 border-t border-border pt-4">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          {downloading ? "Preparing…" : "Download cover letter"}
        </button>
      </div>
    </div>
  );
}
