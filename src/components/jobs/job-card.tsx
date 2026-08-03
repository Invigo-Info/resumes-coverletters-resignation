"use client";

import { Heart } from "lucide-react";
import { cn } from "@/utilities/utils";
import type { JobPosting } from "@/lib/jobs/job-search";
import { CompanyLogo } from "./company-logo";
import { ScoreRing } from "./match-scoreboard";
import { NotInterestedMenu } from "./not-interested-menu";

/**
 * A single job card in the left list: company + posted time, the title, location
 * and work model, salary, a heart Save toggle (and a hover-revealed Not
 * interested menu in Recommended), plus the circular match ring in the corner.
 * Selected = blue outline with a tinted background.
 */
export function JobCard({
  job,
  score,
  selected,
  saved,
  onSelect,
  onSave,
  onDismiss,
}: {
  job: JobPosting;
  /** Keyword match score shown in the ring (0-100). */
  score: number;
  selected: boolean;
  saved: boolean;
  onSelect: () => void;
  onSave: () => void;
  /** Present only in Recommended - renders the Not-interested menu on hover. */
  onDismiss?: (reason: string) => void;
}) {
  const hasSalary = job.salaryLabel && job.salaryLabel !== "Salary not disclosed";

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
        "group relative cursor-pointer p-4 text-left transition-colors",
        selected
          ? "bg-secondary"
          : "hover:bg-secondary/40 hover:ring-1 hover:ring-inset hover:ring-primary-strong"
      )}
    >
      <div className="flex gap-3">
        <CompanyLogo company={job.company} className="size-11 rounded-xl" />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 truncate text-xs text-muted-foreground">
              {job.company} &middot; {job.postedLabel}
            </p>

            <div className="flex shrink-0 items-center gap-0.5">
              {onDismiss && (
                <span className="opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                  <NotInterestedMenu
                    variant="icon"
                    ariaLabel={`Not interested in ${job.title}`}
                    onDismiss={onDismiss}
                  />
                </span>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSave();
                }}
                aria-pressed={saved}
                aria-label={saved ? "Remove saved job" : "Save job"}
                className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Heart className={cn("size-4", saved && "fill-primary text-primary")} />
              </button>
            </div>
          </div>

          <h3 className="mt-0.5 text-[15px] font-semibold leading-snug text-foreground">
            {job.title}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {job.locationLabel} &middot; {job.mode}
          </p>
          {hasSalary && (
            <p className="mt-0.5 text-sm text-muted-foreground">{job.salaryLabel}</p>
          )}
        </div>
      </div>

      <div className="mt-2 flex justify-end">
        <ScoreRing score={score} size={44} />
      </div>
    </div>
  );
}
