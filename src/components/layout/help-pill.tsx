"use client";

import { cn } from "@/lib/utils";

/** Persistent floating "Help" pill, fixed to the bottom-right on every screen. */
export function HelpPill({ className }: { className?: string }) {
  return (
    <button
      type="button"
      className={cn(
        "fixed bottom-5 right-5 z-50 rounded-full bg-card px-5 py-2.5 text-sm font-medium",
        "text-foreground shadow-card-lg ring-1 ring-border transition-transform hover:-translate-y-0.5",
        className
      )}
    >
      Help
    </button>
  );
}
