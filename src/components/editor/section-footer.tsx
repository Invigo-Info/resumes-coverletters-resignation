"use client";

import { ChevronLeft, ChevronRight, AlignJustify } from "lucide-react";
import { useResumeStore } from "@/lib/store/resume-store";
import { GhostButton, PrimaryButton } from "@/components/brand/brand-buttons";

/**
 * Reusable editor footer: Back (left) · Reorder sections (center) · Next (right).
 * Any slot is omitted when its handler isn't provided.
 */
export function EditorFooter({
  onBack,
  onReorder,
  onNext,
  nextLabel = "Next",
}: {
  onBack?: () => void;
  onReorder?: () => void;
  onNext?: () => void;
  nextLabel?: string;
}) {
  return (
    <div className="mt-8 border-t border-border pt-6">
      {/* Back (left, hidden on the first section) · Reorder sections · Next. The
          sections menu (Reorder) stays visible on mobile, matching resume.co. */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          {onBack && (
            <GhostButton onClick={onBack}>
              <ChevronLeft className="size-4" />
              Back
            </GhostButton>
          )}
        </div>

        {onReorder && (
          <button
            onClick={onReorder}
            className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <AlignJustify className="size-4" />
            <span className="sm:hidden">Reorder</span>
            <span className="hidden sm:inline">Reorder sections</span>
          </button>
        )}

        <div className="flex flex-1 justify-end">
          {onNext && (
            <PrimaryButton onClick={onNext}>
              {nextLabel}
              <ChevronRight className="size-4" />
            </PrimaryButton>
          )}
        </div>
      </div>
    </div>
  );
}

export function SectionFooter({
  onReorder,
  onComplete,
}: {
  onReorder: () => void;
  /** Called by Next on the final section (e.g. advance to the Design tab). */
  onComplete?: () => void;
}) {
  const order = useResumeStore((s) => s.sectionOrder);
  const active = useResumeStore((s) => s.activeSection);
  const setActive = useResumeStore((s) => s.setActiveSection);

  const idx = order.indexOf(active);
  const isFirst = idx <= 0;
  const isLast = idx === order.length - 1;

  return (
    <EditorFooter
      onBack={isFirst ? undefined : () => setActive(order[idx - 1])}
      onReorder={onReorder}
      nextLabel={isLast ? "Next: Design" : "Next"}
      // On the final section, Next moves on to the Design step; otherwise to the
      // next section in the editing order.
      onNext={() => {
        if (isLast) onComplete?.();
        else setActive(order[idx + 1]);
      }}
    />
  );
}
