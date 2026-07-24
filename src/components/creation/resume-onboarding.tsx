"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Sparkles, ScanLine, FileUp, ChevronRight, X } from "lucide-react";
import { toast } from "sonner";
import { LogoMark } from "@/components/brand/logo-mark";
import { PageShell } from "@/components/layout/page-shell";
import { HelpPill } from "@/components/layout/help-pill";
import { StartOptionCard } from "@/components/creation/start-option-card";
import {
  UploadingResume,
  type UploadPhase,
} from "@/components/creation/uploading-resume";
import {
  DropboxIcon,
  GoogleDriveIcon,
  LinkedInIcon,
} from "@/components/brand/source-icons";
import { GoogleConsentDialog } from "@/components/creation/cloud-source-dialogs";
import { LinkedInLinkDialog } from "@/components/creation/linkedin-link-dialog";
import { cn } from "@/lib/utils";
import { useResumeStore, type ResumeState } from "@/lib/store/resume-store";
import { parseResume } from "@/lib/ai/parseResume";
import { MAX_UPLOAD_HINT, validateUploadFile } from "@/lib/upload-validation";
import {
  isDropboxConfigured,
  chooseFromDropbox,
  fetchDropboxFile,
} from "@/lib/dropbox";

/** True when the in-progress draft holds anything worth returning to. */
function hasSavedProgress(s: ResumeState): boolean {
  return Boolean(
    s.personal.firstName.trim() ||
      s.personal.lastName.trim() ||
      s.personal.jobTitle.trim() ||
      s.summary.trim() ||
      s.employment.length > 0
  );
}

/**
 * The resume creation onboarding ("How should we start?"). Rendered both as the
 * post-login home landing page (/) and the standalone /resume-creation-menu.
 */
