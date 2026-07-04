"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { matchMeta, type JobPosting } from "@/lib/jobs/job-search";
import { CompanyLogo } from "./company-logo";
import { NotInterestedMenu } from "./not-interested-menu";

/** The circular score + "Strong match" label shown on each card. */
export function MatchBadge({ score }: { score: number }) {
  const { label, strong } = matchMeta(score);
  const color = strong ? "#16A34A" : "#D97706";
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="grid size-8 shrink-0 place-items-center rounded-full border-2 text-[11px] font-semibold"
        style={{ borderColor: color, color }}
      >
        {score}
      </span>
      <span className="text-sm font-medium text-foreground">{label}</span>
    </span>
  );
}

/**
 * A single job card in the left list. Shows the logo initial, title, company,
 * location + work model, salary, posted date, the match badge, a Save toggle,
 * and (in Recommended) a Not-interested menu. Selected = blue outline.
 */
export function JobCard({
  job,
  selected,
  saved,
  onSelect,
  onSave,
  onDismiss,
}: {
  job: JobPosting;
  selected: boolean;
  saved: boolean;
  onSelect: () => void;
  onSave: () => void;
  /** Present only in Recommended - renders the Not-interested (X) menu. */
  onDismiss?: (reason: string) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "group cursor-pointer rounded-2xl border bg-card p-4 text-left transition-colors",
        selected
          ? "border-primary ring-2 ring-primary/20"
          : "border-border hover:border-foreground/20"
      )}
    >
      <div className="flex gap-3">
        <CompanyLogo company={job.company} className="size-11 rounded-xl" />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 text-[15px] font-semibold leading-snug text-foreground">
              {job.title}, {job.company}
            </h3>
            <span className="shrink-0 text-xs text-muted-foreground">
              {job.postedLabel}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {job.locationLabel}, {job.mode}
            {job.salaryLabel && job.salaryLabel !== "Salary not disclosed" && (
              <>, {job.salaryLabel}{job.salaryLabel.startsWith("$") ? "/year" : ""}</>
            )}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <MatchBadge score={job.matchScore} />

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSave();
            }}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium transition-colors",
              saved
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
            aria-pressed={saved}
            aria-label={saved ? "Remove saved job" : "Save job"}
          >
            {saved ? (
              <BookmarkCheck className="size-4" />
            ) : (
              <Bookmark className="size-4" />
            )}
            {saved ? "Saved" : "Save"}
          </button>
          {onDismiss && (
            <NotInterestedMenu
              variant="icon"
              ariaLabel={`Not interested in ${job.title}`}
              onDismiss={onDismiss}
            />
          )}
        </div>
      </div>
    </div>
  );
}
