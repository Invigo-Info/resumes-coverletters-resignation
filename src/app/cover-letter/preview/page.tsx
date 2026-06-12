"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Home, PenLine, Palette, Download, Loader2 } from "lucide-react";
import { LogoMark } from "@/components/brand/logo-mark";
import { CoverLetterPreview } from "@/components/cover-letter/cover-letter-preview";
import { CoverLetterDesignPanel } from "@/components/cover-letter/design-panel";
import { WriteMode } from "@/components/cover-letter/write-mode";
import { PaywallDialog } from "@/components/cover-letter/paywall-dialog";
import { useCoverLetterStore } from "@/lib/store/cover-letter-store";
import { generateCoverLetter } from "@/lib/cover-letter/ai";
import { bodyToHtml } from "@/lib/cover-letter/format";
import { downloadCoverLetter } from "@/lib/cover-letter/download";
import { usePaywall } from "@/lib/cover-letter/paywall";
import { cn } from "@/lib/utils";

type Mode = "write" | "design";

export default function CoverLetterPreviewPage() {
  const s = useCoverLetterStore();
  const [mode, setMode] = useState<Mode>("design");
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const requestDownload = usePaywall((s) => s.requestDownload);

  // Generate on mount if we don't already have a letter body.
  useEffect(() => {
    const store = useCoverLetterStore.getState();
    if (store.letter.body.trim()) return;
    setGenerating(true);
    generateCoverLetter({
      jobIntent: store.jobIntent,
      jobDetails: store.jobDetails,
      skills: store.skills,
      strengths: store.strengths,
      experience: store.experience,
      recentJob: store.recentJob,
      education: store.education,
      personal: store.personal,
    })
      .then((body) =>
        store.setLetter({
          body: bodyToHtml(body),
          companyName: store.jobDetails.companyName,
          hiringManagerName: store.jobDetails.hiringManagerName,
        })
      )
      .finally(() => setGenerating(false));
  }, []);

  function handleDownload() {
    requestDownload(async () => {
      setDownloading(true);
      try {
        await downloadCoverLetter();
      } finally {
        setDownloading(false);
      }
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <PaywallDialog />

      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 sm:gap-4">
        <Link
          href="/cover-letters"
          aria-label="Home"
          className="grid size-10 shrink-0 place-items-center rounded-2xl bg-card shadow-card ring-1 ring-border"
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
                mode === t.key
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Progress 100% */}
        <div className="hidden items-center gap-3 rounded-2xl bg-card px-4 py-3 shadow-card ring-1 ring-border sm:flex">
          <span className="text-lg leading-none" aria-hidden>😍</span>
          <div className="h-2.5 w-40 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-full rounded-full bg-gradient-progress" />
          </div>
          <span className="text-sm font-semibold text-foreground">100%</span>
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
        <div className="grid min-h-[60vh] place-items-center px-4">
          <div className="flex flex-col items-center gap-4 text-center">
            <Loader2 className="size-9 animate-spin text-primary" />
            <p className="text-lg font-semibold text-foreground">
              Generating your cover letter…
            </p>
            <p className="text-sm text-muted-foreground">Writing with AI</p>
          </div>
        </div>
      ) : mode === "write" ? (
        <WriteMode onSwitchToDesign={() => setMode("design")} />
      ) : (
        <div className="flex gap-6 px-4 pb-16">
          <aside className="w-full shrink-0 lg:w-[380px]">
            <CoverLetterDesignPanel />
          </aside>
          <section className="hidden min-w-0 flex-1 overflow-auto lg:block">
            <CoverLetterPreview />
          </section>
        </div>
      )}
    </div>
  );
}
