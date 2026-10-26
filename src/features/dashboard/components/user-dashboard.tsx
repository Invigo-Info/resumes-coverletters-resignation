"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  FileText,
  Mail,
  Send,
  Briefcase,
  MessageSquareText,
  Mic,
  Upload,
  Heart,
  Trophy,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import {
  fetchServerDocuments,
  type ServerDocument,
} from "@/features/resume-builder/store/documents-sync";
import { fetchSavedJobs } from "@/features/jobs/store/jobs-sync";
import {
  useDocumentsStore,
  type ResumeDocData,
} from "@/features/resume-builder/store/documents-store";
import {
  useCoverLetterDocumentsStore,
  type CoverLetterDocData,
} from "@/features/cover-letter/store/cover-letter-documents-store";
import {
  useResignationLetterDocumentsStore,
  type ResignationLetterDocData,
} from "@/features/resignation-letter/store/resignation-letter-documents-store";
import { useInterviewPrepDocumentsStore } from "@/features/interview-prep/store/interview-prep-documents-store";
import { useJobsStore } from "@/features/jobs/store/jobs-store";
import { buildKeywordMatch, ringTheme } from "@/features/jobs/lib/keyword-match";
import { ScoreRing } from "@/features/jobs/components/match-scoreboard";
import type { ScoreResume } from "@/features/jobs/lib/scoreboard";
import { generateJobs, type JobPosting } from "@/features/jobs/lib/job-search";
import { cn } from "@/utilities/utils";
import { useResumeStore, getProgress } from "@/features/resume-builder/store/resume-store";
import { useCoverLetterStore } from "@/features/cover-letter/store/cover-letter-store";
import { useResignationLetterStore } from "@/features/resignation-letter/store/resignation-letter-store";
import type { LucideIcon } from "lucide-react";

/** One saved thing across any category, normalised for the dashboard. */
type Kind = "resume" | "cover" | "resignation" | "job" | "interview";
interface Item {
  kind: Kind;
  id: string;
  title: string;
  updatedAt: number;
  data?: unknown;
  sub?: string;
}

const KIND_META: Record<Kind, { label: string; icon: LucideIcon }> = {
  resume: { label: "Resume", icon: FileText },
  cover: { label: "Cover letter", icon: Mail },
  resignation: { label: "Resignation letter", icon: Send },
  job: { label: "Saved job", icon: Briefcase },
  interview: { label: "Interview prep", icon: MessageSquareText },
};

/** Real completion percent for a saved resume doc (getProgress reads only the
 *  content fields ResumeDocData carries, so this is the same score the editor
 *  meter shows). Returns 0 if the data can't be scored. */
function resumeCompletion(data: unknown): number {
  try {
    return getProgress(data as Parameters<typeof getProgress>[0]);
  } catch {
    return 0;
  }
}

