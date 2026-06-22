"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { LogoMark } from "@/components/brand/logo-mark";
import { GhostButton, PrimaryButton } from "@/components/brand/brand-buttons";
import { HelpPill } from "@/components/layout/help-pill";
import { HomeButton } from "@/components/layout/home-button";
import { ResignationLetterPreview } from "./resignation-letter-preview";
import {
  RL_STEPPER_STEPS,
  RL_STEP_LABEL,
  type RLStep,
} from "@/lib/store/resignation-letter-store";
import { cn } from "@/lib/utils";

/** Pick a reaction glyph for the header progress display based on percent complete. */
function emojiFor(p: number) {
  if (p < 25) return "🤔";
  if (p < 60) return "🙂";
  if (p < 100) return "😎";
  return "😍";
}

/** Top 7-segment stepper; the active segment is green with its label beneath. */
function Stepper({ step }: { step: RLStep }) {
  const activeIdx = RL_STEPPER_STEPS.indexOf(step);
  return (
    <div className="flex items-start justify-center gap-2">
      {RL_STEPPER_STEPS.map((st, i) => {
        const isActive = i === activeIdx;
        const isDone = i < activeIdx;
        return (
          <div key={st} className="flex flex-col items-center gap-1">
            <span
              className={cn(
                "h-1.5 rounded-full transition-all",
                isActive ? "w-14 bg-emerald-500" : "w-10",
                isDone ? "bg-neutral-800" : !isActive && "bg-neutral-200"
              )}
            />
            {isActive && (
              <span className="whitespace-nowrap text-xs font-semibold text-emerald-600">
                {RL_STEP_LABEL[st]}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Shared layout for every resignation-letter wizard step: header with logo,
 * stepper and progress, a two-pane body (form + live preview), and a fixed
 * Back / Next footer.
 */
export function StepShell({
  step,
  progress,
  onBack,
  onNext,
  nextLabel = "Next",
  nextDisabled,
  hideBack,
  children,
}: {
  step: RLStep;
  progress: { label: string; percent: number };
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  hideBack?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header: logo · stepper · percent + emoji */}
      <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-5 py-4 sm:px-8">
        <div className="flex w-fit items-center gap-3">
          <HomeButton className="size-10 rounded-xl" iconClassName="size-[18px]" />
          <Link href="/resignation-letters" aria-label="resume.co home" className="w-fit">
            <LogoMark withWordmark={false} className="size-7" />
          </Link>
        </div>

        <Stepper step={step} />

        <div className="flex items-center justify-end gap-2">
          <span className="text-sm font-semibold text-foreground">{progress.percent}%</span>
          <span
            className="grid size-8 place-items-center rounded-xl bg-card text-base shadow-card ring-1 ring-border"
            aria-hidden
          >
            {emojiFor(progress.percent)}
          </span>
        </div>
      </header>

      {/* Two-pane body: form (left) + live preview (right) */}
      <main className="flex flex-1 justify-center px-4 pb-32 pt-8 sm:pt-14">
        <div className="flex w-full max-w-5xl gap-10 lg:gap-16">
          <div className="w-full max-w-xl">{children}</div>
          <aside className="hidden w-[360px] shrink-0 lg:block">
            <ResignationLetterPreview variant="card" />
          </aside>
        </div>
      </main>

      {/* Fixed footer: Back (left of center) · Next (centered) */}
      <footer className="fixed inset-x-0 bottom-0 z-30 bg-background/85 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center px-4 py-4 sm:px-6">
          <div className="w-28 shrink-0">
            {!hideBack && (
              <GhostButton onClick={onBack} disabled={!onBack}>
                <ChevronLeft className="size-4" />
                Back
              </GhostButton>
            )}
          </div>

          <div className="mx-auto">
            <PrimaryButton onClick={onNext} disabled={nextDisabled || !onNext}>
              {nextLabel}
              <ChevronRight className="size-4" />
            </PrimaryButton>
          </div>

          <div className="w-28 shrink-0" />
        </div>
      </footer>

      <HelpPill />
    </div>
  );
}
