"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PhoneCall,
  UserRound,
  Wrench,
  MoreHorizontal,
  Loader2,
  Download,
  ChevronRight,
  Sparkles,
  Check,
  Globe,
  ExternalLink,
  MessageSquareQuote,
} from "lucide-react";
import { CompanyLogo } from "@/components/jobs/company-logo";
import { useApplyStore } from "@/lib/store/apply-store";
import { useResumeStore } from "@/lib/store/resume-store";
import type { ScoreResume } from "@/lib/jobs/scoreboard";
import {
  getInterviewPrep,
  getMoreQuestions,
  INTERVIEW_TYPES,
  type InterviewType,
  type InterviewPrep,
} from "@/lib/interview/interview-prep";

const stripHtml = (s: string) =>
  s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const TYPE_ICON: Record<InterviewType, React.ReactNode> = {
  screening: <PhoneCall className="size-5" />,
  manager: <UserRound className="size-5" />,
  technical: <Wrench className="size-5" />,
  other: <MoreHorizontal className="size-5" />,
};

const LOADING_COPY = [
  "Analyzing the role",
  "Reviewing your background",
  "Preparing your questions",
];

// Vivid, rotating gradients for the colour-coded question cards (white text).
// Stops are kept dark enough (600-800 range) that white body text stays >= 4.5:1.
const Q_GRADIENTS = [
  "from-[#7E22CE] to-[#A21CAF]",
  "from-[#0E7490] to-[#0F766E]",
  "from-[#4F46E5] to-[#7C3AED]",
  "from-[#BE185D] to-[#7C3AED]",
];

// Muted gradients for the "questions you get to ask" cards (green / slate).
const CQ_GRADIENTS = ["from-[#0F766E] to-[#047857]", "from-[#475569] to-[#334155]"];

/** A titled card used throughout the generated prep page. */
function Card({
  title,
  icon,
  children,
  className = "",
}: {
  title?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-border bg-card p-5 ${className}`}>
      {title && (
        <div className="mb-3 flex items-center gap-2">
          {icon}
          <h2 className="text-base font-bold text-foreground">{title}</h2>
        </div>
      )}
      {children}
    </section>
  );
}

/** A full-bleed gradient section with white text (values, mentions, company). */
function GradientCard({
  title,
  gradient,
  children,
}: {
  title: string;
  gradient: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-2xl bg-linear-to-br ${gradient} p-5 shadow-card`}>
      <h2 className="mb-3 text-base font-bold text-white">{title}</h2>
      {children}
    </section>
  );
}

/** One labelled fact in the company card (Founded / HQ / Employees). */
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

/**
 * The Interview prep experience: pick an interview type for the job the user is
 * applying to, then generate a job-specific prep sheet (company context, role
 * analysis, likely questions with guidance, questions to ask, download + apply).
 */
