"use client";

import {
  UserRound,
  Phone,
  FileText,
  Briefcase,
  Lightbulb,
  GraduationCap,
  Plus,
  AlignJustify,
  ChevronUp,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useResumeStore, type SectionKey } from "@/lib/store/resume-store";
import { ADDITIONAL_CONFIG } from "./sections/additional-config";

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
  const activeIdx = order.indexOf(active);

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

  // Reorderable sections in order — used to enable/disable the up/down buttons.
  const movableKeys = order.filter((k) => metaFor(k)?.reorderable);

  return (
    <nav className="rounded-2xl bg-card p-2 shadow-card ring-1 ring-border">
      <ul className="relative space-y-0.5">
        {/* Vertical progress rail */}
        <span
          aria-hidden
          className="absolute right-[18px] top-5 bottom-5 w-px bg-border"
        />
        {order.map((key: SectionKey, idx) => {
          const meta = metaFor(key);
          if (!meta) return null;
          const Icon = meta.icon;
          const isActive = key === active;
          const isDone = idx < activeIdx;
          const movableIdx = meta.reorderable ? movableKeys.indexOf(key) : -1;
          const canUp = movableIdx > 0;
          const canDown = movableIdx >= 0 && movableIdx < movableKeys.length - 1;
          return (
            <li key={key} className="group relative">
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
                <span className="flex-1 truncate">{meta.label}</span>
                {/* rail dot */}
                <span
                  className={cn(
                    "z-10 size-2.5 shrink-0 rounded-full ring-2 ring-card transition-colors",
                    isActive || isDone ? "bg-foreground" : "bg-border"
                  )}
                />
              </button>

              {/* Up/down reorder controls — shown on hover for reorderable rows */}
              {meta.reorderable && (
                <div className="absolute right-2 top-1/2 flex -translate-y-1/2 flex-col overflow-hidden rounded-md bg-card opacity-0 shadow-sm ring-1 ring-border transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                  <button
                    type="button"
                    aria-label={`Move ${meta.label} up`}
                    disabled={!canUp}
                    onClick={() => moveSection(key, "up")}
                    className="grid size-5 place-items-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                  >
                    <ChevronUp className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${meta.label} down`}
                    disabled={!canDown}
                    onClick={() => moveSection(key, "down")}
                    className="grid size-5 place-items-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                  >
                    <ChevronDown className="size-3.5" />
                  </button>
                </div>
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
