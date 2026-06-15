"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  Sparkles,
  FileUp,
  ChevronRight,
  Loader2,
  Link2,
  RotateCcw,
} from "lucide-react";
import { LogoMark } from "@/components/brand/logo-mark";
import { PageShell } from "@/components/layout/page-shell";
import { HelpPill } from "@/components/layout/help-pill";
import { HomeButton } from "@/components/layout/home-button";
import { StartOptionCard } from "@/components/creation/start-option-card";
import { useCoverLetterStore } from "@/lib/store/cover-letter-store";
import { parseResumeForCoverLetter } from "@/lib/cover-letter/parse";
import { mockResumes } from "@/lib/mock-data";

export default function CoverLetterNewPage() {
  const router = useRouter();
  const [resumeOpen, setResumeOpen] = useState(true); // Use-your-resume is primary/expanded
  const [uploadOpen, setUploadOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setFlow = useCoverLetterStore((s) => s.setFlow);
  const setStep = useCoverLetterStore((s) => s.setStep);
  const setMode = useCoverLetterStore((s) => s.setMode);
  const hydrate = useCoverLetterStore((s) => s.hydrate);
  const reset = useCoverLetterStore((s) => s.reset);

  // Draft detection — only after mount so the persisted store is hydrated
  // (avoids an SSR/CSR mismatch from reading localStorage during render).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const hasBody = useCoverLetterStore((s) => s.letter.body.trim().length > 0);
  const startedAnswers = useCoverLetterStore((s) => s.jobIntent.hasSpecificJob !== null);
  const draftTitle = useCoverLetterStore((s) => s.jobDetails.desiredJobTitle);
  const hasDraft = mounted && (hasBody || startedAnswers);

  function continueDraft() {
    if (hasBody) router.push("/cover-letter/preview");
    else router.push("/cover-letter/builder");
  }

  function startScratch() {
    reset();
    setFlow("scratch");
    setStep("intent");
    router.push("/cover-letter/builder");
  }

  // Resume / upload flows: parse the resume (live AI, persona fallback),
  // populate the store, then land on the shared Review screen.
  async function startFromResume(
    meta: { sourceResumeId?: string; uploadedFileName?: string },
    flow: "use-resume" | "upload"
  ) {
    setAnalyzing(true);
    reset();
    setFlow(flow, meta);
    setMode("onboarding");
    setStep("intent");
    const parsed = await parseResumeForCoverLetter(flow, meta.sourceResumeId);
    hydrate(parsed);
    router.push("/cover-letter/review");
  }

  return (
    <PageShell>
      <div className="absolute left-6 top-6 flex items-center gap-3">
        <HomeButton className="size-10 rounded-xl" iconClassName="size-[18px]" />
        <Link href="/cover-letters" aria-label="resume.co home">
          <LogoMark />
        </Link>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={() => startFromResume({ uploadedFileName: "resume.pdf" }, "upload")}
      />

      <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-4 py-16">
        {hasDraft && (
          <button
            type="button"
            onClick={continueDraft}
            className="mb-6 flex w-full items-center gap-3 rounded-2xl bg-card px-5 py-4 text-left shadow-card ring-1 ring-border transition-colors hover:ring-primary/40"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <RotateCcw className="size-4" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold text-foreground">
                Continue your draft
              </span>
              <span className="block text-xs text-muted-foreground">
                {draftTitle ? `Cover letter for ${draftTitle}` : "Pick up where you left off"}
              </span>
            </span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>
        )}

        <h1 className="mb-12 text-center font-heading text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
          How will you make your cover letter?
        </h1>

        <div className="w-full space-y-5">
          {/* Use your resume — primary, expandable */}
          <StartOptionCard
            icon={<FileText className="size-6" />}
            title="Use your resume"
            subtitle={mockResumes[0]?.title ?? "Select a saved resume"}
            expanded={resumeOpen}
            onClick={() => setResumeOpen((v) => !v)}
          >
            {resumeOpen && (
              <div className="space-y-2 px-5 pb-5">
                {mockResumes.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => startFromResume({ sourceResumeId: r.id }, "use-resume")}
                    className="flex w-full items-center gap-3 rounded-xl bg-secondary px-4 py-3 text-left transition-colors hover:bg-[color-mix(in_oklab,var(--secondary),black_4%)]"
                  >
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 text-sm font-medium text-foreground">{r.title}</span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </StartOptionCard>

          {/* Start from scratch */}
          <StartOptionCard
            icon={<Sparkles className="size-6" />}
            title="Start from scratch"
            subtitle="Our AI helper will guide you"
            onClick={startScratch}
          />

          {/* Upload a resume — expandable */}
          <StartOptionCard
            icon={<FileUp className="size-6" />}
            title="Upload a resume"
            subtitle="Add a file to use as a base"
            expanded={uploadOpen}
            onClick={() => setUploadOpen((v) => !v)}
          >
            {uploadOpen && (
              <div className="space-y-3 px-5 pb-5">
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    startFromResume({ uploadedFileName: "resume.pdf" }, "upload");
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-background/60 px-4 py-8 text-center transition-colors hover:border-primary/50"
                >
                  <FileUp className="size-7 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Drag and drop your resume here
                    <br />
                    or <span className="font-semibold text-primary">choose the file</span> to upload
                  </span>
                </div>

                {[
                  { label: "Dropbox", color: "#0061FF", icon: null },
                  { label: "Google Drive", color: "#1FA463", icon: null },
                  { label: "LinkedIn profile", color: "#0A66C2", icon: <Link2 className="size-4 text-white" /> },
                ].map((src) => (
                  <button
                    key={src.label}
                    type="button"
                    onClick={() => startFromResume({ uploadedFileName: src.label }, "upload")}
                    className="flex w-full items-center gap-3 rounded-xl bg-secondary px-4 py-3 text-left transition-colors hover:bg-[color-mix(in_oklab,var(--secondary),black_4%)]"
                  >
                    <span
                      className="grid size-5 shrink-0 place-items-center rounded-[4px]"
                      style={{ backgroundColor: src.color }}
                      aria-hidden
                    >
                      {src.icon}
                    </span>
                    <span className="flex-1 text-sm font-medium text-foreground">{src.label}</span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </StartOptionCard>
        </div>
      </div>

      {analyzing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-2xl bg-card px-10 py-12 shadow-card-lg ring-1 ring-border">
            <Loader2 className="size-9 animate-spin text-primary" />
            <p className="text-lg font-semibold text-foreground">Analyzing your resume…</p>
            <p className="text-sm text-muted-foreground">Preparing your details with AI</p>
          </div>
        </div>
      )}

      <HelpPill />
    </PageShell>
  );
}
