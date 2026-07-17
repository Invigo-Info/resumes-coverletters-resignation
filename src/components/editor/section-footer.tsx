"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useResumeStore } from "@/lib/store/resume-store";
import { GhostButton, PrimaryButton } from "@/components/brand/brand-buttons";

/**
 * Reusable editor footer: Back (left) · Next (right). Either slot is omitted
 * when its handler isn't provided.
 */
export function EditorFooter({
  onBack,
  onNext,
  nextLabel = "Next",
}: {
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
}) {
  return (
    <div className="mt-8 border-t border-border pt-6">
      {/* Back (left, hidden on the first section) · Next (right). Wraps rather
          than overflowing on a narrow (280px) screen. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          {onBack && (
            <GhostButton onClick={onBack}>
              <ChevronLeft className="size-4" />
              Back
            </GhostButton>
          )}
        </div>

        <div className="flex min-w-0 flex-1 justify-end">
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

export function SectionFooter() {
  const order = useResumeStore((s) => s.sectionOrder);
  const active = useResumeStore((s) => s.activeSection);
  const setActive = useResumeStore((s) => s.setActiveSection);

  const idx = order.indexOf(active);
  const isFirst = idx <= 0;
  const isLast = idx === order.length - 1;

  return (
    <EditorFooter
      onBack={isFirst ? undefined : () => setActive(order[idx - 1])}
      // After the final section, Next offers the optional extra sections; the
      // picker's own Next then closes out the Write step. Otherwise it just
      // advances to the next section in the editing order.
      onNext={() => setActive(isLast ? "additional" : order[idx + 1])}
    />
  );
}
