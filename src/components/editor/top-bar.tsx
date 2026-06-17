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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useResumeStore, getProgress } from "@/lib/store/resume-store";
import { downloadResume } from "@/lib/download-pdf";
import { HomeButton } from "@/components/layout/home-button";
import { ShareDialog, buildShareUrl } from "@/components/share/share-dialog";

export type EditorTab = "write" | "design" | "improve";

const TABS: { key: EditorTab; label: string; icon: React.ReactNode }[] = [
  { key: "write", label: "Write", icon: <PenLine className="size-4" /> },
  { key: "design", label: "Design", icon: <Palette className="size-4" /> },
  { key: "improve", label: "Improve", icon: <BadgeCheck className="size-4" /> },
];

function emojiFor(p: number) {
  if (p < 34) return "🤔";
  if (p < 67) return "🙂";
  return "😄";
}

export function TopBar({
  tab,
  onTabChange,
}: {
  tab: EditorTab;
  onTabChange: (t: EditorTab) => void;
}) {
  const progress = useResumeStore(getProgress);
  const resumeId = useResumeStore((s) => s.id);
  const [downloading, setDownloading] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadResume();
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 sm:gap-4">
      {/* Home */}
      <HomeButton className="size-13" />

      {/* Tabs */}
      <div className="flex shrink-0 items-center gap-1 rounded-2xl bg-card p-1.5 shadow-card ring-1 ring-border">
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <button
              key={t.key}
              onClick={() => onTabChange(t.key)}
              aria-label={t.label}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors sm:px-4",
                active
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Progress */}
      <div className="hidden w-full max-w-sm items-center gap-3 rounded-2xl bg-card px-4 py-3 shadow-card ring-1 ring-border sm:flex">
        <span className="text-lg leading-none" aria-hidden>
          {emojiFor(progress)}
        </span>
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-progress transition-all duration-500"
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

      {/* Share + Download */}
      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
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