export function InterviewPrepView() {
  const router = useRouter();
  const job = useApplyStore((s) => s.job);
  const activeRole = useResumeStore((s) => s.personal.jobTitle);
  const activeSkills = useResumeStore((s) => s.skills);
  const activeSummary = useResumeStore((s) => s.summary);
  const activeEmployment = useResumeStore((s) => s.employment);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [type, setType] = useState<InterviewType | null>(null);
  const [otherExpanded, setOtherExpanded] = useState(false);
  const [customText, setCustomText] = useState("");
  const [prep, setPrep] = useState<InterviewPrep | null>(null);
  const [loading, setLoading] = useState(false);
  const [moreLoading, setMoreLoading] = useState(false);
  const [copyIndex, setCopyIndex] = useState(0);

  useEffect(() => {
    if (!loading) return;
    const t = setInterval(
      () => setCopyIndex((i) => (i + 1) % LOADING_COPY.length),
      1400
    );
    return () => clearInterval(t);
  }, [loading]);

  const resume = useMemo<ScoreResume>(() => {
    const role =
      activeRole.trim() ||
      activeEmployment.find((e) => e.jobTitle.trim())?.jobTitle ||
      "";
    return {
      role,
      skills: activeSkills.map((s) => s.name).filter(Boolean),
      summary: stripHtml(activeSummary || ""),
      experience: activeEmployment
        .map((e) => `${e.jobTitle} ${e.company} ${stripHtml(e.description || "")}`)
        .join("\n"),
    };
  }, [activeRole, activeSkills, activeSummary, activeEmployment]);

  const generate = async (t: InterviewType, detail?: string) => {
    if (!job) return;
    setType(t);
    setLoading(true);
    setPrep(null);
    const p = await getInterviewPrep(job, resume, t, detail);
    setPrep(p);
    setLoading(false);
    window.scrollTo({ top: 0 });
  };

  const getMore = async () => {
    if (!job || !prep || !type) return;
    setMoreLoading(true);
    const more = await getMoreQuestions(
      job,
      resume,
      type,
      prep.questions.map((q) => q.question),
      type === "other" ? customText : undefined
    );
    setPrep((p) => (p ? { ...p, questions: [...p.questions, ...more] } : p));
    setMoreLoading(false);
  };

  /* ----- No job selected ----- */
  if (mounted && !job) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-secondary">
          <MessagesLikeIcon />
        </span>
        <h2 className="mt-4 text-lg font-semibold text-foreground">
          Pick a job to prepare for
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a job in your recommendations and select Apply now, then Prepare
          for the interview.
        </p>
        <Link
          href="/jobs"
          className="mt-5 inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          Browse jobs
        </Link>
      </div>
    );
  }

  if (!mounted) {
    return <div className="h-64 animate-pulse rounded-2xl bg-secondary" />;
  }

  /* ----- Loading ----- */
  if (loading) {
    return (
      <div className="flex flex-col items-center py-24 text-center">
        <Loader2 className="size-9 animate-spin text-primary" />
        <p className="mt-5 text-lg font-semibold text-foreground">
          {LOADING_COPY[copyIndex]}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Building prep specific to this role - just for you.
        </p>
      </div>
    );
  }

  /* ----- Type selection ----- */
  if (!prep) {
    return (
      <div className="mx-auto max-w-2xl">
        {job && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{job.title}</span> at{" "}
            {job.company}
          </p>
        )}
        <h1 className="mt-2 font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Choose your interview type
        </h1>
        <p className="mt-2 text-muted-foreground">
          Pick the interview type so your prep is targeted, not generic.
        </p>

        <div className="mt-8 space-y-3">
          {INTERVIEW_TYPES.map((t) => {
            const isOther = t.id === "other";
            return (
              <div key={t.id}>
                <button
                  type="button"
                  onClick={() =>
                    isOther ? setOtherExpanded((v) => !v) : generate(t.id)
                  }
                  className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card px-5 py-4 text-left shadow-card transition-colors hover:border-primary-strong"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-tile-strong text-white">
                    {TYPE_ICON[t.id]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-semibold text-foreground">
                      {t.title}
                    </span>
                    <span className="block text-sm text-muted-foreground">
                      {t.subtitle}
                    </span>
                  </span>
                  <ChevronRight className="size-5 shrink-0 text-primary" />
                </button>

                {isOther && otherExpanded && (
                  <div className="mt-2 rounded-2xl border border-border bg-card p-4">
                    <textarea
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                      rows={4}
                      placeholder="Describe the format here..."
                      className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                    />
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        disabled={!customText.trim()}
                        onClick={() => generate("other", customText)}
                        className="inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-40"
                      >
                        Continue
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* ----- Generated prep page ----- */
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {job && (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{job.title}</span> at{" "}
          {job.company}
        </p>
      )}
      <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
        Everything you need to ace your interview
      </h1>

      {/* Company card: logo, website/social, description, and known facts */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-foreground">{prep.company.name}</h2>
            {(prep.company.website || prep.company.linkedin) && (
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                {prep.company.website && (
                  <a
                    href={`https://${prep.company.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <Globe className="size-3.5" />
                    {prep.company.website}
                  </a>
                )}
                {prep.company.linkedin && (
                  <a
                    href={prep.company.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <ExternalLink className="size-3.5" />
                    LinkedIn
                  </a>
                )}
              </div>
            )}
          </div>
          <CompanyLogo company={prep.company.name} className="size-12 rounded-xl" />
        </div>
        {prep.company.description && (
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {prep.company.description}
          </p>
        )}
        {(prep.company.founded || prep.company.headquarters || prep.company.employees) && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {prep.company.founded && <Metric label="Founded" value={prep.company.founded} />}
            {prep.company.headquarters && (
              <Metric label="HQ" value={prep.company.headquarters} />
            )}
            {prep.company.employees && (
              <Metric label="Employees" value={prep.company.employees} />
            )}
          </div>
        )}
      </section>

      {/* Get to know the company */}
      {prep.company.bullets.length > 0 && (
        <GradientCard title="Get to know the company" gradient="from-[#1E40AF] to-[#1D4ED8]">
          <ul className="space-y-2.5">
            {prep.company.bullets.map((b, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-white/90">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-white/70" />
                {b}
              </li>
            ))}
          </ul>
        </GradientCard>
      )}

      {/* Role */}
      <Card title="Take a closer look at the role" icon={<Sparkles className="size-5 text-primary" />}>
        <p className="text-sm font-semibold text-foreground">{prep.role.title}</p>
        {job && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {[
              job.postedLabel,
              job.salaryLabel && job.salaryLabel !== "Salary not disclosed"
                ? job.salaryLabel
                : null,
              job.locationLabel,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
        {prep.role.summary && (
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {prep.role.summary}
          </p>
        )}
        {prep.role.keySkills.length > 0 && (
          <>
            <p className="mt-4 text-sm font-semibold text-foreground">
              Key skills to reference in your answers
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {prep.role.keySkills.map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-foreground"
                >
                  {s}
                </span>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* What they value in people */}
      {prep.values.length > 0 && (
        <GradientCard title="What they value in people" gradient="from-[#0F766E] to-[#047857]">
          <ul className="space-y-2.5">
            {prep.values.map((v, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-white/90">
                <Check className="mt-0.5 size-4 shrink-0 text-white" />
                {v}
              </li>
            ))}
          </ul>
        </GradientCard>
      )}

      {/* Worth mentioning in your answers */}
      {prep.mentions.length > 0 && (
        <GradientCard
          title="Worth mentioning in your answers"
          gradient="from-[#4338CA] to-[#4F46E5]"
        >
          <ul className="space-y-2.5">
            {prep.mentions.map((m, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-white/90">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-white/70" />
                {m}
              </li>
            ))}
          </ul>
        </GradientCard>
      )}

      {/* Questions */}
      <div>
        <h2 className="mb-3 text-lg font-bold text-foreground">
          Questions to think through before you go
        </h2>
        <div className="space-y-3">
          {prep.questions.map((q, i) => (
            <div
              key={i}
              className={`rounded-2xl bg-linear-to-br p-5 shadow-card ${Q_GRADIENTS[i % Q_GRADIENTS.length]}`}
            >
              <p className="font-semibold text-white">{q.question}</p>
              {q.guidance.length > 0 && (
                <ul className="mt-2 space-y-1.5">
                  {q.guidance.map((g, j) => (
                    <li key={j} className="flex gap-2 text-sm text-white/90">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-white/60" />
                      {g}
                    </li>
                  ))}
                </ul>
              )}
              {q.sample && (
                <p className="mt-3 rounded-xl bg-white/15 p-3 text-sm italic leading-relaxed text-white/90">
                  {q.sample}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-center print:hidden">
          <button
            type="button"
            onClick={getMore}
            disabled={moreLoading}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-card px-5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-secondary disabled:opacity-60"
          >
            {moreLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Coming up with more...
              </>
            ) : (
              "Get more questions"
            )}
          </button>
        </div>
      </div>

      {/* Candidate questions - "you get to ask questions too" as gradient cards */}
      {prep.candidateQuestions.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-bold text-foreground">
            You get to ask questions too
          </h2>
          <div className="space-y-3">
            {prep.candidateQuestions.map((q, i) => (
              <div
                key={i}
                className={`rounded-2xl bg-linear-to-br p-4 shadow-card ${CQ_GRADIENTS[i % CQ_GRADIENTS.length]}`}
              >
                <p className="font-semibold text-white">{q}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Take this page with you */}
      <Card className="print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-foreground">
              Take this page with you
            </h2>
            <p className="text-sm text-muted-foreground">
              Download a printable copy to review before your interview.
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-secondary px-5 text-sm font-semibold text-foreground transition-colors hover:bg-[color-mix(in_oklab,var(--secondary),black_4%)]"
          >
            <Download className="size-4" />
            Download
          </button>
        </div>
      </Card>

      {/* Final CTAs */}
      <Card className="print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() =>
              job?.applyUrl && window.open(job.applyUrl, "_blank", "noopener,noreferrer")
            }
            disabled={!job?.applyUrl}
            className="inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={() => router.push("/jobs")}
            className="inline-flex h-10 items-center rounded-full border border-border bg-card px-5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
          >
            See more roles like this
          </button>
        </div>
      </Card>
    </div>
  );
}

/** A small speech-bubble glyph for the empty state (inline SVG, not an emoji). */
function MessagesLikeIcon() {
  return <MessageSquareQuote className="size-6 text-muted-foreground" />;
}
