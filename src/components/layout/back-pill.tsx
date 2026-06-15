"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Floating dark "Back" pill, fixed to the bottom-left (mirrors the HelpPill).
 * Navigates to the previous step; falls back to `href` when there's no history.
 */
export function BackPill({
  href = "/resume-creation-menu",
  className,
}: {
  href?: string;
  className?: string;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push(href);
      }}
      className={cn(
        "fixed bottom-5 left-5 z-50 inline-flex items-center gap-2 rounded-full bg-foreground py-2 pl-2 pr-5",
        "text-sm font-semibold text-background shadow-card-lg transition-transform hover:-translate-y-0.5",
        className
      )}
    >
      <span className="grid size-7 place-items-center rounded-full bg-background/15">
        <ChevronLeft className="size-4" />
      </span>
      Back
    </button>
  );
}
