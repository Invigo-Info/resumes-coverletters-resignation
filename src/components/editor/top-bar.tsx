"use client";

import { useState } from "react";
import {
  PenLine,
  Palette,
  BadgeCheck,
  Clock,
  Loader2,
  Download,
  Share2,
  Eye,
  Meh,
  Smile,
  SmilePlus,
  Laugh,
  PartyPopper,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/utilities/utils";
import { useResumeStore, getProgress } from "@/lib/store/resume-store";
import { canDownloadResume, recordResumeDownload } from "@/permissions/resume-download-gate";
import { downloadResume } from "@/services/storage/download-pdf";
import { HomeButton } from "@/components/layout/home-button";
import { ShareDialog, buildShareUrl } from "@/components/share/share-dialog";

/** The three top-level editor stages the TopBar switches between. */
export type EditorTab = "write" | "design" | "improve";

/** Tab definitions (key, label, icon) rendered as the editor stage switcher. */
const TABS: { key: EditorTab; label: string; icon: React.ReactNode }[] = [
  { key: "write", label: "Write", icon: <PenLine className="size-4" /> },
  { key: "design", label: "Design", icon: <Palette className="size-4" /> },
  { key: "improve", label: "Improve", icon: <BadgeCheck className="size-4" /> },
];

/**
 * Motivational stages for the completion bar. The face icon and the bar fill
 * both escalate with the total score (orange/neutral at the start climbing to
 * green/celebrating at 100%): a lucide icon, never an emoji. `max` is the
 * inclusive top of each range, so the first stage whose max is at least the
 * score wins.
 */
const PROGRESS_STAGES = [
  { max: 24, Icon: Meh, bar: "bg-progress-low", text: "text-progress-low" },
  { max: 49, Icon: Smile, bar: "bg-progress-early", text: "text-progress-early" },
  { max: 74, Icon: SmilePlus, bar: "bg-progress-mid", text: "text-progress-mid" },
  { max: 99, Icon: Laugh, bar: "bg-progress-high", text: "text-progress-high" },
  { max: 100, Icon: PartyPopper, bar: "bg-progress-done", text: "text-progress-done" },
] as const;

// The stage whose range contains the current score (falls back to the first).
function stageFor(p: number) {
  return PROGRESS_STAGES.find((s) => p <= s.max) ?? PROGRESS_STAGES[0];
}

/**
 * Editor header: home button, the Write/Design/Improve stage tabs, a live
 * completion progress bar, and the Share + Download actions.
 */
export function TopBar({
  tab,
  onTabChange,
  onPreview,
}: {
  tab: EditorTab;
  onTabChange: (t: EditorTab) => void;
  /** Opens the mobile preview sheet. Only shown on screens without the
   *  side-by-side preview (the button hides itself at xl). */
  onPreview?: () => void;
}) {
  const progress = useResumeStore(getProgress);
  const stage = stageFor(progress);
  const StageIcon = stage.Icon;
  const resumeId = useResumeStore((s) => s.id);
  const router = useRouter();
  const [downloading, setDownloading] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  // Free accounts may download up to 3 distinct resumes; a further one needs a
  // subscription. Premium is unlimited. Over the allowance -> /payment.
  async function handleDownload() {
    if (!canDownloadResume(resumeId)) {
      router.push("/payment");
      return;
    }
    setDownloading(true);
    try {
      await downloadResume();
      recordResumeDownload(resumeId);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:gap-4">
      {/* Home */}
      <HomeButton className="size-13" />

      {/* Tabs: full-width text row on mobile (wraps below), compact on desktop */}
      <div className="order-last flex w-full items-center gap-1 rounded-2xl bg-card p-1.5 shadow-card ring-1 ring-border sm:order-none sm:w-auto sm:shrink-0">
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <button
              key={t.key}
              onClick={() => onTabChange(t.key)}
              className={cn(
                "inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors sm:flex-none sm:px-4",
                active
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="hidden sm:inline-flex">{t.icon}</span>
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Progress - field-completion based: the score, bar width and face icon
          all move the instant real resume information is added. */}
      <div
        className="hidden w-full max-w-sm items-center gap-3 rounded-2xl bg-card px-4 py-3 shadow-card ring-1 ring-border sm:flex"
        role="progressbar"
        aria-label="Resume completion"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <StageIcon className={cn("size-6 shrink-0 transition-colors", stage.text)} aria-hidden />
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-all duration-500", stage.bar)}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="w-10 text-right text-sm font-semibold text-foreground">
          {progress}%
        </span>
      </div>

      {/* Promo badge */}
      <div className="hidden items-center gap-3 xl:flex">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-emerald-600 text-white shadow-sm">
          <Clock className="size-5" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-bold text-foreground">
            Job winning resume in 15 minutes
          </p>
          <p className="text-sm text-muted-foreground">
            Write with AI and format for ATS
          </p>
        </div>
      </div>

      {/* Preview (mobile only) + Share + Download */}
      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
        {onPreview && (
          <button
            onClick={onPreview}
            aria-label="Preview resume"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-card px-4 text-sm font-semibold text-primary ring-1 ring-border transition-colors hover:bg-muted sm:px-5 xl:hidden"
          >
            <Eye className="size-4" />
            <span className="hidden sm:inline">Preview</span>
          </button>
        )}

        <button
          onClick={() => setShareOpen(true)}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-card px-5 text-sm font-semibold text-primary ring-1 ring-border transition-colors hover:bg-muted"
        >
          <Share2 className="size-4" />
          <span className="hidden sm:inline">Share</span>
        </button>

        <ShareDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          shareUrl={buildShareUrl(resumeId)}
          label="resume"
        />

        <button
          onClick={handleDownload}
          disabled={downloading}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {downloading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          <span className="hidden sm:inline">
            {downloading ? "Preparing…" : "Download"}
          </span>
        </button>
      </div>
    </div>
  );
}
