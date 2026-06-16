"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2 } from "lucide-react";
import { StepShell } from "@/components/cover-letter/step-shell";
import { StepHeading, OptionRadioCard } from "@/components/cover-letter/widgets";
import {
  JobDetailsStep,
  DesiredTitleStep,
  SkillsStep,
  ExperienceStep,
  RecentJobStep,
  EducationStep,
  DegreeStep,
  FieldStep,
  StrengthsStep,
  PersonalStep,
} from "@/components/cover-letter/steps";
import {
  useCoverLetterStore,
  phaseForStep,
  progressForStep,
  stepSequence,
  canProceed,
  type CLStep,
} from "@/lib/store/cover-letter-store";
import {
  COVER_LETTER_WRITE_BASE,
  isCoverLetterSlug,
} from "@/lib/section-routes";

function StepBody({ step }: { step: CLStep }) {
  const setIntent = useCoverLetterStore((s) => s.setJobIntent);
  const intentValue = useCoverLetterStore((s) => s.jobIntent.hasSpecificJob);

  switch (step) {
    case "intent":
      return (
        <div>
          <StepHeading title="Do you have a specific job in mind?" />
          <div className="space-y-3">
            <OptionRadioCard
              icon={<Check className="size-4" />}
              label="Yes"
              selected={intentValue === true}
              onClick={() => setIntent(true)}
            />
            <OptionRadioCard
              icon={<X className="size-4" />}
              label="No"
              selected={intentValue === false}
              onClick={() => setIntent(false)}
            />
          </div>
        </div>
      );
    case "job-details":
      return <JobDetailsStep />;
    case "desired-title":
      return <DesiredTitleStep />;
    case "skills":
      return <SkillsStep />;
    case "experience":
      return <ExperienceStep />;
    case "recent-job":
      return <RecentJobStep />;
    case "education":
      return <EducationStep />;
    case "degree":
      return <DegreeStep />;
    case "field":
      return <FieldStep />;
    case "strengths":
      return <StrengthsStep />;
    case "personal":
      return <PersonalStep />;
    default:
      return null;
  }
}

/**
 * The cover-letter step wizard. When `routedStep` is provided the active step is
 * kept in sync with the URL (/cover-letters/write/<step>), so every step is a
 * shareable, refresh-safe URL.
 */
export function CoverLetterBuilder({ routedStep }: { routedStep?: string }) {
  const router = useRouter();
  const s = useCoverLetterStore();
  const { step } = s;

  // URL -> store: the slug in the path selects the active step.
  useEffect(() => {
    if (!routedStep || !isCoverLetterSlug(routedStep)) return;
    if (routedStep !== useCoverLetterStore.getState().step) {
      s.setStep(routedStep as CLStep);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routedStep]);

  // store -> URL: reflect the active step back into the path (skip the terminal
  // generate/preview steps, which live on the dedicated preview route).
  useEffect(() => {
    if (!routedStep) return;
    if (step === "generate" || step === "preview") return;
    if (step !== routedStep) {
      router.replace(`${COVER_LETTER_WRITE_BASE}/${step}`);
    }
  }, [step, routedStep, router]);

  // Once answers are complete, generation + preview live on the preview route.
  useEffect(() => {
    if (step === "generate" || step === "preview") {
      router.replace("/cover-letter/preview");
    }
  }, [step, router]);

  if (step === "generate" || step === "preview") {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="size-9 animate-spin text-primary" />
      </div>
    );
  }

  // Edit mode (reached from the Review screen): one focused screen that saves
  // back to Review. Data is already persisted live in the store.
  const editMode = s.mode === "edit";
  const returnToReview = () => {
    s.setMode("onboarding");
    router.push("/cover-letter/review");
  };

  const seq = stepSequence(s);
  const idx = seq.indexOf(step);
  const isFirst = idx <= 0;
  const isLastInput = seq[idx + 1] === "generate";

  function handleNext() {
    if (isLastInput) {
      s.setStep("preview");
      router.push("/cover-letter/preview");
    } else {
      s.goNext();
    }
  }

  return (
    <StepShell
      phase={phaseForStep(step)}
      progress={progressForStep(step, s)}
      onBack={
        editMode
          ? returnToReview
          : isFirst
            ? () => router.push("/cover-letter/new")
            : () => s.goBack()
      }
      onNext={editMode ? returnToReview : handleNext}
      nextLabel={editMode ? "Save changes" : "Next"}
      nextDisabled={!canProceed(step, s)}
    >
      <StepBody step={step} />
    </StepShell>
  );
}
