"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Home, PenLine, Palette, Download, Loader2, PartyPopper } from "lucide-react";
import { LogoMark } from "@/components/brand/logo-mark";
import { CoverLetterPreview } from "@/components/cover-letter/cover-letter-preview";
import { CoverLetterDesignPanel } from "@/components/cover-letter/design-panel";
import { WriteMode, type Section as WriteSection } from "@/components/cover-letter/write-mode";
import { HelpPill } from "@/components/layout/help-pill";
import { useCoverLetterStore, letterCompletion } from "@/lib/store/cover-letter-store";
import { useCoverLetterAutosave } from "@/lib/store/cover-letter-documents-store";
import { generateCoverLetter, hasPlaceholder } from "@/lib/cover-letter/ai";
import { bodyToHtml } from "@/lib/cover-letter/format";
import { cn } from "@/lib/utils";

type Mode = "write" | "design";

// After a successful subscription the user returns to the cover-letters dashboard.
const COVER_LETTER_DASHBOARD = "/cover-letters";

/**
 * Final cover-letter screen: toggles between Write and Design modes, autosaves
 * to the dashboard, generates the body on first load, and gates Download behind
 * the paywall.
 */
export default function CoverLetterPreviewPage() {
  // useSearchParams must sit under a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <CoverLetterPreviewContent />
    </Suspense>
  );
}

function CoverLetterPreviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Opening an existing letter for editing (?mode=write) lands on the writing
  // editor's letter-content section; a fresh/generated letter opens on Design.
  const openInWrite = searchParams.get("mode") === "write";
  const s = useCoverLetterStore();
  // Live progress: how much of the letter's content is filled (updates as the
  // user edits or clears fields and the body in Write mode).
  const percent = letterCompletion(s);
  const [mode, setMode] = useState<Mode>(openInWrite ? "write" : "design");
  // Which section Write mode opens on ("Edit your letter" jumps to Letter content).
  const [writeSection, setWriteSection] = useState<WriteSection>(
    openInWrite ? "content" : "personal"
  );
  const [generating, setGenerating] = useState(false);

  // Persist the finished cover letter into the dashboard's drafts list.
  useCoverLetterAutosave();

  // Generate on mount if we don't have a body yet - or regenerate a stale one
  // that still contains an unresolved "[placeholder]" (old format/alignment).
  useEffect(() => {
    const store = useCoverLetterStore.getState();
    if (store.letter.body.trim() && !hasPlaceholder(store.letter.body)) return;
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

  // Download is premium: start the Stripe subscription checkout, returning to the
  // cover-letters dashboard once the payment completes.
  function handleDownload() {
    router.push(`/payment?next=${encodeURIComponent(COVER_LETTER_DASHBOARD)}`);
  }

  return (
    <div className="min-h-screen bg-background">
      <HelpPill />

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

        {/* Progress - reflects how much of the letter's content is filled */}
        <div className="hidden items-center gap-3 rounded-2xl bg-card px-4 py-3 shadow-card ring-1 ring-border sm:flex">
          <PartyPopper className="size-4 text-primary" aria-hidden />
          <div className="h-2.5 w-40 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-progress transition-[width] duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-foreground">{percent}%</span>
        </div>

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
        <WriteMode initialSection={writeSection} onSwitchToDesign={() => setMode("design")} />
      ) : (
        <div className="flex gap-6 px-4 pb-16">
          <aside className="w-full shrink-0 lg:w-[560px]">
            <CoverLetterDesignPanel
              onEdit={() => {
                setWriteSection("content");
                setMode("write");
              }}
            />
          </aside>
          <section className="hidden min-w-0 flex-1 overflow-auto lg:block">
            <CoverLetterPreview />
          </section>
        </div>
      )}
    </div>
  );
}
