"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  templates,
  templateTabs,
  type TemplateCategory,
} from "@/lib/templates";

/** Per-tab leading glyph keyed by category label. */
const TAB_ICON: Record<string, string> = {
  "All templates": "🖌️",
  "ATS-friendly": "✨",
  Simple: "📄",
  Professional: "💼",
  Student: "🎓",
};

/**
 * Template picker grid with category tabs. Selecting a template routes into the
 * editor pre-seeded with that template id.
 */
export function TemplateGallery() {
  const router = useRouter();
  const [active, setActive] = useState<(typeof templateTabs)[number]>(
    "All templates"
  );

  // Templates shown for the active tab ("All" shows everything; otherwise
  // filter by category). Memoized so the list only recomputes when the tab changes.
  const visible = useMemo(() => {
    if (active === "All templates") return templates;
    return templates.filter((t) =>
      t.categories.includes(active as TemplateCategory)
    );
  }, [active]);

  return (
    <div className="space-y-8">
      {/* Tabs */}
      <div className="flex flex-wrap justify-center gap-2">
        {templateTabs.map((tab) => {
          const isActive = tab === active;
          return (
            <button
              key={tab}
              onClick={() => setActive(tab)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-foreground text-background"
                  : "bg-card text-muted-foreground shadow-card hover:text-foreground"
              )}
            >
              <span aria-hidden>{TAB_ICON[tab]}</span>
              {tab}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((t) => (
          <div key={t.id} className="space-y-3">
            <button
              onClick={() => router.push(`/resumes/write/personal?template=${t.id}`)}
              className="group relative block w-full overflow-hidden rounded-xl bg-card shadow-card ring-1 ring-border transition-all duration-200 hover:-translate-y-1 hover:shadow-card-lg hover:ring-primary/30"
            >
              <div className="relative aspect-[210/297] w-full bg-white">
                <Image
                  src={t.image}
                  alt={`${t.name} template preview`}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover object-top"
                />
              </div>
              {/* Hover overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-foreground/5 opacity-0 backdrop-blur-[1px] transition-opacity group-hover:opacity-100">
                <span className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg">
                  Use this template
                </span>
              </div>
            </button>
            <div className="px-1">
              <p className="text-sm font-semibold text-foreground">{t.name}</p>
              <p className="text-xs text-muted-foreground">
                Used {t.used.toLocaleString()} times
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
