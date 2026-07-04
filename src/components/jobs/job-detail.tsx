"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bookmark,
  BookmarkCheck,
  CalendarDays,
  MapPin,
  Laptop,
  Trophy,
} from "lucide-react";
import type { JobPosting } from "@/lib/jobs/job-search";
import { useApplyStore } from "@/lib/store/apply-store";
import { CompanyLogo } from "./company-logo";
import {
  getScoreboard,
  type MatchScoreboard,
  type ScoreResume,
} from "@/lib/jobs/scoreboard";
import { MatchScoreboard as ScoreboardCard } from "./match-scoreboard";
import { NotInterestedMenu } from "./not-interested-menu";

/** A single item in the job metadata row. */
function Meta({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1">
      {icon}
      {children}
    </span>
  );
}

/**
 * The right-side job detail panel. Header + metadata row + actions (Apply now,
 * Save, Not interested), the explainable match Scoreboard (lazy-loaded per job),
 * and the full job description below. Scrolls inside the panel.
 */
export function JobDetail({
  job,
  resume,
  saved,
  onSave,
  onDismiss,
  onTailor,
}: {
  job: JobPosting;
  resume: ScoreResume;
  saved: boolean;
  onSave: () => void;
  /** Present only in Recommended - renders the Not-interested menu. */
  onDismiss?: (reason: string) => void;
  onTailor: (job: JobPosting, scoreboard: MatchScoreboard | null) => void;
}) {
  const router = useRouter();
  const setApplyJob = useApplyStore((s) => s.setJob);
  const [scoreboard, setScoreboard] = useState<MatchScoreboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  // Apply now opens the application-strengthening gateway (not the employer yet),
  // carrying this job as the active apply context.
  const onApply = () => {
    setApplyJob(job);
    router.push("/apply");
  };

  // Lazy-load the scoreboard whenever the selected job changes.
  useEffect(() => {
    let alive = true;
    setScoreboard(null);
    setLoading(true);
    setExpanded(false);
    getScoreboard(job, resume)
      .then((sb) => {
        if (alive) {
          setScoreboard(sb);
          setLoading(false);
        }
      })
      .catch(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [job, resume]);

  const hasSalary = job.salaryLabel && job.salaryLabel !== "Salary not disclosed";

  return (
    <div className="rounded-2xl border border-border bg-card">
      {/* Header */}
      <div className="border-b border-border p-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CompanyLogo
            company={job.company}
            className="size-6 rounded-md"
            initialClassName="text-xs"
          />
          {job.company}
        </div>
        <h2 className="mt-2 text-lg font-bold leading-snug text-foreground">
          {job.title}
        </h2>

        {/* Metadata row */}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
          <Meta icon={<CalendarDays className="size-4" />}>{job.postedLabel}</Meta>
          <Meta icon={<MapPin className="size-4" />}>{job.locationLabel}</Meta>
          <Meta icon={<Laptop className="size-4" />}>{job.mode}</Meta>
          {job.seniority && (
            <Meta icon={<Trophy className="size-4" />}>{job.seniority}</Meta>
          )}
          {hasSalary && <span className="font-medium text-foreground">{job.salaryLabel}</span>}
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onApply}
            className="inline-flex h-9 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            Apply now
          </button>
          <button
            type="button"
            onClick={onSave}
            aria-pressed={saved}
            aria-label={saved ? "Remove saved job" : "Save job"}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            {saved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
            {saved ? "Saved" : "Save"}
          </button>
          {onDismiss && <NotInterestedMenu variant="button" onDismiss={onDismiss} />}
        </div>
      </div>

      {/* Scrollable body: scoreboard + job description */}
      <div className="max-h-[62vh] space-y-5 overflow-y-auto p-5">
        <ScoreboardCard
          scoreboard={scoreboard}
          loading={loading}
          fallbackScore={job.matchScore}
          expanded={expanded}
          onToggle={() => setExpanded((e) => !e)}
          onTailor={() => onTailor(job, scoreboard)}
        />

        <section>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Job description</h3>
          {job.description ? (
            <div className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {job.description}
            </div>
          ) : (
            <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
              <p>{job.summary}</p>
              {job.responsibilities.length > 0 && (
                <div>
                  <p className="mb-1.5 font-medium text-foreground">Responsibilities</p>
                  <ul className="space-y-1.5">
                    {job.responsibilities.map((r, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground/60" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {job.qualifications.length > 0 && (
                <div>
                  <p className="mb-1.5 font-medium text-foreground">Qualifications</p>
                  <ul className="space-y-1.5">
                    {job.qualifications.map((q, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground/60" />
                        {q}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
