"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Home, PenLine, Palette, Download, Loader2 } from "lucide-react";
import { ResignationLetterPreview } from "@/components/resignation-letter/resignation-letter-preview";
import { DesignToolbar } from "@/components/resignation-letter/design-toolbar";
import { WriteMode } from "@/components/resignation-letter/write-mode";
import { PaywallDialog } from "@/components/cover-letter/paywall-dialog";
import { useResignationLetterStore } from "@/lib/store/resignation-letter-store";
import { useResignationLetterAutosave } from "@/lib/store/resignation-letter-documents-store";
import { generateResignationLetter } from "@/lib/resignation-letter/ai";
import { downloadResignationLetter } from "@/lib/resignation-letter/download";
import { bodyToHtml } from "@/lib/resignation-letter/format";
import { usePaywall } from "@/lib/cover-letter/paywall";
import { cn } from "@/lib/utils";

type Mode = "write" | "design";

// Premium upsell bullet points shown in the resignation-letter download paywall.
const PAYWALL_PERKS = [
  "Unlimited resignation letter downloads (PDF & Word)",
  "AI-written letters with the perfect professional tone",
  "All premium fonts, colors, and letterhead themes",
  "Resume, cover letter & resignation letter in one place",
];

/**
 * Final resignation-letter screen: Write/Design toggle, autosave to the
 * dashboard, AI body generation on first load, and paywalled Download.
 */
export default function ResignationLetterPreviewPage() {
  const [mode, setMode] = useState<Mode>("design");
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const requestDownload = usePaywall((s) => s.requestDownload);

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

  // Gate the download through the paywall; the callback runs only when permitted.
  function handleDownload() {
    requestDownload(async () => {
      setDownloading(true);
      try {
        await downloadResignationLetter();
      } finally {
        setDownloading(false);
      }
    });
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <PaywallDialog
        title="Download your resignation letter"
        subtitle="Upgrade to Premium to download and keep your departure polished and professional."
        perks={PAYWALL_PERKS}
      />

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
              onClick={() => setMode(t.key)}
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

        {/* Progress 85% */}
        <div className="hidden items-center gap-3 rounded-2xl bg-card px-4 py-3 shadow-card ring-1 ring-border sm:flex">
          <span className="text-base leading-none" aria-hidden>😋</span>
          <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-[85%] rounded-full bg-gradient-progress" />
          </div>
          <span className="text-sm font-semibold text-foreground">85%</span>
        </div>

        <button
          onClick={handleDownload}
          disabled={downloading || generating}
          className="ml-auto inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          <span className="hidden sm:inline">{downloading ? "Preparing…" : "Download"}</span>
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
        <WriteMode onSwitchToDesign={() => setMode("design")} />
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
            onClick={() => setMode("write")}
            className="inline-flex h-12 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background shadow-card-lg transition-colors hover:bg-foreground/90"
          >
            <PenLine className="size-4" />
            Edit your letter
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-card-lg transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            {downloading ? "Preparing…" : "Download"}
          </button>
        </div>
      )}
    </div>
  );
}