export function ResumeOnboarding() {
  const router = useRouter();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [phase, setPhase] = useState<UploadPhase | null>(null);
  const [dismissedSave, setDismissedSave] = useState(false);
  const [googleOpen, setGoogleOpen] = useState(false);
  const [linkedInOpen, setLinkedInOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hydrate = useResumeStore((s) => s.hydrate);
  const reset = useResumeStore((s) => s.reset);

  // The draft lives in localStorage, so read it only after mount - otherwise the
  // server renders "no progress" and the client disagrees on the first paint.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const progress = useResumeStore(hasSavedProgress);
  const showSave = mounted && progress && !dismissedSave;

  async function handleUpload(file?: File) {
    // Size-check in the browser before uploading. On failure keep the field
    // available and any prior valid selection untouched - just show the message.
    const check = validateUploadFile(file);
    if (!check.valid) {
      setUploadError(check.message);
      return;
    }
    setUploadError("");
    setPhase("uploading");
    try {
      const parsed = await parseResume(file);
      reset(); // start a fresh draft (new id) so we don't overwrite another
      hydrate(parsed);
      // Show the parsed resume briefly while we "fill" the fields, then open
      // the editor.
      setPhase("filling");
      await new Promise((r) => setTimeout(r, 2200));
      router.push("/resumes/write/personal?source=upload");
    } catch {
      setPhase(null);
      toast.error("We couldn't read that resume", {
        description:
          "PDF and Word (.docx) work best. If it's an older .doc, save it as .docx or PDF and try again.",
      });
    }
  }

  // Google Drive: consent gate -> real Google account chooser (NextAuth OAuth).
  function consentToGoogle() {
    setGoogleOpen(false);
    signIn("google", { callbackUrl: "/resumes/write/personal?source=gdrive" });
  }

  // Dropbox: opens the real Dropbox sign-in + file chooser when an app key is
  // configured; otherwise falls back to picking a file from this device.
  async function handleDropbox() {
    if (!isDropboxConfigured()) {
      toast.message("Connect Dropbox to import from there", {
        description:
          "Add NEXT_PUBLIC_DROPBOX_APP_KEY to enable the Dropbox window. Pick a file to upload for now.",
      });
      fileInputRef.current?.click();
      return;
    }
    try {
      const picked = await chooseFromDropbox();
      if (!picked) return; // cancelled
      const file = await fetchDropboxFile(picked.name, picked.link);
      handleUpload(file);
    } catch {
      toast.error("Couldn't import from Dropbox", {
        description: "Please try again or upload the file directly.",
      });
    }
  }

  return (
    <PageShell>
      <div className="absolute left-6 top-6">
        <Link href="/" aria-label="resume.co home">
          <LogoMark />
        </Link>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = ""; // allow re-selecting the same file after a retry
          handleUpload(file);
        }}
      />

      <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center px-4 py-10">
        {/* Heading + options stay optically centred; the resume-progress card is
            anchored near the bottom, well clear of the two choices. */}
        <div className="flex w-full flex-1 flex-col items-center justify-center">
        <h1 className="mb-12 text-center font-heading text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
          How should we start?
        </h1>

        <div className="w-full space-y-5">
          <StartOptionCard
            icon={<Sparkles className="size-6" />}
            iconClassName="bg-tile-strong"
            title="Start from scratch"
            subtitle="Our AI helper will guide you"
            recommended
            onClick={() => {
              reset();
              router.push("/builder/template");
            }}
          />

          <StartOptionCard
            icon={<ScanLine className="size-6" />}
            iconClassName="bg-tile-soft"
            title="Upload your resume"
            subtitle="Improve it with AI"
            expanded={uploadOpen}
            onClick={() => setUploadOpen((v) => !v)}
          >
            {uploadOpen && (
              <div className="space-y-3 px-5 pb-5">
                {/* Drag & drop zone */}
                <div
                  onDragEnter={(e) => {
                    e.preventDefault();
                    setDragActive(true);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (!dragActive) setDragActive(true);
                  }}
                  onDragLeave={(e) => {
                    // Only clear when the pointer actually leaves the zone, not
                    // when it crosses onto a child element inside it.
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      setDragActive(false);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragActive(false);
                    handleUpload(e.dataTransfer.files?.[0]);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "flex w-full cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors",
                    uploadError
                      ? "border-destructive bg-destructive/5"
                      : dragActive
                        ? "border-primary bg-primary/5"
                        : "border-border bg-background/60 hover:border-primary/50"
                  )}
                >
                  <FileUp
                    className={cn(
                      "size-7 transition-colors",
                      dragActive ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  <span className="text-sm text-muted-foreground">
                    Drag and drop your resume here
                    <br />
                    or{" "}
                    <span className="font-semibold text-primary">choose the file</span>{" "}
                    to upload
                  </span>
                </div>

                {/* Size guidance (always visible) + validation error (on a
                    too-large file). */}
                {uploadError ? (
                  <p className="px-1 text-sm font-medium text-destructive">
                    {uploadError}
                  </p>
                ) : (
                  <p className="px-1 text-xs text-muted-foreground">
                    {MAX_UPLOAD_HINT}
                  </p>
                )}

                {/* Cloud sources */}
                {[
                  { label: "Dropbox", Icon: DropboxIcon, onClick: handleDropbox },
                  {
                    label: "Google Drive",
                    Icon: GoogleDriveIcon,
                    onClick: () => setGoogleOpen(true),
                  },
                  {
                    label: "LinkedIn profile",
                    Icon: LinkedInIcon,
                    onClick: () => setLinkedInOpen(true),
                  },
                ].map((src) => (
                  <button
                    key={src.label}
                    type="button"
                    onClick={src.onClick}
                    className="flex w-full items-center gap-3 rounded-xl bg-secondary px-4 py-3.5 text-left transition-colors hover:bg-[color-mix(in_oklab,var(--secondary),black_4%)]"
                  >
                    <src.Icon className="size-5 shrink-0" />
                    <span className="flex-1 text-sm font-semibold text-foreground">
                      {src.label}
                    </span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </StartOptionCard>
        </div>
        </div>

        {/* Save your progress - only for a returning user with an unfinished draft */}
        {showSave && (
          <div className="mt-16 flex w-full items-center gap-4 rounded-2xl bg-card px-5 py-4 shadow-card ring-1 ring-border">
            <div className="flex-1">
              <p className="font-bold text-foreground">Save your progress</p>
              <p className="text-sm text-muted-foreground">Pick up where you left off</p>
            </div>
            <button
              onClick={() => router.push("/resumes/write/personal")}
              className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              Continue
            </button>
            <button
              onClick={() => setDismissedSave(true)}
              aria-label="Dismiss"
              className="grid size-9 place-items-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/70"
            >
              <X className="size-4" />
            </button>
          </div>
        )}
      </div>

      {/* Full-screen uploading / filling loader */}
      {phase && <UploadingResume phase={phase} />}

      <GoogleConsentDialog
        open={googleOpen}
        onOpenChange={setGoogleOpen}
        onConsent={consentToGoogle}
      />

      <LinkedInLinkDialog
        open={linkedInOpen}
        onOpenChange={setLinkedInOpen}
        onImported={() => router.push("/resumes/write/personal?source=linkedin")}
      />

      <HelpPill />
    </PageShell>
  );
}
