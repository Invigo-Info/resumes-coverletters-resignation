"use client";

import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { StepShell } from "@/components/cover-letter/step-shell";
import { StepHeading } from "@/components/cover-letter/widgets";
import { useCoverLetterStore, type CLStep } from "@/lib/store/cover-letter-store";
import { experienceLabel } from "@/lib/cover-letter/suggestions";

export default function CoverLetterReviewPage() {
  const router = useRouter();
  const s = useCoverLetterStore();
  const setStep = useCoverLetterStore((st) => st.setStep);
  const setMode = useCoverLetterStore((st) => st.setMode);

  function edit(step: CLStep) {
    setMode("edit");
    setStep(step);
    router.push("/cover-letter/builder");
  }

  const education = [s.education.university, s.education.field].filter(Boolean).join(", ");
  const recentJob = [s.recentJob.jobTitle, s.recentJob.company].filter(Boolean).join(", ");
  const experience = s.experience ? `${s.experience} years` : experienceLabel(s.experience);
  const personalLines = [
    s.personal.firstName,
    s.personal.lastName,
    s.personal.email,
    s.personal.phone,
    s.personal.address,
  ].filter(Boolean);

  const rows: { label: string; step: CLStep; content: React.ReactNode }[] = [
    { label: "Education", step: "education", content: education || "—" },
    { label: "Recent job", step: "recent-job", content: recentJob || "—" },
    { label: "Experience", step: "experience", content: experience || "—" },
    { label: "Skills", step: "skills", content: s.skills.join(", ") || "—" },
    { label: "Strengths", step: "strengths", content: s.strengths.join(", ") || "—" },
    {
      label: "Personal details",
      step: "personal",
      content: (
        <div className="space-y-0.5">
          {personalLines.length ? personalLines.map((l, i) => <div key={i}>{l}</div>) : "—"}
        </div>
      ),
    },
  ];

  function continueFlow() {
    setMode("onboarding");
    setStep("intent");
    router.push("/cover-letter/builder");
  }

  return (
    <StepShell
      phase="add-details"
      onBack={() => router.push("/cover-letter/new")}
      onNext={continueFlow}
    >
      <StepHeading
        title="Review your details below"
        subtitle="This information will be used to create your cover letter"
      />

      <div className="overflow-hidden rounded-2xl bg-card shadow-card ring-1 ring-border">
        {rows.map((row, i) => (
          <div
            key={row.label}
            className={`flex items-start gap-4 px-5 py-4 ${i > 0 ? "border-t border-border" : ""}`}
          >
            <span className="w-32 shrink-0 text-sm font-semibold text-foreground">
              {row.label}
            </span>
            <div className="flex-1 text-sm text-neutral-700">{row.content}</div>
            <button
              onClick={() => edit(row.step)}
              aria-label={`Edit ${row.label}`}
              className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Pencil className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </StepShell>
  );
}
