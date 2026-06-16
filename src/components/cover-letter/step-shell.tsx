"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { LogoMark } from "@/components/brand/logo-mark";
import { GhostButton, PrimaryButton } from "@/components/brand/brand-buttons";
import { HomeButton } from "@/components/layout/home-button";
import { HelpPill } from "@/components/layout/help-pill";
import { cn } from "@/lib/utils";
import type { CLPhase } from "@/lib/store/cover-letter-store";

const PHASES: { key: CLPhase; label: string }[] = [
  { key: "add-details", label: "Add details" },
  { key: "personalize", label: "Personalize" },
  { key: "download", label: "Download" },
];

function emojiFor(p: number) {
  if (p < 25) return "🤔";
  if (p < 60) return "🙂";
  if (p < 100) return "😎";
  return "😍";
}

/** Top-right "1 Add details → 2 Personalize → 3 Download" indicator. */
function StepIndicator({ phase }: { phase: CLPhase }) {
  const activeIdx = PHASES.findIndex((p) => p.key === phase);
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-card px-2 py-1.5 text-sm shadow-card ring-1 ring-border">
      {PHASES.map((p, i) => {
        const isActive = i === activeIdx;
        const isDone = i < activeIdx;
        return (
          <div key={p.key} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="size-3.5 text-muted-foreground/60" />}
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium",
                isActive ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "grid size-5 place-items-center rounded-full text-xs font-bold",
                  isActive || isDone
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {i + 1}
              </span>
              <span className={cn("hidden sm:inline", isActive && "font-semibold")}>
                {p.label}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function StepShell({
  phase,
  progress,
  onBack,
  onNext,
  nextLabel = "Next",
  nextDisabled,
  hideBack,
  hideNext,
  children,
}: {
  phase: CLPhase;
  progress?: { message: string; gain: string; percent: number };
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  hideBack?: boolean;
  hideNext?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Minimal header */}
      <header className="flex items-center justify-between px-5 py-4 sm:px-8">
        <div className="flex items-center gap-3">
          <HomeButton className="size-10 rounded-xl" iconClassName="size-[18px]" />
          <Link href="/cover-letters" aria-label="resume.co home">
            <LogoMark withWordmark={false} className="size-7" />
          </Link>
        </div>
        <StepIndicator phase={phase} />
      </header>

      {/* Centered content */}
      <main className="flex flex-1 flex-col items-center px-4 pb-32 pt-6 sm:pt-12">
        <div className="w-full max-w-xl">{children}</div>
      </main>

      {/* Fixed footer: Back · progress · Next */}
      <footer className="fixed inset-x-0 bottom-0 z-30 bg-background/85 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-4 sm:px-6">
          <div className="w-24 shrink-0 sm:w-28">
            {!hideBack && (
              <GhostButton onClick={onBack} disabled={!onBack}>
                <ChevronLeft className="size-4" />
                Back
              </GhostButton>
            )}
          </div>

          {/* Progress (omitted on the Review screen) */}
          {progress ? (
            <div className="mx-auto flex w-full max-w-md items-center gap-3">
              <span className="text-lg leading-none" aria-hidden>
                {emojiFor(progress.percent)}
              </span>
              <div className="flex-1">
                <p className="mb-1 truncate text-xs font-medium text-muted-foreground">
                  {progress.message}{" "}
                  {progress.gain && (
                    <span className="font-semibold text-emerald-600">{progress.gain}</span>
                  )}
                </p>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-progress transition-all duration-500"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
              </div>
              <span className="w-9 text-right text-xs font-semibold text-foreground">
                {progress.percent}%
              </span>
            </div>
          ) : (
            <div className="mx-auto flex-1" />
          )}

          <div className="flex w-24 shrink-0 justify-end sm:w-28">
            {!hideNext && (
              <PrimaryButton onClick={onNext} disabled={nextDisabled || !onNext}>
                {nextLabel}
                <ChevronRight className="size-4" />
              </PrimaryButton>
            )}
          </div>
        </div>
      </footer>

      {/* Help — lifted above the fixed footer so it doesn't overlap Next. */}
      <HelpPill className="bottom-24" />
    </div>
  );
}
