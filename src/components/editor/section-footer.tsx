"use client";

import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  useResumeStore,
  isSectionComplete,
  type SectionKey,
} from "@/lib/store/resume-store";
import { GhostButton, PrimaryButton } from "@/components/brand/brand-buttons";
import { cn } from "@/utilities/utils";
import { SECTION_META } from "./section-nav";

/**
 * Reusable editor footer: Back (left) · optional center slot · Next (right).
 * Either button slot is omitted when its handler isn't provided; the center
 * slot (used on mobile for the section-progress rail) is only rendered when
 * `center` is passed.
 */
export function EditorFooter({
  onBack,
  onNext,
  center,
  nextLabel = "Next",
}: {
  onBack?: () => void;
  onNext?: () => void;
  center?: ReactNode;
  nextLabel?: string;
}) {
  return (
    <div className="mt-8 border-t border-border pt-6">
      {/* Back (left, hidden on the first section) · progress dots (center, mobile
          only - desktop shows them in the left nav rail) · Next (right). Wraps
          rather than overflowing on a narrow (280px) screen. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          {onBack && (
            <GhostButton onClick={onBack}>
              <ChevronLeft className="size-4" />
              Back
            </GhostButton>
          )}
        </div>

        {center && (
          <div className="flex min-w-0 flex-1 justify-center lg:hidden">
            {center}
          </div>
        )}

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

/**
 * Mobile section-progress rail: one tappable dot per section, mirroring the
 * desktop left-nav rail. A solid dark dot marks the current section, green marks
 * a section that holds saved data, and a hollow marker marks an empty or still
 * locked section. Locked dots are disabled - the guided flow only unlocks a
 * section once the user has advanced to it.
 */
function SectionProgressDots() {
  const order = useResumeStore((s) => s.sectionOrder);
  const active = useResumeStore((s) => s.activeSection);
  const unlockedSections = useResumeStore((s) => s.unlockedSections);
  const additional = useResumeStore((s) => s.additional);
  const setActive = useResumeStore((s) => s.setActiveSection);
  // Full state so each dot reflects whether its section holds saved data.
  const resume = useResumeStore();

  const labelFor = (key: SectionKey) =>
    SECTION_META[key]?.label ??
    additional.find((a) => a.id === key)?.title ??
    key;

  return (
    <div className="flex max-w-full items-center gap-2 overflow-x-auto px-1 py-1">
      {order.map((key) => {
        const isActive = key === active;
        const unlocked = unlockedSections.includes(key);
        const complete = isSectionComplete(resume, key);
        return (
          <button
            key={key}
            type="button"
            onClick={() => unlocked && setActive(key)}
            disabled={!unlocked}
            aria-current={isActive ? "step" : undefined}
            aria-label={`${labelFor(key)}${
              isActive ? " (current)" : unlocked ? "" : " (locked)"
            }`}
            className={cn(
              "shrink-0 rounded-full outline-none transition-all focus-visible:ring-3 focus-visible:ring-ring/40",
              unlocked ? "cursor-pointer" : "cursor-not-allowed",
              isActive ? "size-2.5" : "size-2",
              isActive
                ? "bg-foreground"
                : unlocked && complete
                  ? "bg-progress-done"
                  : "border-2 border-muted-foreground/30 bg-card"
            )}
          />
        );
      })}
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
      center={<SectionProgressDots />}
    />
  );
}
