"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CircleDollarSign,
  MapPin,
  Briefcase,
  Building2,
  Trophy,
} from "lucide-react";
import type { JobPosting } from "@/lib/jobs/job-search";
import { buildKeywordMatch } from "@/lib/jobs/keyword-match";
import type { ScoreResume } from "@/lib/jobs/scoreboard";
import { useApplyStore } from "@/lib/store/apply-store";
import { useTailorStore } from "@/lib/store/tailor-store";
import { CompanyLogo } from "./company-logo";
import { KeywordMatchCard } from "./match-scoreboard";
import { ImproveKeywordsFlow } from "./improve-keywords-flow";

/** A single item in the job metadata row. */
function Meta({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {icon}
      {children}
    </span>
  );
}

/** A "Label: value" row in the description's source-metadata footer. */
function FooterRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="font-semibold text-foreground">{label}:</dt>
      <dd className="text-muted-foreground">{value}</dd>
    </div>
  );
}

/**
 * The right-side job detail panel. Header (company logo, posted time, title) with
 * Save + Apply now, a metadata row (salary, location, industry, seniority, work
 * model), the "Job keywords in your resume" match card, and the full job
 * description. Scrolls inside the panel.
 */
export function JobDetail({
  job,
  resume,
  resumeId,
  saved,
  onSave,
}: {
  job: JobPosting;
  resume: ScoreResume;
  /** Id of the resume backing this match, tailored on Continue. */
  resumeId: string;
  saved: boolean;
  onSave: () => void;
}) {
  const router = useRouter();
  const setApplyJob = useApplyStore((s) => s.setJob);
  const setTailor = useTailorStore((s) => s.setTailor);
  const [improveOpen, setImproveOpen] = useState(false);

  // Deterministic keyword match - same source as the ring on the job card.
  const match = useMemo(() => buildKeywordMatch(job, resume), [job, resume]);

  // The job's extracted keywords (what this posting requires), matched-first, for
  // the "Choose keywords to highlight" step.
  const keywordPool = useMemo(
    () => [...match.matched, ...match.missing].slice(0, 15),
    [match]
  );

  // Apply now opens the application-strengthening gateway (not the employer yet),
  // carrying this job as the active apply context.
  const onApply = () => {
    setApplyJob(job);
    router.push("/apply");
  };

  const hasSalary = job.salaryLabel && job.salaryLabel !== "Salary not disclosed";

  return (
    <>
    <div className="rounded-2xl border border-border bg-card">
      {/* Header */}
      <div className="border-b border-border p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 gap-3">
            <CompanyLogo company={job.company} className="size-11 rounded-xl" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{job.postedLabel}</p>
              <h2 className="mt-0.5 text-lg font-bold leading-snug text-foreground">
                {job.title}
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">{job.company}</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onSave}
              aria-pressed={saved}
              className="inline-flex h-9 items-center rounded-full border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              {saved ? "Saved" : "Save"}
            </button>
            <button
              type="button"
              onClick={onApply}
              className="inline-flex h-9 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              Apply now
            </button>
          </div>
        </div>

        {/* Metadata row */}
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          {hasSalary && (
            <Meta icon={<CircleDollarSign className="size-4" />}>
              <span className="font-medium text-foreground">{job.salaryLabel}</span>
            </Meta>
          )}
          <Meta icon={<MapPin className="size-4" />}>{job.locationLabel}</Meta>
          {job.industry && (
            <Meta icon={<Building2 className="size-4" />}>{job.industry}</Meta>
          )}
          {job.seniority && (
            <Meta icon={<Trophy className="size-4" />}>{job.seniority}</Meta>
          )}
          <Meta icon={<Briefcase className="size-4" />}>{job.mode}</Meta>
        </div>
      </div>

      {/* Scrollable body: keyword match card + job description */}
      <div className="max-h-[62vh] space-y-5 overflow-y-auto p-5">
        <KeywordMatchCard match={match} onImprove={() => setImproveOpen(true)} />

        <section>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Job description</h3>
          {job.description ? (
            <div className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {job.description}
            </div>
          ) : (
            <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
              <p>{job.summary}</p>
              {(job.responsibilities?.length ?? 0) > 0 && (
                <div>
                  <p className="mb-1.5 font-medium text-foreground">Responsibilities</p>
                  <ul className="space-y-1.5">
                    {(job.responsibilities ?? []).map((r, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground/60" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(job.qualifications?.length ?? 0) > 0 && (
                <div>
                  <p className="mb-1.5 font-medium text-foreground">Qualifications</p>
                  <ul className="space-y-1.5">
                    {(job.qualifications ?? []).map((q, i) => (
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

          {/* Source metadata footer: normalized structured fields at the end of
              the description (rows are hidden when the value is unavailable). */}
          {(hasSalary || job.industry || job.employmentType || job.mode) && (
            <dl className="mt-5 space-y-1.5 border-t border-border pt-4 text-sm">
              {hasSalary && (
                <FooterRow label="Salary" value={job.salaryLabel} />
              )}
              {job.industry && <FooterRow label="Job Category" value={job.industry} />}
              {job.employmentType && (
                <FooterRow label="Job Type" value={job.employmentType} />
              )}
              {job.mode && <FooterRow label="Job Location" value={job.mode} />}
            </dl>
          )}
        </section>
      </div>
    </div>

    {/* Improve keywords runs the same choose-keywords + loading workflow as the
        /apply "Tailor your resume" flow, then goes to /tailoring - without the
        "Let's make your application stronger" gateway page in between. */}
    <ImproveKeywordsFlow
      open={improveOpen}
      onClose={() => setImproveOpen(false)}
      jobTitle={job.title}
      company={job.company}
      keywords={keywordPool}
      onContinue={(selected, note) => {
        setImproveOpen(false);
        setTailor({
          jobTitle: job.title,
          company: job.company,
          keywords: selected,
          note,
          baseScore: match.score,
          resumeId,
        });
        router.push("/tailoring");
      }}
    />
    </>
  );
}
