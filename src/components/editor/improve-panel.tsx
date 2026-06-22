"use client";

import { useState } from "react";
import {
  UserRound,
  Briefcase,
  Mail,
  FileText,
  Lightbulb,
  GraduationCap,
  Plus,
  Download,
  Share2,
  Check,
  Loader2,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import {
  useResumeStore,
  getImproveSuggestions,
  type SectionKey,
} from "@/lib/store/resume-store";
import { GhostButton, PrimaryButton } from "@/components/brand/brand-buttons";
import { downloadResume } from "@/lib/download-pdf";
import { ShareDialog, buildShareUrl } from "@/components/share/share-dialog";
import { cn } from "@/lib/utils";

// Maps each improvement-suggestion key to the icon shown beside it in the
// "Add more details" list. Unknown keys fall back to a Plus icon.
const ITEM_ICON: Record<string, LucideIcon> = {
  firstName: UserRound,
  lastName: UserRound,
  jobTitle: Briefcase,
  email: Mail,
  summary: FileText,
  employment: Briefcase,
  skills: Lightbulb,
  education: GraduationCap,
};

// Static post-completion checklist shown once the resume is fully filled out.
const NEXT_STEPS = [
  "Ask a trusted friend or professional to proofread your resume. You can always share your resume for free.",
  "Using this resume, improve your LinkedIn profile, and consider joining relevant professional groups to connect with potential employers.",
  "Broaden your job search and increase your chances of success by applying to various positions. Apply to at least 5 jobs.",
  "Anticipate common interview questions and practice your responses to showcase your skills and experiences effectively.",
  "Reach out to at least one contact in your professional network for potential job leads and referrals.",
];

/**
 * The Improve tab. Two modes driven by whether any suggestions remain:
 * incomplete shows the weighted "Add more details" list (each item deep-links to
 * its section); complete shows a congratulations screen + a next-steps checklist.
 */
export function ImprovePanel({
  onNavigate,
  onBack,
}: {
  onNavigate: (section: SectionKey) => void;
  onBack: () => void;
}) {
  const s = useResumeStore();
  // Remaining improvement suggestions; an empty list means the resume is complete.
  const todo = getImproveSuggestions(s);
  const complete = todo.length === 0;

  const [downloading, setDownloading] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [done, setDone] = useState<Set<number>>(new Set());

  // Trigger the PDF export, showing a spinner on the button until it resolves.
  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadResume();
    } finally {
      setDownloading(false);
    }
  }

  // Toggle a next-steps checklist item on/off (local, non-persisted UI state).
  function toggleStep(i: number) {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  // ---- Completed state: "Congratulations!" + next-steps checklist ----------
  if (complete) {
    return (
      <div>
        <h1 className="font-heading text-4xl font-extrabold tracking-tight text-foreground">
          Congratulations!
        </h1>
        <p className="mt-2 text-muted-foreground">
          Your resume is complete and ready to impress employers.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {downloading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            {downloading ? "Preparing…" : "Download"}
          </button>
          <button
            onClick={() => setShareOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-card px-5 py-2.5 text-sm font-semibold text-foreground ring-1 ring-border transition-colors hover:bg-muted"
          >
            <Share2 className="size-4" />
            Share
          </button>
        </div>

        <ShareDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          shareUrl={buildShareUrl(s.id)}
          label="resume"
        />

        <div className="my-6 border-t border-border" />

        <h2 className="text-xl font-bold text-foreground">
          Your possible next steps
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          We&apos;ve created this actionable checklist to maximize your success in
          landing your dream job. Try it out to boost your chances!
        </p>

        <ul className="mt-4 divide-y divide-border">
          {NEXT_STEPS.map((step, i) => {
            const checked = done.has(i);
            return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => toggleStep(i)}
                  className="flex w-full items-start gap-3.5 py-4 text-left"
                >
                  <span
                    className={cn(
                      "mt-0.5 grid size-5 shrink-0 place-items-center rounded-[5px] border transition-colors",
                      checked
                        ? "border-primary bg-primary text-white"
                        : "border-input bg-card"
                    )}
                  >
                    {checked && <Check className="size-3.5" />}
                  </span>
                  <span
                    className={cn(
                      "text-sm leading-relaxed transition-colors",
                      checked
                        ? "text-muted-foreground line-through"
                        : "text-foreground"
                    )}
                  >
                    {step}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 flex items-center justify-between gap-4 border-t border-border pt-6">
          <GhostButton onClick={onBack}>
            <ChevronLeft className="size-4" />
            Back
          </GhostButton>
          <PrimaryButton onClick={handleDownload} disabled={downloading}>
            {downloading ? "Preparing…" : "Next"}
            <ChevronRight className="size-4" />
          </PrimaryButton>
        </div>
      </div>
    );
  }

  // ---- Incomplete state: remaining "Add more details" suggestions ----------
  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground">
          Add more details
        </h1>
        <p className="mt-2 text-muted-foreground">
          Including these increases your chances of getting an interview.
        </p>
      </div>

      <div className="space-y-3">
        {todo.map((item) => {
          const Icon = ITEM_ICON[item.key] ?? Plus;
          return (
            <div
              key={item.key}
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5"
            >
              <Icon className="size-5 shrink-0 text-muted-foreground" />
              <span className="flex-1 font-medium text-foreground">
                {item.label}
              </span>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                +{item.weight}%
              </span>
              <button
                onClick={() => onNavigate(item.target)}
                aria-label={`Add ${item.label}`}
                className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Plus className="size-4" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex items-center justify-between gap-4 border-t border-border pt-6">
        <GhostButton onClick={onBack}>
          <ChevronLeft className="size-4" />
          Back
        </GhostButton>
        <PrimaryButton onClick={() => onNavigate(todo[0].target)}>
          Add now
          <ChevronRight className="size-4" />
        </PrimaryButton>
      </div>
    </div>
  );
}
