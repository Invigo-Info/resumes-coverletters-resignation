"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  PenLine,
  MessagesSquare,
  ArrowRight,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { LogoMark } from "@/components/brand/logo-mark";
import { PageShell } from "@/components/layout/page-shell";
import { HomeButton } from "@/components/layout/home-button";
import { HelpPill } from "@/components/layout/help-pill";
import { CompanyLogo } from "@/components/jobs/company-logo";
import { ImproveKeywordsFlow } from "@/components/jobs/improve-keywords-flow";
import { buildKeywordMatch } from "@/lib/jobs/keyword-match";
import type { ScoreResume } from "@/lib/jobs/scoreboard";
import { useApplyStore } from "@/lib/store/apply-store";
import { useCoverLetterStore } from "@/lib/store/cover-letter-store";
import { useResumeStore } from "@/lib/store/resume-store";
import { useTailorStore } from "@/lib/store/tailor-store";

/** Strip HTML tags to plain text. */
const stripHtml = (html: string) =>
  html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

/** One improvement option card on the gateway. */
function OptionCard({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card px-5 py-4 text-left shadow-card transition-colors hover:border-primary-strong"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-tile-strong text-white">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold text-foreground">{title}</span>
        <span className="block text-sm text-muted-foreground">{subtitle}</span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-primary" />
    </button>
  );
}

/**
 * The application-strengthening gateway shown after Apply now on a job.
 * "Let's make your application stronger" - offers Tailor resume, Write a cover
 * letter, Prepare for the interview, or Continue without improvements, all
 * carrying the same selected-job context.
 */
export default function ApplyGatewayPage() {
  const router = useRouter();
  const job = useApplyStore((s) => s.job);
  const patchJobDetails = useCoverLetterStore((s) => s.patchJobDetails);
  const setTailor = useTailorStore((s) => s.setTailor);

  // Resume fields for keyword matching (selected individually to avoid loops).
  const resumeId = useResumeStore((s) => s.id);
  const personalJobTitle = useResumeStore((s) => s.personal.jobTitle);
  const skills = useResumeStore((s) => s.skills);
  const summary = useResumeStore((s) => s.summary);
  const employment = useResumeStore((s) => s.employment);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [flowOpen, setFlowOpen] = useState(false);

  // Build the resume profile + keyword match for the selected job, so the Tailor
  // flow shows the same keywords (and starting score) as the Jobs page.
  const scoreResume = useMemo<ScoreResume>(
    () => ({
      role: personalJobTitle,
      skills: skills.map((sk) => sk.name).filter(Boolean),
      summary: stripHtml(summary),
      experience: employment
        .map((e) => `${e.jobTitle} ${e.company} ${stripHtml(e.description || "")}`)
        .join("\n"),
    }),
    [personalJobTitle, skills, summary, employment]
  );

  const match = useMemo(
    () => (job ? buildKeywordMatch(job, scoreResume) : null),
    [job, scoreResume]
  );
  // The job's extracted keywords (what this posting requires) for the "Choose
  // keywords to highlight" step.
  const keywordPool = useMemo(
    () => (match ? [...match.matched, ...match.missing].slice(0, 15) : []),
    [match]
  );

  // Route "Write a cover letter" into the existing builder, seeded with the job.
  const goCoverLetter = () => {
    if (job) {
      patchJobDetails({
        desiredJobTitle: job.title,
        companyName: job.company,
        jobDescription:
          job.description ||
          [job.summary, ...job.responsibilities, ...job.qualifications].join("\n"),
      });
    }
    router.push("/cover-letter/new");
  };

  const goInterview = () => router.push("/interview-prep");

  const continueExternal = () => {
    if (job?.applyUrl) window.open(job.applyUrl, "_blank", "noopener,noreferrer");
  };

  if (!mounted) {
    return (
      <PageShell>
        <div className="mx-auto grid min-h-screen max-w-xl place-items-center px-4">
          <div className="h-8 w-64 animate-pulse rounded-lg bg-secondary" />
        </div>
      </PageShell>
    );
  }

  // Arrived without a selected job -> guide back to Jobs.
  if (!job) {
    return (
      <PageShell>
        <div className="absolute left-6 top-6 flex items-center gap-3">
          <HomeButton className="size-10 rounded-xl" iconClassName="size-[18px]" />
          <Link href="/" aria-label="resumewriter.ai home">
            <LogoMark />
          </Link>
        </div>
        <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 text-center">
          <h1 className="text-2xl font-bold text-foreground">No job selected</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Pick a job from your recommendations, then choose Apply now to improve
            your application.
          </p>
          <Link
            href="/jobs"
            className="mt-6 inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            Browse jobs
          </Link>
        </div>
        <HelpPill />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="absolute left-6 top-6 flex items-center gap-3">
        <HomeButton className="size-10 rounded-xl" iconClassName="size-[18px]" />
        <Link href="/jobs" aria-label="resumewriter.ai home">
          <LogoMark />
        </Link>
      </div>

      <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-4 py-16">
        {/* Job context */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CompanyLogo
            company={job.company}
            className="size-6 rounded-md"
            initialClassName="text-xs"
          />
          <span className="font-medium text-foreground">{job.title}</span>
          <span>at {job.company}</span>
        </div>

        <h1 className="mt-4 text-center font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Let&apos;s make your application stronger
        </h1>

        <div className="mt-10 w-full space-y-4">
          <OptionCard
            icon={<Sparkles className="size-5" />}
            title="Tailor your resume"
            subtitle="Boost your interview chances 3x"
            onClick={() => setFlowOpen(true)}
          />
          <OptionCard
            icon={<PenLine className="size-5" />}
            title="Write a cover letter"
            subtitle="AI will guide you step by step"
            onClick={goCoverLetter}
          />
          <OptionCard
            icon={<MessagesSquare className="size-5" />}
            title="Prepare for the interview"
            subtitle="Go in confident"
            onClick={goInterview}
          />
        </div>

        {/* Bypass */}
        <button
          type="button"
          onClick={continueExternal}
          disabled={!job.applyUrl}
          className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          Continue without improvements
          {job.applyUrl ? (
            <ExternalLink className="size-4" />
          ) : (
            <ArrowRight className="size-4" />
          )}
        </button>
        {!job.applyUrl && (
          <p className="mt-1 text-xs text-muted-foreground">
            No application link is available for this posting.
          </p>
        )}
      </div>

      <ImproveKeywordsFlow
        open={flowOpen}
        onClose={() => setFlowOpen(false)}
        jobTitle={job.title}
        company={job.company}
        keywords={keywordPool}
        onContinue={(selected, note) => {
          setFlowOpen(false);
          setTailor({
            jobTitle: job.title,
            company: job.company,
            keywords: selected,
            note,
            baseScore: match?.score ?? 0,
            resumeId,
          });
          router.push("/tailoring");
        }}
      />

      <HelpPill />
    </PageShell>
  );
}
