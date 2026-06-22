"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { StepShell } from "@/components/resignation-letter/step-shell";
import {
  HeadingStep,
  RecipientStep,
  PositionStep,
  ReasonStep,
  GratitudeStep,
  AssistanceStep,
  ContactsStep,
} from "@/components/resignation-letter/steps";
import {
  useResignationLetterStore,
  stepSequence,
  progressForStep,
  canProceed,
  type RLStep,
} from "@/lib/store/resignation-letter-store";
import { toISODate } from "@/lib/resignation-letter/format";
import {
  RESIGNATION_WRITE_BASE,
  isResignationSlug,
} from "@/lib/section-routes";
import { useResignationLetterAutosave } from "@/lib/store/resignation-letter-documents-store";

/** Maps the active step key to its corresponding step component (the wizard body). */
function StepBody({ step }: { step: RLStep }) {
  switch (step) {
    case "heading":
      return <HeadingStep />;
    case "recipient":
      return <RecipientStep />;
    case "position":
      return <PositionStep />;
    case "reason":
      return <ReasonStep />;
    case "gratitude":
      return <GratitudeStep />;
    case "assistance":
      return <AssistanceStep />;
    case "contacts":
      return <ContactsStep />;
    default:
      return null;
  }
}

/**
 * The resignation-letter step wizard. When `routedStep` is provided the active
 * step is kept in sync with the URL (/resignation-letters/write/<step>), so
 * every step is a shareable, refresh-safe URL.
 */
export function ResignationLetterBuilder({ routedStep }: { routedStep?: string }) {
  const router = useRouter();
  const s = useResignationLetterStore();
  const { step } = s;

  // Persist the working resignation letter into the dashboard's drafts list.
  useResignationLetterAutosave();

  // Prefill account-style defaults on a fresh start (matches the screenshots'
  // pre-filled name / email / two-weeks-notice dates).
  useEffect(() => {
    const store = useResignationLetterStore.getState();
    if (!store.fullName && !store.submissionDate) {
      const today = new Date();
      const lastDay = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
      store.hydrate({
        fullName: "John Mayer",
        contacts: { ...store.contacts, email: "john.mayer17800@gmail.com" },
        submissionDate: toISODate(today),
        lastWorkingDay: toISODate(lastDay),
      });
    }
  }, []);

  // True for the one render where `step` changed because the URL synced it, so
  // the store->URL effect doesn't fire a stale router.replace (page flip/blink).
  const syncingFromUrl = useRef(false);

  // URL -> store: the slug in the path selects the active step.
  useEffect(() => {
    if (!routedStep || !isResignationSlug(routedStep)) return;
    if (routedStep !== useResignationLetterStore.getState().step) {
      syncingFromUrl.current = true;
      s.setStep(routedStep as RLStep);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routedStep]);

  // store -> URL: reflect the active step back into the path (skip the terminal
  // generate/preview steps, which live on the dedicated preview route).
  useEffect(() => {
    if (!routedStep) return;
    if (step === "generate" || step === "preview") return;
    if (syncingFromUrl.current) {
      syncingFromUrl.current = false;
      return;
    }
    if (step !== routedStep) {
      router.replace(`${RESIGNATION_WRITE_BASE}/${step}`);
    }
  }, [step, routedStep, router]);

  // Generation + final document live on the preview route.
  useEffect(() => {
    if (step === "generate" || step === "preview") {
      router.replace("/resignation-letter/preview");
    }
  }, [step, router]);

  if (step === "generate" || step === "preview") {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="size-9 animate-spin text-primary" />
      </div>
    );
  }

  const seq = stepSequence();
  const idx = seq.indexOf(step);
  const isFirst = idx <= 0;
  const isLastInput = seq[idx + 1] === "generate";

  function handleNext() {
    if (isLastInput) {
      s.setStep("preview");
      router.push("/resignation-letter/preview");
    } else {
      s.goNext();
    }
  }

  return (
    <StepShell
      step={step}
      progress={progressForStep(step)}
      onBack={isFirst ? undefined : () => s.goBack()}
      onNext={handleNext}
      nextDisabled={!canProceed(step, s)}
      hideBack={isFirst}
    >
      <StepBody step={step} />
    </StepShell>
  );
}
