"use client";

import { useState } from "react";
import {
  UserRound,
  Phone,
  FileText,
  Briefcase,
  Lightbulb,
  GraduationCap,
  Plus,
  AlignJustify,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Sections that offer AI content generation (a "Write/Improve with AI" draft,
 * AI bullet suggestions, or AI skill suggestions). These get an AI badge in the
 * nav so the user can see at a glance where AI help is available. Sections with
 * only field-level autocomplete are intentionally excluded.
 */
const AI_SECTIONS: ReadonlySet<string> = new Set(["summary", "employment", "skills"]);
import {
  useResumeStore,
  isSectionComplete,
  type SectionKey,
} from "@/lib/store/resume-store";
import { ADDITIONAL_CONFIG } from "./sections/additional-config";

/**
 * Display metadata (label + icon) for the built-in resume sections. `reorderable`
 * marks sections whose order the user can shuffle via the up/down controls.
 * Additional (user-added) sections aren't here - their meta is derived at runtime.
 */
export const SECTION_META: Record<
  string,
  { label: string; icon: LucideIcon; reorderable?: boolean }
> = {
  personal: { label: "Personal details", icon: UserRound },
  contact: { label: "Contact information", icon: Phone },
  summary: { label: "Professional summary", icon: FileText },
  employment: { label: "Employment history", icon: Briefcase, reorderable: true },
  skills: { label: "Skills", icon: Lightbulb, reorderable: true },
  education: { label: "Education", icon: GraduationCap, reorderable: true },
};

/**
 * Sidebar (desktop) section navigation: lists every section in order, lets the
 * user switch the active section, reorder movable ones by drag or arrow keys,
 * and open the "add section" / "reorder sections" flows.
 */
export function SectionNav({
  onAddSection,
  onReorder,
}: {
  onAddSection: () => void;
  onReorder: () => void;
}) {
  const order = useResumeStore((s) => s.sectionOrder);
  const active = useResumeStore((s) => s.activeSection);
  const unlockedSections = useResumeStore((s) => s.unlockedSections);
  // Full state, so each section's status dot can reflect whether it actually
  // holds saved data (green) or is empty (grey) - see isSectionComplete.
  const resume = useResumeStore();
  const additional = useResumeStore((s) => s.additional);
  const setActive = useResumeStore((s) => s.setActiveSection);
  const moveSection = useResumeStore((s) => s.moveSection);
  const reorderSections = useResumeStore((s) => s.reorderSections);

  // The editable per-section titles, so renaming a section's heading updates its
  // label here in the nav too. Read separately (a combined selector would return
  // a new object each render and loop Zustand's store subscription).
  const contactTitle = useResumeStore((s) => s.contactTitle);
  const summaryTitle = useResumeStore((s) => s.summaryTitle);
  const employmentTitle = useResumeStore((s) => s.employmentTitle);
  const skillsTitle = useResumeStore((s) => s.skillsTitle);
  const educationTitle = useResumeStore((s) => s.educationTitle);
  const customTitles: Record<string, string | undefined> = {
    contact: contactTitle,
    summary: summaryTitle,
    employment: employmentTitle,
    skills: skillsTitle,
    education: educationTitle,
  };

  const [dragKey, setDragKey] = useState<SectionKey | null>(null);
  const [overKey, setOverKey] = useState<SectionKey | null>(null);

  function commitDrop() {
    if (dragKey && overKey && dragKey !== overKey) reorderSections(dragKey, overKey);
    setDragKey(null);
    setOverKey(null);
  }

  // Custom sections are numbered in the sidebar (display only) ONLY within a
  // group that shares the same title - e.g. two "Custom section"s become
  // "1 Custom section" / "2 Custom section". A custom section whose title is
  // unique among customs (Projects, Certifications, Awards, ...) reads clearly on
  // its own and gets no number. The number is never part of the stored title.
  const customTitleTotal = new Map<string, number>();
  for (const k of order) {
    const sec = additional.find((a) => a.id === k);
    if (sec?.type === "custom") {
      const t = sec.title.trim();
      customTitleTotal.set(t, (customTitleTotal.get(t) ?? 0) + 1);
    }
  }
  const customTitleSeen = new Map<string, number>();
  const customNumber = new Map<string, number>();
  for (const k of order) {
    const sec = additional.find((a) => a.id === k);
    if (sec?.type === "custom") {
      const t = sec.title.trim();
      const seen = (customTitleSeen.get(t) ?? 0) + 1;
      customTitleSeen.set(t, seen);
      if ((customTitleTotal.get(t) ?? 0) > 1) customNumber.set(sec.id, seen);
    }
  }

  // Resolve label/icon/reorderable for a key: built-in sections come from
  // SECTION_META; user-added ones derive theirs from the additional-section config.
  const metaFor = (key: SectionKey) => {
    const base = SECTION_META[key];
    if (base) {
      // Prefer the user's renamed heading; fall back to the built-in label.
      const custom = customTitles[key]?.trim();
      return custom ? { ...base, label: custom } : base;
    }
    const sec = additional.find((a) => a.id === key);
    if (sec) {
      const num = sec.type === "custom" ? customNumber.get(sec.id) ?? null : null;
      return {
        label: num ? `${num} ${sec.title}` : sec.title,
        icon: ADDITIONAL_CONFIG[sec.type].icon,
        reorderable: true,
      };
    }
    return null;
  };

  // Reorderable sections in order - used to enable/disable the up/down buttons.
  const movableKeys = order.filter((k) => metaFor(k)?.reorderable);

  return (
    <nav className="rounded-2xl bg-card p-2 shadow-card ring-1 ring-border">
      <ul className="relative space-y-0.5">
        {/* Vertical progress rail the completion dots sit on. */}
        <span
          aria-hidden
          className="pointer-events-none absolute right-4 top-5 bottom-5 z-0 w-px bg-border"
        />
        {order.map((key: SectionKey) => {
          const meta = metaFor(key);
          if (!meta) return null;
          const Icon = meta.icon;
          const isActive = key === active;
          // Guided flow: a section is reachable only once the user has advanced
          // to it (via Next). Locked sections render disabled and non-clickable;
          // reordering/dragging is also blocked until a section is unlocked.
          const unlocked = unlockedSections.includes(key);
          // Green dot only when the section genuinely has saved data; an unlocked
          // but empty section stays grey.
          const complete = isSectionComplete(resume, key);
          const canDrag = Boolean(meta.reorderable) && unlocked;
          const movableIdx = meta.reorderable ? movableKeys.indexOf(key) : -1;
          const canUp = movableIdx > 0;
          const canDown = movableIdx >= 0 && movableIdx < movableKeys.length - 1;
          return (
            <li
              key={key}
              draggable={canDrag}
              onDragStart={() => canDrag && setDragKey(key)}
              onDragOver={(e) => {
                if (!canDrag || !dragKey) return;
                e.preventDefault(); // required, or the drop never fires
                setOverKey(key);
              }}
              onDrop={(e) => {
                if (!canDrag) return;
                e.preventDefault();
                commitDrop();
              }}
              onDragEnd={commitDrop}
              className={cn(
                "group relative rounded-xl transition-opacity",
                dragKey === key && "opacity-40",
                overKey === key && dragKey !== key && "ring-2 ring-primary/40"
              )}
            >
              <button
                onClick={() => unlocked && setActive(key)}
                disabled={!unlocked}
                aria-disabled={!unlocked}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl py-2.5 pl-3 pr-8 text-left text-sm font-medium transition-colors",
                  !unlocked
                    ? "cursor-not-allowed text-foreground/40"
                    : isActive
                      ? "bg-muted text-foreground"
                      : "text-foreground/80 hover:bg-muted/60"
                )}
              >
                <Icon
                  className={cn(
                    "size-4 shrink-0",
                    unlocked ? "text-muted-foreground" : "text-foreground/30"
                  )}
                />
                {/* The right padding reserves room for the status dot / drag
                    handle so a long label never runs under it. */}
                <span className="flex-1 truncate">{meta.label}</span>
                {/* AI badge: this section has AI generation available. */}
                {AI_SECTIONS.has(key) && (
                  <span
                    className={cn(
                      "shrink-0",
                      unlocked ? "text-[var(--ai-text)]" : "text-foreground/30"
                    )}
                    title="AI-assisted"
                  >
                    <Sparkles className="size-3.5" aria-hidden />
                    <span className="sr-only">AI-assisted</span>
                  </span>
                )}
              </button>

              {/* Status dot on the progress rail: a solid dark dot for the current
                  section, green when a section holds saved data, and a hollow
                  marker when it is empty or still locked. Fades out while
                  hovering/focusing an unlocked reorderable row so the drag handle
                  can take its place. */}
              <span
                aria-hidden
                className={cn(
                  "pointer-events-none absolute right-3 top-1/2 z-10 size-2.5 -translate-y-1/2 rounded-full transition-all",
                  isActive
                    ? "bg-foreground"
                    : unlocked && complete
                      ? "bg-progress-done"
                      : "border-2 border-muted-foreground/30 bg-card",
                  canDrag && "group-hover:opacity-0 group-focus-within:opacity-0"
                )}
              />

              {/* Drag handle, revealed on hover/focus of an unlocked reorderable
                  row (it overlaps the status dot). Arrow keys are the pointer-free
                  path and reuse moveSection's pinning rules. */}
              {canDrag && (
                <button
                  type="button"
                  aria-label={`Reorder ${meta.label}. Use the up and down arrow keys.`}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowUp" && canUp) {
                      e.preventDefault();
                      moveSection(key, "up");
                    }
                    if (e.key === "ArrowDown" && canDown) {
                      e.preventDefault();
                      moveSection(key, "down");
                    }
                  }}
                  className="absolute right-2 top-1/2 z-20 grid size-6 -translate-y-1/2 cursor-grab place-items-center rounded-md text-muted-foreground/60 opacity-0 outline-none transition-all hover:bg-muted hover:text-foreground group-hover:opacity-100 active:cursor-grabbing focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/40"
                >
                  <AlignJustify className="size-3.5" />
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <button
        onClick={onAddSection}
        className="mt-1 flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
      >
        <Plus className="size-4 shrink-0" />
        Additional section
      </button>

      <div className="mx-2 my-1 border-t border-border" />

      <button
        onClick={onReorder}
        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
      >
        <AlignJustify className="size-4 shrink-0" />
        Reorder sections
      </button>
    </nav>
  );
}