/** Strip HTML tags to plain text (rich-text fields → matcher input). */
function stripHtml(s: string): string {
  return s
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** "3 hr ago" / "5 Jun 2026" relative label. */
function formatRelative(ts: number): string {
  if (!ts) return "";
  const diff = Date.now() - ts;
  const m = Math.round(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(diff / 3_600_000);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(diff / 86_400_000);
  if (d < 30) return `${d} day${d === 1 ? "" : "s"} ago`;
  const dt = new Date(ts);
  return `${dt.getDate()} ${dt.toLocaleString("en-US", { month: "short" })} ${dt.getFullYear()}`;
}

/** Merge a category's local records with the server copy (newest-wins by id). */
function mergeDocs(
  local: { id: string; title: string; updatedAt: number; data: unknown }[],
  server: ServerDocument[] | undefined,
  kind: Kind
): Item[] {
  const byId = new Map<string, Item>();
  for (const r of local) {
    if (!r?.id) continue;
    byId.set(r.id, { kind, id: r.id, title: r.title, updatedAt: r.updatedAt, data: r.data });
  }
  for (const r of server ?? []) {
    if (!r?.id) continue;
    const ex = byId.get(r.id);
    if (!ex || r.updatedAt >= ex.updatedAt) {
      byId.set(r.id, { kind, id: r.id, title: r.title, updatedAt: r.updatedAt, data: r.data });
    }
  }
  return [...byId.values()];
}

/** Outline-blue quick action in the page header. */
function HeaderAction({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-primary/30 bg-card px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
    >
      <Icon className="size-4" aria-hidden />
      {label}
    </Link>
  );
}

/**
 * The dashboard content: a greeting, at-a-glance stat cards, a guided "path to
 * the offer", the most recent in-progress documents, saved jobs, and an AI
 * tailoring prompt. Reads the local stores for an instant view, then merges the
 * account's server copies (cross-device) on mount. Every metric shown is real -
 * counts come from the stores and resume completion from the same getProgress
 * the editor uses; nothing is fabricated.
 */
export function UserDashboard() {
  const router = useRouter();
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);
  const [server, setServer] =
    useState<Awaited<ReturnType<typeof fetchServerDocuments>>>(null);
  const [jobs, setJobs] =
    useState<Awaited<ReturnType<typeof fetchSavedJobs>>>(null);

  const resumes = useDocumentsStore((s) => s.resumes);
  const coverLetters = useCoverLetterDocumentsStore((s) => s.letters);
  const resignations = useResignationLetterDocumentsStore((s) => s.letters);
  const prepSheets = useInterviewPrepDocumentsStore((s) => s.sheets);
  const savedJobsLocal = useJobsStore((s) => s.saved);

  const loadResume = useResumeStore((s) => s.loadDocument);
  const loadCover = useCoverLetterStore((s) => s.loadDocument);
  const loadResignation = useResignationLetterStore((s) => s.loadDocument);

  useEffect(() => {
    setMounted(true);
    let alive = true;
    fetchServerDocuments().then((d) => alive && setServer(d));
    fetchSavedJobs().then((j) => alive && setJobs(j));
    return () => {
      alive = false;
    };
  }, []);

  const cats = useMemo(() => {
    const resumeItems = mergeDocs(resumes, server?.resumes, "resume");
    const coverItems = mergeDocs(coverLetters, server?.coverLetters, "cover");
    const resignationItems = mergeDocs(
      resignations,
      server?.resignationLetters,
      "resignation"
    );
    const prepItems = mergeDocs(
      prepSheets.map((s) => ({
        id: s.id,
        title: s.title,
        updatedAt: s.updatedAt,
        data: s.data,
      })),
      server?.interviewPrep,
      "interview"
    );

    // Saved jobs live in their own store/table (no document body). Merge the
    // local map with the server copy by job id; sort by when it was saved.
    const jobById = new Map<string, Item>();
    for (const [id, job] of Object.entries(savedJobsLocal)) {
      if (!id) continue;
      jobById.set(id, {
        kind: "job",
        id,
        title: job?.title ?? "Untitled role",
        sub: job?.company,
        updatedAt: 0,
        data: job,
      });
    }
    for (const sj of jobs ?? []) {
      const j = sj?.job;
      if (!j?.id) continue;
      const ex = jobById.get(j.id);
      const at = sj.savedAt ?? 0;
      if (!ex || at >= ex.updatedAt) {
        jobById.set(j.id, {
          kind: "job",
          id: j.id,
          title: j.title ?? "Untitled role",
          sub: j.company,
          updatedAt: at,
          data: j,
        });
      }
    }

    return {
      resumeItems,
      coverItems,
      resignationItems,
      prepItems,
      jobItems: [...jobById.values()],
    };
  }, [resumes, coverLetters, resignations, prepSheets, savedJobsLocal, server, jobs]);

  // Open a saved item directly in the right editor / view.
  function open(item: Item) {
    switch (item.kind) {
      case "resume":
        loadResume(item.id, item.data as ResumeDocData);
        router.push("/resumes/write/personal");
        break;
      case "cover":
        loadCover(item.id, item.data as CoverLetterDocData);
        router.push("/cover-letter/preview?mode=write");
        break;
      case "resignation":
        loadResignation(item.id, item.data as ResignationLetterDocData);
        router.push("/resignation-letter/preview?mode=write");
        break;
      case "interview":
        router.push(`/interview-prep/saved/${item.id}`);
        break;
      case "job":
        router.push("/jobs?tab=saved");
        break;
    }
  }

  // Derived, all-real metrics.
  const resumeAvg = cats.resumeItems.length
    ? Math.round(
        cats.resumeItems.reduce((a, r) => a + resumeCompletion(r.data), 0) /
          cats.resumeItems.length
      )
    : 0;

  const pickUp = [...cats.resumeItems, ...cats.coverItems, ...cats.resignationItems]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 3);

  // Build a ScoreResume from the user's most-complete resume (same shape the
  // /jobs and interview-prep flows use), so saved jobs can be scored for real.
  const scoreResume = useMemo<ScoreResume | null>(() => {
    if (!cats.resumeItems.length) return null;
    const best = [...cats.resumeItems].sort(
      (a, b) => resumeCompletion(b.data) - resumeCompletion(a.data)
    )[0];
    const d = best.data as ResumeDocData;
    const role =
      d.personal?.jobTitle?.trim() ||
      d.employment?.find((e) => e.jobTitle?.trim())?.jobTitle ||
      "";
    return {
      role,
      skills: (d.skills ?? []).map((s) => s.name).filter(Boolean),
      summary: stripHtml(d.summary || ""),
      location: d.contact?.location?.trim() || "",
      experience: [
        ...(d.employment ?? []).map(
          (e) => `${e.jobTitle ?? ""} ${e.company ?? ""} ${stripHtml(e.description || "")}`
        ),
        ...(d.education ?? [])
          .map((e) => `${e.degree ?? ""} ${e.institution ?? ""}`.trim())
          .filter(Boolean),
      ].join("\n"),
    };
  }, [cats.resumeItems]);

  // Real keyword-match score per saved job (null when there's no resume to
  // score against, or the posting can't be scored). Never fabricated.
  const scoredJobs = useMemo(() => {
    return cats.jobItems.map((item) => {
      let score: number | null = null;
      if (scoreResume) {
        try {
          score = buildKeywordMatch(item.data as JobPosting, scoreResume).score;
        } catch {
          score = null;
        }
      }
      return { item, score };
    });
  }, [cats.jobItems, scoreResume]);

  const topJobs = [...scoredJobs]
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
    .slice(0, 3);

  const bestMatch = scoredJobs.reduce<{ score: number; company: string } | null>(
    (best, cur) => {
      if (cur.score == null) return best;
      if (!best || cur.score > best.score) {
        return { score: cur.score, company: cur.item.sub || cur.item.title };
      }
      return best;
    },
    null
  );

  const firstName = (
    session?.user?.name?.trim() ||
    session?.user?.email?.split("@")[0] ||
    "there"
  ).split(" ")[0];

  const now = mounted ? new Date() : null;
  const greeting = !now
    ? "Welcome back"
    : now.getHours() < 12
      ? "Good morning"
      : now.getHours() < 18
        ? "Good afternoon"
        : "Good evening";
  const dateLabel = now
    ? now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
    : "";

  const stats: {
    value: number | string;
    label: string;
    sub: string;
    icon: LucideIcon;
    tint: string;
  }[] = [
    {
      value: cats.resumeItems.length,
      label: "resumes",
      sub: cats.resumeItems.length ? `${resumeAvg}% avg complete` : "None yet",
      icon: FileText,
      tint: "bg-primary/10 text-primary",
    },
    {
      value: cats.coverItems.length,
      label: "cover letters",
      sub: cats.coverItems.length ? "Ready to send" : "None yet",
      icon: Mail,
      tint: "bg-ai-text/10 text-ai-text",
    },
    {
      value: cats.jobItems.length,
      label: "saved jobs",
      sub: cats.jobItems.length ? "Ready to apply" : "None yet",
      icon: Heart,
      tint: "bg-destructive/10 text-destructive",
    },
    {
      value: bestMatch ? bestMatch.score : "-",
      label: "best match",
      sub: bestMatch
        ? bestMatch.company || "Top saved job"
        : cats.jobItems.length
          ? "Add a resume to score"
          : "None yet",
      icon: Trophy,
      tint: "bg-progress-done/10 text-progress-done",
    },
  ];

  const steps: { n: number; title: string; sub: string; href: string; icon: LucideIcon }[] = [
    {
      n: 1,
      title: "Build your resume",
      sub: `${cats.resumeItems.length} in your account`,
      href: "/",
      icon: FileText,
    },
    {
      n: 2,
      title: "Find & tailor jobs",
      sub: `${cats.jobItems.length} saved`,
      href: "/jobs",
      icon: Briefcase,
    },
    {
      n: 3,
      title: "Write the letter",
      sub: `${cats.coverItems.length} cover letter${cats.coverItems.length === 1 ? "" : "s"}`,
      href: "/cover-letters",
      icon: Mail,
    },
    {
      n: 4,
      title: "Ace the interview",
      sub: "Questions from your resume",
      href: "/interview-prep",
      icon: Mic,
    },
  ];

  if (!mounted) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-9 w-64 animate-pulse rounded-lg bg-secondary" />
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-secondary" />
          ))}
        </div>
        <div className="mt-4 h-32 animate-pulse rounded-2xl bg-secondary" />
      </div>
    );
  }

  // Brand-new account (no resume and no cover letter yet): a focused onboarding
  // dashboard - a four-step checklist, popular roles to explore (honestly
  // unscored until a resume exists), and a starter banner. The full metrics
  // dashboard appears the moment the user creates their first document.
  const isFresh =
    cats.resumeItems.length === 0 && cats.coverItems.length === 0;
  if (isFresh) {
    const checklist: {
      icon: LucideIcon;
      title: string;
      sub: string;
      cta: string;
      href: string;
      primary?: boolean;
    }[] = [
      {
        icon: FileText,
        title: "Create your first resume",
        sub: "From scratch with AI, or upload one - about 15 minutes",
        cta: "Start now",
        href: "/resume-creation-menu",
        primary: true,
      },
      {
        icon: Briefcase,
        title: "Find jobs and see your match score",
        sub: "Every listing scored against your resume, up to 99",
        cta: "Browse jobs",
        href: "/jobs",
      },
      {
        icon: Mail,
        title: "Write a tailored cover letter",
        sub: "AI drafts it section by section for the company",
        cta: "Preview",
        href: "/cover-letters",
      },
      {
        icon: Mic,
        title: "Prep for the interview",
        sub: "Likely questions with model answers, built from your resume",
        cta: "Take a look",
        href: "/interview-prep",
      },
    ];
    // The app's own job catalog (same generator the Jobs page falls back to),
    // shown as explorable roles - never with a fabricated match score.
    let exploreJobs: JobPosting[] = [];
    try {
      exploreJobs = generateJobs({
        role: "Product Manager",
        skills: [],
        location: "",
      }).slice(0, 3);
    } catch {
      exploreJobs = [];
    }

    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Welcome hero */}
        <div className="text-center">
          <p className="eyebrow">Welcome to Resumewriter.ai</p>
          <h1 className="mt-2 font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Let&apos;s land your next role, {firstName}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground sm:text-base">
            Four steps from blank page to offer. The first one takes about 15
            minutes.
          </p>
        </div>

        {/* Getting-started checklist */}
        <div className="mt-8 rounded-2xl bg-card px-5 shadow-card ring-1 ring-border sm:px-7">
          {checklist.map((s, i) => {
            const Icon = s.icon;
            return (
              <div
                key={s.title}
                className={cn(
                  "flex flex-wrap items-center gap-4 py-5",
                  i < checklist.length - 1 && "border-b border-border"
                )}
              >
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold",
                    i === 0
                      ? "bg-(--brand-blue) text-primary-foreground"
                      : "bg-primary/10 text-primary"
                  )}
                >
                  {i + 1}
                </span>
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1" style={{ minWidth: 220 }}>
                  <p className="text-sm font-semibold text-foreground sm:text-base">
                    {s.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                    {s.sub}
                  </p>
                </div>
                <Link
                  href={s.href}
                  className={cn(
                    "inline-flex h-10 shrink-0 items-center rounded-[6px] px-5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
                    s.primary
                      ? "bg-(--brand-blue) text-primary-foreground shadow-sm hover:bg-primary"
                      : "border-[1.5px] border-primary bg-card text-primary hover:bg-accent hover:text-primary-strong"
                  )}
                >
                  {s.cta}
                </Link>
              </div>
            );
          })}
        </div>

        {/* Popular roles to explore - honest: no scores until a resume exists */}
        <div className="mt-6 rounded-2xl bg-card p-5 shadow-card ring-1 ring-border sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-bold text-foreground">
              Popular roles to explore
            </h2>
            <Link
              href="/jobs"
              className="text-sm font-semibold text-primary hover:opacity-80"
            >
              View all
            </Link>
          </div>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Create a resume and we&apos;ll score every one of these against it.
          </p>
          <div className="mt-4 space-y-2.5">
            {exploreJobs.map((j) => (
              <Link
                key={j.id}
                href="/jobs"
                className="flex items-center gap-3.5 rounded-xl bg-secondary/50 p-3 transition-colors hover:bg-secondary"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-foreground text-sm font-bold text-background">
                  {(j.company || "?").charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {j.title}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[j.company, j.mode, j.salaryLabel].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-card px-2.5 py-1 text-[11px] font-bold text-muted-foreground ring-1 ring-border">
                  Score after resume
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Starter banner */}
        <div
          className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl p-6 text-white"
          style={{ backgroundImage: "linear-gradient(95deg, var(--brand-blue), var(--brand-purple))" }}
        >
          <Sparkles className="size-6 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1" style={{ minWidth: 240 }}>
            <p className="text-base font-bold">
              Your first resume takes about 15 minutes.
            </p>
            <p className="mt-0.5 text-sm text-white/85">
              AI writes with you, formats for ATS, and unlocks match scores on
              every job.
            </p>
          </div>
          <Link
            href="/resume-creation-menu"
            className="inline-flex h-10 shrink-0 items-center rounded-[6px] bg-white px-5 text-sm font-semibold text-primary shadow-sm transition-colors hover:bg-white/90"
          >
            Create my resume
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header: greeting + quick actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground">
            {greeting}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {dateLabel ? `${dateLabel} · ` : ""}here&apos;s where your job hunt stands.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <HeaderAction href="/resume-creation-menu" icon={Upload} label="Upload" />
          <HeaderAction href="/cover-letter/new" icon={Mail} label="New cover letter" />
          <HeaderAction href="/resume-creation-menu" icon={FileText} label="New resume" />
        </div>
      </div>

      {/* Stat cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="flex items-center gap-4 rounded-2xl bg-card p-5 shadow-card ring-1 ring-border"
            >
              <span className={cn("grid size-12 shrink-0 place-items-center rounded-xl", s.tint)}>
                <Icon className="size-6" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-2xl font-extrabold text-foreground">
                  {s.value}{" "}
                  <span className="text-sm font-semibold text-muted-foreground">{s.label}</span>
                </p>
                <p className="truncate text-xs text-muted-foreground">{s.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Path to the offer */}
      <div className="mt-4 rounded-2xl bg-card p-5 shadow-card ring-1 ring-border">
        <h2 className="text-base font-bold text-foreground">Your path to the offer</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((st) => {
            const Icon = st.icon;
            return (
              <Link
                key={st.n}
                href={st.href}
                className="flex items-start gap-3 rounded-xl bg-secondary/60 p-4 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {st.n}
                </span>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    {st.title}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{st.sub}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Pick up where you left off + Saved jobs */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-card p-5 shadow-card ring-1 ring-border">
          <h2 className="text-base font-bold text-foreground">Pick up where you left off</h2>
          {pickUp.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Nothing in progress yet. Create a resume to get started.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {pickUp.map((item) => {
                const meta = KIND_META[item.kind];
                const Icon = meta.icon;
                const pct = item.kind === "resume" ? resumeCompletion(item.data) : null;
                const when = formatRelative(item.updatedAt);
                return (
                  <li
                    key={`${item.kind}:${item.id}`}
                    className="flex items-center gap-3 rounded-xl bg-secondary/50 p-3"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-card text-primary ring-1 ring-border">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {item.title || "Untitled"}
                      </p>
                      {pct !== null ? (
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-gradient-progress"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-muted-foreground">{pct}%</span>
                        </div>
                      ) : (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {meta.label}
                          {when ? ` · ${when}` : ""}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => open(item)}
                      className="inline-flex h-9 shrink-0 items-center rounded-[10px] bg-(--brand-blue) px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-(--brand-blue) focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
                    >
                      Continue
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-2xl bg-card p-5 shadow-card ring-1 ring-border">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-bold text-foreground">Top job matches</h2>
            {topJobs.length > 0 && (
              <Link
                href="/jobs?tab=saved"
                className="text-sm font-semibold text-primary hover:opacity-80"
              >
                View all
              </Link>
            )}
          </div>
          {topJobs.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No saved jobs yet. Browse jobs and save the ones you like.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {topJobs.map(({ item, score }) => {
                const posting = item.data as JobPosting | undefined;
                const loc = posting?.locationLabel?.trim();
                const secondary = [item.sub, loc].filter(Boolean).join(" · ") || "Saved role";
                const theme = score != null ? ringTheme(score) : null;
                const badge = (item.sub || item.title || "?").trim().charAt(0).toUpperCase();
                return (
                  <li
                    key={`job:${item.id}`}
                    className="flex items-center gap-3 rounded-xl bg-secondary/50 p-3"
                  >
                    {theme ? (
                      <ScoreRing
                        score={score as number}
                        size={44}
                        progressColor={theme.progress}
                        numberColor={theme.number}
                      />
                    ) : (
                      <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-foreground text-sm font-bold text-background">
                        {badge || "?"}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{secondary}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => open(item)}
                      className="inline-flex h-9 shrink-0 items-center rounded-[10px] border border-primary/30 bg-card px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
                    >
                      Open
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* AI tailoring banner */}
      <div
        className="mt-4 overflow-hidden rounded-2xl p-6 text-white"
        style={{ backgroundImage: "linear-gradient(90deg, var(--primary), var(--ai-to))" }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/15">
              <Sparkles className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-base font-bold">Tailor your resume to any job</p>
              <p className="mt-0.5 text-sm text-white/85">
                Weave the missing keywords into your resume and lift your match score in one click.
              </p>
            </div>
          </div>
          <Link
            href="/jobs"
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-[10px] bg-white px-5 text-sm font-semibold text-primary shadow-sm transition-colors hover:bg-white/90"
          >
            Try AI tailoring
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}
