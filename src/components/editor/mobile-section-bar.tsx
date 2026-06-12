"use client";

import { useResumeStore, type SectionKey } from "@/lib/store/resume-store";
import { SECTION_META } from "./section-nav";
import { ADDITIONAL_CONFIG } from "./sections/additional-config";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

/** Horizontal, scrollable section switcher shown on screens without the side nav. */
export function MobileSectionBar({ onAdd }: { onAdd: () => void }) {
  const order = useResumeStore((s) => s.sectionOrder);
  const active = useResumeStore((s) => s.activeSection);
  const additional = useResumeStore((s) => s.additional);
  const setActive = useResumeStore((s) => s.setActiveSection);

  const label = (key: SectionKey) => {
    if (SECTION_META[key]) return SECTION_META[key].label;
    const sec = additional.find((a) => a.id === key);
    return sec ? sec.title : key;
  };

  return (
    <div className="mb-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
      {order.map((key) => (
        <button
          key={key}
          onClick={() => setActive(key)}
          className={cn(
            "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
            key === active
              ? "bg-foreground text-background"
              : "bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          {label(key)}
        </button>
      ))}
      <button
        onClick={onAdd}
        className="flex shrink-0 items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <Plus className="size-3.5" />
        Add
      </button>
    </div>
  );
}
