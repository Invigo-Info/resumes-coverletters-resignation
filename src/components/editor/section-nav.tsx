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
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useResumeStore, type SectionKey } from "@/lib/store/resume-store";
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
  const additional = useResumeStore((s) => s.additional);
  const setActive = useResumeStore((s) => s.setActiveSection);
  const moveSection = useResumeStore((s) => s.moveSection);
  const reorderSections = useResumeStore((s) => s.reorderSections);

  const [dragKey, setDragKey] = useState<SectionKey | null>(null);
  const [overKey, setOverKey] = useState<SectionKey | null>(null);

  function commitDrop() {
    if (dragKey && overKey && dragKey !== overKey) reorderSections(dragKey, overKey);
    setDragKey(null);
    setOverKey(null);
  }

  // Resolve label/icon/reorderable for a key: built-in sections come from
  // SECTION_META; user-added ones derive theirs from the additional-section config.
  const metaFor = (key: SectionKey) => {
    if (SECTION_META[key]) return SECTION_META[key];
    const sec = additional.find((a) => a.id === key);
    if (sec) {
      return {
        label: sec.title,
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
        {order.map((key: SectionKey) => {
          const meta = metaFor(key);
          if (!meta) return null;
          const Icon = meta.icon;
          const isActive = key === active;
          const movableIdx = meta.reorderable ? movableKeys.indexOf(key) : -1;
          const canUp = movableIdx > 0;
          const canDown = movableIdx >= 0 && movableIdx < movableKeys.length - 1;
          return (
            <li
              key={key}
              draggable={meta.reorderable}
              onDragStart={() => meta.reorderable && setDragKey(key)}
              onDragOver={(e) => {
                if (!meta.reorderable || !dragKey) return;
                e.preventDefault(); // required, or the drop never fires
                setOverKey(key);
              }}
              onDrop={(e) => {
                if (!meta.reorderable) return;
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
                onClick={() => setActive(key)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors",
                  isActive
                    ? "bg-muted text-foreground"
                    : "text-foreground/80 hover:bg-muted/60"
                )}
              >
                <Icon className="size-4 shrink-0 text-muted-foreground" />
                <span
                  className={cn(
                    "flex-1 truncate",
                    // Room for the drag handle, so a long label never runs under it.
                    meta.reorderable && "pr-6"
                  )}
                >
                  {meta.label}
                </span>
              </button>

              {/* Always-visible drag handle, pinned to the row's right edge.
                  Arrow keys are the pointer-free path, and they reuse
                  moveSection's pinning rules. */}
              {meta.reorderable && (
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
                  className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 cursor-grab place-items-center rounded-md text-muted-foreground/60 outline-none transition-colors hover:bg-muted hover:text-foreground active:cursor-grabbing focus-visible:ring-3 focus-visible:ring-ring/40"
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
