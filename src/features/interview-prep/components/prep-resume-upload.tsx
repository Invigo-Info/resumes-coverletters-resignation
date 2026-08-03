"use client";

import { useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { FileUp, FileText, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import {
  UploadingResume,
  type UploadPhase,
} from "@/features/onboarding/components/uploading-resume";
import {
  DropboxIcon,
  GoogleDriveIcon,
  LinkedInIcon,
} from "@/components/common/brand/source-icons";
import { GoogleConsentDialog } from "@/features/onboarding/components/cloud-source-dialogs";
import { LinkedInLinkDialog } from "@/features/onboarding/components/linkedin-link-dialog";
import { cn } from "@/utilities/utils";
import { useResumeStore } from "@/features/resume-builder/store/resume-store";
import {
  saveActiveResume,
  useDocumentsStore,
  type ResumeRecord,
} from "@/features/resume-builder/store/documents-store";
import { useApplyStore } from "@/features/jobs/store/apply-store";
import { parseResume } from "@/services/ai/parseResume";
import { MAX_UPLOAD_HINT, validateUploadFile } from "@/validation/upload-validation";
import {
  isDropboxConfigured,
  chooseFromDropbox,
  fetchDropboxFile,
} from "@/services/storage/dropbox";

/**
 * The interview-prep "Start with your resume" step. The candidate chooses which
 * resume to build the prep from: pick one already saved to their account, or add
 * a new one (device file, cloud source, or LinkedIn). Either choice loads that
 * resume into the editor store and calls `onPicked`, which advances the parent to
 * the "What are you preparing for?" screen.
 */
export function PrepResumeUpload({
  onPicked,
}: {
  /** Fired once a resume is chosen (saved pick or a fresh upload) so the parent
   *  can advance to the prep flow using that resume. */
  onPicked?: () => void;
} = {}) {
  const hydrate = useResumeStore((s) => s.hydrate);
  const reset = useResumeStore((s) => s.reset);
  const loadDocument = useResumeStore((s) => s.loadDocument);
  const savedResumes = useDocumentsStore((s) => s.resumes);
  const setApplyResumeId = useApplyStore((s) => s.setResumeId);
  // Saved resumes lead (expanded) when the user has any; the upload card then
  // starts collapsed as the secondary path. With no saved resumes, upload leads.
  const hasSaved = savedResumes.length > 0;
  const [savedOpen, setSavedOpen] = useState(true);
  const [open, setOpen] = useState(!hasSaved);
  const [phase, setPhase] = useState<UploadPhase | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [googleOpen, setGoogleOpen] = useState(false);
  const [linkedInOpen, setLinkedInOpen] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use an existing saved resume: load it into the editor store so the prep is
  // grounded in its data, remember which one, then advance.
  function useSaved(rec: ResumeRecord) {
    loadDocument(rec.id, rec.data);
    setApplyResumeId(rec.id);
    onPicked?.();
  }

  // Parse the file, hydrate the resume store, then save it as a document. Saving
  // flips the parent's "has resume" gate, which swaps this screen for the prep
  // entry - so there's no explicit navigation here.
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
      setPhase("filling"); // show the parsed resume briefly as fields "fill"
      await new Promise((r) => setTimeout(r, 1800));
      saveActiveResume();
      onPicked?.();
    } catch {
      setPhase(null);
      toast.error("We couldn't read that resume", {
        description:
          "PDF and Word (.docx) work best. If it's an older .doc, save it as .docx or PDF and try again.",
      });
    }
  }

  // Dropbox: opens the real chooser when configured, else falls back to a device
  // file pick (which runs the same upload flow).
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
    <div className="mx-auto max-w-xl">
      <h1 className="text-center font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
        Start with your resume
      </h1>
      <p className="mx-auto mt-3 max-w-md text-center text-muted-foreground">
        AI will scan it to build questions and tips specific to your role
      </p>

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

      {/* Use a saved resume - only when the account has at least one. Lists every
          saved resume; picking one loads it and advances to the prep flow. */}
      {hasSaved && (
        <div className="mt-8">
          <div className="overflow-hidden rounded-2xl bg-card shadow-card ring-1 ring-black/5">
            <button
              type="button"
              onClick={() => setSavedOpen((v) => !v)}
              aria-expanded={savedOpen}
              className="flex w-full cursor-pointer items-center gap-4 px-6 py-5 text-left outline-none"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-white shadow-sm">
                <FileText className="size-5" />
              </span>
              <span className="flex-1">
                <span className="block text-lg font-bold text-foreground">
                  Use a saved resume
                </span>
                <span className="block text-sm text-muted-foreground">
                  From your account
                </span>
              </span>
              <ChevronDown
                className={cn(
                  "size-5 shrink-0 text-primary transition-transform",
                  !savedOpen && "-rotate-90"
                )}
              />
            </button>

            {savedOpen && (
              <div className="px-6 pb-2">
                {savedResumes.map((rec) => (
                  <button
                    key={rec.id}
                    type="button"
                    onClick={() => useSaved(rec)}
                    className="flex w-full cursor-pointer items-center gap-3 border-t border-border py-3.5 text-left outline-none transition-colors hover:bg-muted/50"
                  >
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate text-sm font-semibold text-foreground">
                      {rec.title || "Untitled resume"}
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className={cn(hasSaved ? "mt-4" : "mt-8")}>
        <div className="overflow-hidden rounded-2xl bg-card shadow-card ring-1 ring-black/5">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex w-full cursor-pointer items-center gap-4 px-6 py-5 text-left outline-none"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-white shadow-sm">
              <FileUp className="size-5" />
            </span>
            <span className="flex-1">
              <span className="block text-lg font-bold text-foreground">
                Upload a new resume
              </span>
              <span className="block text-sm text-muted-foreground">
                Add a file from your device
              </span>
            </span>
            <ChevronDown
              className={cn(
                "size-5 shrink-0 text-primary transition-transform",
                !open && "-rotate-90"
              )}
            />
          </button>

          {open && (
            <div className="space-y-3 px-6 pb-6">
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
                  className="flex w-full cursor-pointer items-center gap-3 rounded-xl bg-secondary px-4 py-3.5 text-left transition-colors hover:bg-[color-mix(in_oklab,var(--secondary),black_4%)]"
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
        </div>
      </div>

      {/* Full-screen uploading / filling loader */}
      {phase && <UploadingResume phase={phase} />}

      <GoogleConsentDialog
        open={googleOpen}
        onOpenChange={setGoogleOpen}
        onConsent={() => {
          setGoogleOpen(false);
          signIn("google", { callbackUrl: "/interview-prep" });
        }}
      />

      <LinkedInLinkDialog
        open={linkedInOpen}
        onOpenChange={setLinkedInOpen}
        onImported={() => saveActiveResume()}
      />
    </div>
  );
}
