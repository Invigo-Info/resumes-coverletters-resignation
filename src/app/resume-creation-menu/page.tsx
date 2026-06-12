"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, ScanLine, FileUp, ChevronRight, Loader2, X } from "lucide-react";
import { LogoMark } from "@/components/brand/logo-mark";
import { PageShell } from "@/components/layout/page-shell";
import { HelpPill } from "@/components/layout/help-pill";
import { StartOptionCard } from "@/components/creation/start-option-card";
import { useResumeStore } from "@/lib/store/resume-store";
import { parseResume } from "@/lib/ai/parseResume";

export default function ResumeCreationMenuPage() {
  const router = useRouter();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [showSave, setShowSave] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hydrate = useResumeStore((s) => s.hydrate);

  async function handleUpload() {
    setAnalyzing(true);
    const parsed = await parseResume();
    hydrate(parsed);
    router.push("/builder?source=upload");
  }

  return (
    <PageShell>
      <div className="absolute left-6 top-6">
        <Link href="/dashboard" aria-label="resume.co home">
          <LogoMark />
        </Link>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={() => handleUpload()}
      />

      <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-4">
        <h1 className="mb-12 font-heading text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
          How should we start?
        </h1>

        <div className="w-full space-y-5">
          <StartOptionCard
            icon={<Sparkles className="size-6" />}
            title="Start from scratch"
            subtitle="Our AI helper will guide you"
            onClick={() => router.push("/builder/template")}
          />

          <StartOptionCard
            icon={<ScanLine className="size-6" />}
            title="Upload your resume"
            subtitle="Improve it with AI"
            expanded={uploadOpen}
            onClick={() => setUploadOpen((v) => !v)}
          >
            {uploadOpen && (
              <div className="space-y-3 px-5 pb-5">
                {/* Drag & drop zone */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleUpload();
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-background/60 px-4 py-8 text-center transition-colors hover:border-primary/50"
                >
                  <FileUp className="size-7 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Drag and drop your resume here
                    <br />
                    or{" "}
                    <span className="font-semibold text-primary">choose the file</span>{" "}
                    to upload
                  </span>
                </div>

                {/* Cloud sources */}
                {[
                  { label: "Dropbox", color: "#0061FF" },
                  { label: "Google Drive", color: "#1FA463" },
                ].map((src) => (
                  <button
                    key={src.label}
                    type="button"
                    onClick={() => handleUpload()}
                    className="flex w-full items-center gap-3 rounded-xl bg-secondary px-4 py-3 text-left transition-colors hover:bg-[color-mix(in_oklab,var(--secondary),black_4%)]"
                  >
                    <span
                      className="size-5 shrink-0 rounded-[4px]"
                      style={{ backgroundColor: src.color }}
                      aria-hidden
                    />
                    <span className="flex-1 text-sm font-medium text-foreground">
                      {src.label}
                    </span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </StartOptionCard>
        </div>

        {/* Save your progress (returning users) */}
        {showSave && (
          <div className="mt-8 flex w-full items-center gap-4 rounded-2xl bg-card px-5 py-4 shadow-card ring-1 ring-border">
            <div className="flex-1">
              <p className="font-bold text-foreground">Save your progress</p>
              <p className="text-sm text-muted-foreground">
                Pick up where you left off
              </p>
            </div>
            <button
              onClick={() => router.push("/builder")}
              className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              Continue
            </button>
            <button
              onClick={() => setShowSave(false)}
              aria-label="Dismiss"
              className="grid size-9 place-items-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/70"
            >
              <X className="size-4" />
            </button>
          </div>
        )}
      </div>

      {/* Analyzing overlay */}
      {analyzing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-2xl bg-card px-10 py-12 shadow-card-lg ring-1 ring-border">
            <Loader2 className="size-9 animate-spin text-primary" />
            <p className="text-lg font-semibold text-foreground">
              Analyzing your resume…
            </p>
            <p className="text-sm text-muted-foreground">
              Extracting your details with AI
            </p>
          </div>
        </div>
      )}

      <HelpPill />
    </PageShell>
  );
}
