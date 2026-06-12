"use client";

import { useEffect } from "react";
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

export default function ResignationLetterBuilderPage() {
  const router = useRouter();
  const s = useResignationLetterStore();
  const { step } = s;

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

  // Generation + final document live on the preview route (built in Phases 5–6).
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
