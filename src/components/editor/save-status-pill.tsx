"use client";

import { CircleCheck, Loader2 } from "lucide-react";
import { useSaveStatusStore } from "@/lib/store/documents-store";
import { cn } from "@/lib/utils";

/**
 * The "Saving… / Saved" pill shown at the bottom-left of the resume preview.
 * Reflects the autosave state: a spinner + "Saving…" while a content edit is
 * being persisted, then a check + "Saved".
 */
export function SaveStatusPill({ className }: { className?: string }) {
  const status = useSaveStatusStore((s) => s.status);
  const saving = status === "saving";

  return (
    <span
      aria-live="polite"
      className={cn(
        // bg-card (not bg-muted): muted-foreground is 4.5:1+ on the card but fails
        // AA on the muted grey; the ring keeps the pill distinct from the preview.
        "absolute bottom-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-card ring-1 ring-border",
        className
      )}
    >
      {saving ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <CircleCheck className="size-3.5" />
      )}
      {saving ? "Saving…" : "Saved"}
    </span>
  );
}
