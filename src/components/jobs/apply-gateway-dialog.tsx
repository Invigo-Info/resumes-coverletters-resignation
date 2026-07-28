"use client";

import type { ReactNode } from "react";
import { Sparkles, Mail, PenLine, SkipForward, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { CompanyLogo } from "./company-logo";
import { cn } from "@/lib/utils";
import type { JobPosting } from "@/lib/jobs/job-search";

/** One selectable path in the apply gateway. */
function GatewayOption({
  icon,
  iconClassName,
  title,
  subtitle,
  onClick,
  muted,
}: {
  icon: ReactNode;
  iconClassName?: string;
  title: string;
  subtitle: string;
  onClick: () => void;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card px-5 py-4 text-left shadow-card transition-all hover:border-primary-strong hover:shadow-card-lg motion-safe:hover:-translate-y-0.5"
    >
      <span
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-xl",
          iconClassName ?? "bg-primary text-white"
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold text-foreground">
          {title}
        </span>
        <span className="block text-sm text-muted-foreground">{subtitle}</span>
      </span>
      <ChevronRight
        className={cn(
          "size-5 shrink-0",
          muted ? "text-muted-foreground" : "text-primary"
        )}
      />
    </button>
  );
}

/**
 * "Boost your chances to get noticed" - the apply gateway shown as a modal when
 * the user clicks Apply now on a job. Three paths: tailor the resume (add
 * keywords), generate a cover letter, or skip straight to the job posting.
 */
export function ApplyGatewayDialog({
  open,
  onOpenChange,
  job,
  onTailor,
  onCoverLetter,
  onWriteCoverLetter,
  onSkip,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: JobPosting;
  onTailor: () => void;
  onCoverLetter: () => void;
  onWriteCoverLetter: () => void;
  onSkip: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="rounded-3xl p-6 pt-10 sm:max-w-xl sm:p-8 sm:pt-10"
        overlayClassName="bg-black/40"
      >
        <DialogTitle className="text-center font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Boost your chances to get noticed
        </DialogTitle>

        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <CompanyLogo
            company={job.company}
            className="size-5 rounded-md"
            initialClassName="text-[10px]"
          />
          <span>
            <span className="font-medium text-foreground">{job.title}</span>
            {job.company ? `, ${job.company}` : ""}
          </span>
        </div>

        <div className="mt-2 space-y-3">
          <GatewayOption
            icon={<Sparkles className="size-5" />}
            title="Tailor your resume"
            subtitle="Add keywords and pass filters"
            onClick={onTailor}
          />
          <GatewayOption
            icon={<Mail className="size-5" />}
            title="Generate a cover letter"
            subtitle="Show your interest in the role"
            onClick={onCoverLetter}
          />
          <GatewayOption
            icon={<PenLine className="size-5" />}
            title="Write a cover letter"
            subtitle="AI will guide you step by step"
            onClick={onWriteCoverLetter}
          />
          <GatewayOption
            icon={<SkipForward className="size-5" />}
            iconClassName="bg-muted text-muted-foreground"
            title="Skip and apply"
            subtitle="Open job posting"
            onClick={onSkip}
            muted
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
