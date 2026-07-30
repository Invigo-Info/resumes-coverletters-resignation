"use client";

import { useState } from "react";
import { StyleThumbnail } from "./style-thumbnail";
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
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useResumeStore,
  type SpacingId,
  type ColumnsId,
} from "@/lib/store/resume-store";
import { templates, getTemplate, isAtsFriendly } from "@/lib/templates";
import { fontPairsForTemplate, styleStem, FONT_LABELS, FONT_STACK } from "@/lib/font-pairs";
import { RESUME_THEMES, resolveResumeTheme } from "@/lib/resume-themes";

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
export function DesignPanel({
  onBack,
  onNext,
}: {
  onBack: () => void;
  onNext: () => void;
}) {
  const design = useResumeStore((s) => s.design);
  const setDesign = useResumeStore((s) => s.setDesign);
  const templateId = useResumeStore((s) => s.templateId);
  const applyTemplate = useResumeStore((s) => s.applyTemplate);

  // The three font pairs are style-specific: they come from the active template,
  // so switching styles swaps the whole set (never a mix of two styles' fonts).
  const activeTemplate = getTemplate(templateId);
  const fontPairs = activeTemplate ? fontPairsForTemplate(activeTemplate) : [];

  // Template carousel: a FINITE, group-based pager. Styles are shown one group at
  // a time and each arrow moves exactly one group - never wrapping. `page` is the
  // current group index; arrow visibility is derived from the bounds so a visible
  // arrow always means more styles exist in that direction.
  const PER_PAGE = 4;
  const pageCount = Math.max(1, Math.ceil(templates.length / PER_PAGE));
  const [page, setPage] = useState(0);
  const start = page * PER_PAGE;
  const visible = templates.slice(start, start + PER_PAGE);
  const canPrev = page > 0;
  const canNext = page < pageCount - 1;
  const prevPage = () => setPage((p) => Math.max(0, p - 1));
  const nextPage = () => setPage((p) => Math.min(pageCount - 1, p + 1));

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col rounded-2xl bg-card p-6 shadow-card ring-1 ring-border">
      <div className="flex-1 space-y-8 overflow-y-auto pl-2 pr-1.5">
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
                    <StyleThumbnail templateId={t.id} />
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

            {/* Overlaid arrows: each is shown only when styles exist in that
                direction, so the carousel reads as finite (no wrap-around). */}
            {canPrev && (
              <button
                onClick={prevPage}
                aria-label="Previous styles"
                className="absolute -left-1 top-1/2 grid size-9 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-neutral-800/95 text-white shadow-lg outline-none transition-colors hover:bg-neutral-700 focus-visible:ring-3 focus-visible:ring-ring/40"
              >
                <ChevronLeft className="size-5" />
              </button>
            )}
            {canNext && (
              <button
                onClick={nextPage}
                aria-label="Next styles"
                className="absolute -right-1 top-1/2 grid size-9 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-neutral-800/95 text-white shadow-lg outline-none transition-colors hover:bg-neutral-700 focus-visible:ring-3 focus-visible:ring-ring/40"
              >
                <ChevronRight className="size-5" />
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
                  aria-pressed={active}
                  className={cn(
                    "flex min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg py-2.5 text-sm font-medium transition-colors",
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
          <div className="grid grid-cols-3 gap-2.5">
            {fontPairs.map((pair) => {
              // A pair is one atomic choice: Primary (top) + Secondary (bottom).
              const active =
                design.font === pair.primary &&
                (design.fontSecondary ?? design.font) === pair.secondary;
              return (
                <button
                  key={pair.id}
                  onClick={() =>
                    // Apply BOTH fonts as one action and remember this pick for
                    // the active style, so returning to it restores the choice
                    // (never mixing fonts across styles).
                    setDesign({
                      font: pair.primary,
                      fontSecondary: pair.secondary,
                      fontByStyle: activeTemplate
                        ? { ...design.fontByStyle, [styleStem(activeTemplate)]: pair.id }
                        : design.fontByStyle,
                    })
                  }
                  aria-pressed={active}
                  className={cn(
                    "cursor-pointer rounded-xl border px-3 py-3.5 text-left transition-colors sm:px-4 sm:py-4",
                    active
                      ? "border-primary ring-1 ring-primary"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  <span
                    className="block truncate text-sm font-bold text-foreground sm:text-base"
                    style={{ fontFamily: FONT_STACK[pair.primary] }}
                  >
                    {FONT_LABELS[pair.primary]}
                  </span>
                  <span
                    className="mt-0.5 block truncate text-xs text-muted-foreground sm:text-sm"
                    style={{ fontFamily: FONT_STACK[pair.secondary] }}
                  >
                    {FONT_LABELS[pair.secondary]}
                  </span>
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
                    "flex min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg py-2.5 text-sm font-medium transition-colors",
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
          {/* Each swatch is a COMPLETE theme, not one text color: clicking it
              repaints the sidebar, page, headings, dividers and (dark theme) body
              text together in the preview. Each is a rounded card whose FILL is
              the theme's own page background - white for the high-contrast set, a
              pale tint for the tinted set, dark for the Dark theme - so the card
              doubles as a mini page preview, with the accent dot centered on it.
              The active theme gets a blue border + an underline. */}
          <div className="grid grid-cols-8 gap-1.5">
            {RESUME_THEMES.map((t) => {
              const active =
                (resolveResumeTheme(design.themeId, design.color, design.bg)?.id ??
                  null) === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() =>
                    setDesign({ themeId: t.id, color: t.accent, bg: t.contentBg })
                  }
                  className="flex flex-col items-center gap-1.5 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
                  aria-pressed={active}
                  aria-label={`${t.name} theme`}
                >
                  <span
                    className={cn(
                      // The card is fixed-size (aspect-square, fills its grid cell)
                      // so selecting never reflows the row. Its fill previews the
                      // theme page; the dot shows the accent.
                      "grid aspect-square w-full place-items-center rounded-lg border transition-colors",
                      active
                        ? "border-primary ring-1 ring-primary"
                        : "border-border hover:border-primary/40"
                    )}
                    style={{ backgroundColor: t.contentBg || "var(--card)" }}
                  >
                    <span
                      className="size-4 rounded-full ring-1 ring-black/15 sm:size-5"
                      style={{ backgroundColor: t.swatch }}
                    />
                  </span>
                  <span
                    className={cn(
                      "h-0.5 w-4 rounded-full transition-colors",
                      active ? "bg-primary" : "bg-transparent"
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
          onClick={onNext}
          className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          Next
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
