"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Home, PenLine, Palette, Download, Loader2, Laugh, CircleCheck } from "lucide-react";
import { ResignationLetterPreview } from "@/components/resignation-letter/resignation-letter-preview";
import { DesignToolbar } from "@/components/resignation-letter/design-toolbar";
import { WriteMode, type Section as WriteSection } from "@/components/resignation-letter/write-mode";
import { useResignationLetterStore, letterCompletion } from "@/lib/store/resignation-letter-store";
import {
  useResignationLetterAutosave,
  useResignationLetterSaveStatus,
} from "@/lib/store/resignation-letter-documents-store";
import { generateResignationLetter } from "@/lib/resignation-letter/ai";
import { bodyToHtml } from "@/lib/resignation-letter/format";
import { cn } from "@/lib/utils";

type Mode = "write" | "design";

// After a successful subscription the user returns to the resignation dashboard.
const RESIGNATION_DASHBOARD = "/resignation-letters";

/** Live autosave pill for the top bar: spins on "Saving...", settles to "Saved". */
function SaveStatusPill() {
  const status = useResignationLetterSaveStatus((s) => s.status);
  const saving = status === "saving";
  return (
    <span
      className="hidden items-center gap-1.5 rounded-2xl bg-card px-3 py-3 text-sm font-medium text-muted-foreground shadow-card ring-1 ring-border sm:inline-flex"
      aria-live="polite"
    >
      {saving ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <CircleCheck className="size-4 text-emerald-600" />
      )}
      {saving ? "Saving..." : "Saved"}
    </span>
  );
}

/**
 * Final resignation-letter screen: Write/Design toggle, autosave to the
 * dashboard, AI body generation on first load, and a Download that starts the
 * Stripe subscription checkout (returning to the resignation dashboard).
 */
export default function ResignationLetterPreviewPage() {
  // useSearchParams must sit under a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <ResignationLetterPreviewContent />
    </Suspense>
  );
}

function ResignationLetterPreviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Opening an existing letter for editing (?mode=write) lands on the writing
  // editor's letter-content section; a fresh/generated letter opens on Design.
  const openInWrite = searchParams.get("mode") === "write";
  // Live progress: how much of the letter's content is filled (updates as the
  // user edits or clears fields and the body in Write mode).
  const percent = useResignationLetterStore(letterCompletion);
  const [mode, setMode] = useState<Mode>(openInWrite ? "write" : "design");
  // Which section Write mode opens on ("Edit your letter" jumps to Letter content).
  const [writeSection, setWriteSection] = useState<WriteSection>(
    openInWrite ? "content" : "personal"
  );
  const [generating, setGenerating] = useState(false);

  // Persist the finished resignation letter into the dashboard's drafts list.
  useResignationLetterAutosave();

  // Generate on mount if we don't already have a letter body.
  useEffect(() => {
    const store = useResignationLetterStore.getState();
    if (store.letter.body.trim()) return;
    setGenerating(true);
    generateResignationLetter({
      fullName: store.fullName,
      employer: store.employer,
      salutation: store.salutation,
      position: store.position,
      submissionDate: store.submissionDate,
      lastWorkingDay: store.lastWorkingDay,
      reason: store.reason,
      otherReasonText: store.otherReasonText,
      reasonText: store.reasonText,
      gratitude: store.gratitude,
      gratitudeText: store.gratitudeText,
      assistance: store.assistance,
      assistanceText: store.assistanceText,
      contacts: store.contacts,
    })
      .then((body) => store.setLetter({ body: bodyToHtml(body) }))
      .finally(() => setGenerating(false));
  }, []);

  // Download is premium: start the Stripe subscription checkout, returning to the
  // resignation-letter dashboard once the payment completes.
  function handleDownload() {
    router.push(`/payment?next=${encodeURIComponent(RESIGNATION_DASHBOARD)}`);
  }

  return (
    <div className="min-h-screen bg-muted/40">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 sm:gap-4">
        <Link
          href="/"
          aria-label="Home"
          className="grid size-10 shrink-0 place-items-center rounded-2xl bg-card shadow-card ring-1 ring-border transition-colors hover:bg-muted"
        >
          <Home className="size-4 text-foreground" />
        </Link>

        {/* Write / Design toggle */}
        <div className="flex items-center gap-1 rounded-2xl bg-card p-1.5 shadow-card ring-1 ring-border">
          {(
            [
              { key: "write", label: "Write", icon: <PenLine className="size-4" /> },
              { key: "design", label: "Design", icon: <Palette className="size-4" /> },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => {
                if (t.key === "write") setWriteSection("personal");
                setMode(t.key);
              }}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
                mode === t.key ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Progress - reflects how much of the letter's content is filled */}
        <div className="hidden items-center gap-3 rounded-2xl bg-card px-4 py-3 shadow-card ring-1 ring-border sm:flex">
          <Laugh className="size-4 text-primary" aria-hidden />
          <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-progress transition-[width] duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-foreground">{percent}%</span>
        </div>

        {/* Autosave status */}
        <SaveStatusPill />

        <button
          onClick={handleDownload}
          disabled={generating}
          className="ml-auto inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          <Download className="size-4" />
          <span className="hidden sm:inline">Download</span>
        </button>
      </div>

      {/* Content */}
      {generating ? (
        <div className="grid min-h-[70vh] place-items-center px-4">
          <div className="flex flex-col items-center gap-4 text-center">
            <Loader2 className="size-9 animate-spin text-primary" />
            <p className="text-lg font-semibold text-foreground">Generating your resignation letter…</p>
            <p className="text-sm text-muted-foreground">Writing with AI</p>
          </div>
        </div>
      ) : mode === "write" ? (
        <WriteMode initialSection={writeSection} onSwitchToDesign={() => setMode("design")} />
      ) : (
        <div className="flex justify-center gap-4 px-4 pb-28 pt-2">
          <div className="sticky top-4 self-start">
            <DesignToolbar />
          </div>
          <div className="min-w-0 flex-1">
            <ResignationLetterPreview variant="page" />
          </div>
        </div>
      )}

      {/* Floating actions: edit the letter or download it */}
      {!generating && mode === "design" && (
        <div className="fixed bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setWriteSection("content");
              setMode("write");
            }}
            className="inline-flex h-12 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background shadow-card-lg transition-colors hover:bg-foreground/90"
          >
            <PenLine className="size-4" />
            Edit your letter
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-card-lg transition-colors hover:bg-primary/90"
          >
            <Download className="size-4" />
            Download
          </button>
        </div>
      )}
    </div>
  );
}
