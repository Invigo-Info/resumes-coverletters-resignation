"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Plus,
  FileText,
  BadgeCheck,
  Trophy,
  Download,
  Briefcase,
  Mic,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { ResumeCard } from "./resume-card";
import { ResumesEmptyState } from "./resumes-empty-state";
import { GhostButton } from "@/components/common/brand/brand-buttons";
import { Button } from "@/components/common/button";
import { PageHead } from "@/components/common/page-head";
import { cn } from "@/utilities/utils";
import { usePaywall } from "@/features/cover-letter/lib/paywall";
import { useResumeLimit } from "@/permissions/resume-limit";
import {
  authorizeResumeDownload,
  useDownloadGate,
  EXPORT_UNAVAILABLE,
} from "@/permissions/resume-download-gate";
import {
  useResumeStore,
  newResumeId,
  getProgress,
} from "@/features/resume-builder/store/resume-store";
import {
  useDocumentsStore,
  saveActiveResume,
  type ResumeRecord,
  type ResumeDocData,
} from "@/features/resume-builder/store/documents-store";
import {
  fetchServerDocuments,
  pushServerDocument,
} from "@/features/resume-builder/store/documents-sync";
import { fetchSavedJobs } from "@/features/jobs/store/jobs-sync";
import { useJobsStore } from "@/features/jobs/store/jobs-store";
import { buildKeywordMatch } from "@/features/jobs/lib/keyword-match";
import type { ScoreResume } from "@/features/jobs/lib/scoreboard";
import type { JobPosting } from "@/features/jobs/lib/job-search";
import { getTemplate } from "@/config/templates";
import { downloadResume } from "@/services/storage/download-pdf";
import { LivePreview } from "@/features/resume-builder/components/live-preview";
import { ResumeThumbnail } from "./resume-thumbnail";
import type { ResumeDoc } from "@/utilities/mock-data";
import type { LucideIcon } from "lucide-react";

/** Real completion percent for a saved resume doc (same getProgress the editor
 *  meter uses). Returns 0 when the data can't be scored. */
function resumeCompletion(data: unknown): number {
  try {
    return getProgress(data as Parameters<typeof getProgress>[0]);
  } catch {
    return 0;
  }
}

/** Strip HTML tags to plain text (rich-text fields -> matcher input). */
function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/** Collect the resume's real experience bullets, so the AI tailoring flow can
 *  reframe them instead of inventing achievements. */
function experienceBullets(data: ResumeDocData): string[] {
  // Guard against a malformed/partial record (missing employment or a job's
  // description) so a bad resume record cannot crash the dashboard.
  return (data?.employment ?? []).flatMap((job) =>
    Array.from((job.description ?? "").matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi))
      .map((m) => m[1].replace(/<[^>]*>/g, "").trim())
      .filter(Boolean)
  );
}

/** Format a timestamp into the card's "Updated 5 Jun 2026, 3:45 PM" label
 *  (date + time so multiple same-day saves are distinguishable). */
function formatUpdated(ts: number): string {
  const d = new Date(ts);
  const day = d.getDate();
  const month = d.toLocaleString("en-US", { month: "short" });
  const time = d.toLocaleString("en-US", { hour: "numeric", minute: "2-digit" });
  return `Updated ${day} ${month} ${d.getFullYear()}, ${time}`;
}

/**
 * The dashboard resume list. Merges locally-stored drafts with the account's
 * server-saved resumes, renders a card per resume (with copy/delete/open), and
 * falls back to the EmptyState when there is nothing to show.
 */
export function DashboardResumes() {
  const router = useRouter();
  const { data: session } = useSession();
  const premium = usePaywall((s) => s.premium);
  const { atLimit, count, limit, remaining } = useResumeLimit();
  // Free accounts past the cap go to /payment instead of the creation menu.
  const newResumeHref = atLimit ? "/payment" : "/resume-creation-menu";
  const resumes = useDocumentsStore((s) => s.resumes);
  const removeResume = useDocumentsStore((s) => s.removeResume);
  const upsertResume = useDocumentsStore((s) => s.upsertResume);
  const loadDocument = useResumeStore((s) => s.loadDocument);
  // Real count of distinct resumes this account has downloaded (persisted gate).
  const downloadedResumeIds = useDownloadGate((s) => s.downloadedIds.resume);
  // Saved jobs (local + server) power the real "best job match" stat tile.
  const savedJobsLocal = useJobsStore((s) => s.saved);
  const [serverJobs, setServerJobs] =
    useState<Awaited<ReturnType<typeof fetchSavedJobs>>>(null);
  // The card whose PDF is currently being exported (shows a spinner on it).
  const [exportingId, setExportingId] = useState<string | null>(null);

  // Avoid SSR/client mismatch - drafts live in localStorage (client only).
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    let alive = true;
    // Backfill: a resume that was created/edited but never reached the drafts
    // list (e.g. the user navigated away before autosave fired) still lives in
    // the active resume store - surface it as a draft card here.
    saveActiveResume();
    // Pull this user's saved resumes from the server (works across devices),
    // back up any local-only drafts to the account, then merge newest-wins.
    (async () => {
      const server = await fetchServerDocuments();
      if (alive && server) {
        const serverIds = new Set(server.resumes.map((r) => r.id));
        for (const r of useDocumentsStore.getState().resumes) {
          if (!serverIds.has(r.id)) pushServerDocument("resumes", r);
        }
        useDocumentsStore.setState((s) => {
          const byId = new Map(s.resumes.map((r) => [r.id, r]));
          for (const rec of server.resumes) {
            // Newest-wins merge: server record replaces a local one only when it
            // is the same age or newer, so unsynced local edits aren't clobbered.
            const existing = byId.get(rec.id);
            if (!existing || rec.updatedAt >= existing.updatedAt) {
              byId.set(rec.id, {
                id: rec.id,
                title: rec.title,
                updatedAt: rec.updatedAt,
                templateId: rec.templateId ?? "",
                data: rec.data as ResumeDocData,
              } satisfies ResumeRecord);
            }
          }
          return {
            resumes: Array.from(byId.values()).sort(
              (a, b) => b.updatedAt - a.updatedAt
            ),
          };
        });
      }
      if (alive) setMounted(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Saved jobs (server copy) for the "best match" stat - independent of the
  // resume merge above so it can't affect the existing flow.
  useEffect(() => {
    let alive = true;
    fetchSavedJobs().then((j) => alive && setServerJobs(j));
    return () => {
      alive = false;
    };
  }, []);

  // --- Derived, all-real dashboard metrics (nothing fabricated) ------------
  const firstName = (
    session?.user?.name?.trim() ||
    session?.user?.email?.split("@")[0] ||
    "there"
  ).split(" ")[0];
  const greeting = !mounted
    ? "Welcome back"
    : new Date().getHours() < 12
      ? "Good morning"
      : new Date().getHours() < 18
        ? "Good afternoon"
        : "Good evening";

  // Average completion across every resume (same score as the editor meter).
  const resumeAvg = resumes.length
    ? Math.round(
        resumes.reduce((a, r) => a + resumeCompletion(r.data), 0) /
          resumes.length
      )
    : 0;

  // Build a ScoreResume from the most-complete resume, then score saved jobs
  // for real - identical to the /jobs and main-dashboard scoring.
  const scoreResume = useMemo<ScoreResume | null>(() => {
    if (!resumes.length) return null;
    const best = [...resumes].sort(
      (a, b) => resumeCompletion(b.data) - resumeCompletion(a.data)
    )[0];
    const d = best.data;
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
          (e) =>
            `${e.jobTitle ?? ""} ${e.company ?? ""} ${stripHtml(e.description || "")}`
        ),
        ...(d.education ?? [])
          .map((e) => `${e.degree ?? ""} ${e.institution ?? ""}`.trim())
          .filter(Boolean),
      ].join("\n"),
    };
  }, [resumes]);

  // Merge local + server saved jobs by id, then take the best real match score.
  const bestMatch = useMemo<number | null>(() => {
    const jobs: JobPosting[] = [];
    const seen = new Set<string>();
    for (const job of Object.values(savedJobsLocal)) {
      const j = job as JobPosting | undefined;
      if (j?.id && !seen.has(j.id)) {
        seen.add(j.id);
        jobs.push(j);
      }
    }
    for (const sj of serverJobs ?? []) {
      const j = sj?.job as JobPosting | undefined;
      if (j?.id && !seen.has(j.id)) {
        seen.add(j.id);
        jobs.push(j);
      }
    }
    if (!scoreResume || jobs.length === 0) return null;
    let top: number | null = null;
    for (const j of jobs) {
      try {
        const s = buildKeywordMatch(j, scoreResume).score;
        if (top == null || s > top) top = s;
      } catch {
        /* unscorable posting - skip */
      }
    }
    return top;
  }, [savedJobsLocal, serverJobs, scoreResume]);

  // Open a resume in the editor (Write flow) - the existing safe route.
  const openResume = (rec: ResumeRecord) => {
    loadDocument(rec.id, rec.data);
    router.push("/resumes/write/personal");
  };

  const stats: {
    value: number | string;
    label: string;
    icon: LucideIcon;
    tint: string;
  }[] = [
    {
      value: resumes.length,
      label: resumes.length === 1 ? "resume in your account" : "resumes in your account",
      icon: FileText,
      tint: "bg-primary/10 text-primary",
    },
    {
      value: `${resumeAvg}%`,
      label: "average completion",
      icon: BadgeCheck,
      tint: "bg-progress-done/10 text-progress-done",
    },
    {
      value: bestMatch ?? "-",
      label: "best job match score",
      icon: Trophy,
      tint: "bg-progress-low/10 text-progress-low",
    },
    {
      value: downloadedResumeIds.length,
      label:
        downloadedResumeIds.length === 1 ? "resume downloaded" : "resumes downloaded",
      icon: Download,
      tint: "bg-ai-text/10 text-ai-text",
    },
  ];

  // Top two most-recently-updated resumes for "continue where you left off".
  const continueResumes = resumes.slice(0, 2);

  // During hydration, show a light skeleton (not the empty hero) so a user who
  // DOES have resumes never flashes the "create your first resume" screen.
  if (!mounted) {
    return (
      <div className="space-y-4">
        <div className="h-9 w-56 animate-pulse rounded-lg bg-secondary" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-secondary" />
          ))}
        </div>
        <div className="h-24 animate-pulse rounded-2xl bg-secondary" />
      </div>
    );
  }

  // Brand-new user: the full v9 "create your first resume" onboarding hero.
  if (resumes.length === 0) {
    return <ResumesEmptyState newResumeHref={newResumeHref} />;
  }

  return (
    <div className="space-y-7">
      <PageHead
        eyebrow="Resumes"
        title="Your resumes"
        subtitle="Build, tailor, and download a resume for every application."
        action={
          <Link href={newResumeHref}>
            <Button variant="cta" className="h-10 px-5">
              <Plus className="size-4" />
              {atLimit ? "Subscribe to add more" : "New resume"}
            </Button>
          </Link>
        }
      />

      {/* Greeting */}
      <div>
        <h2 className="font-heading text-xl font-extrabold tracking-tight text-foreground">
          {greeting}, {firstName}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {resumes.length} resume{resumes.length === 1 ? "" : "s"} · here&apos;s where
          things stand.
        </p>
      </div>

      {/* Stat tiles - every value is real (counts, average completion, best job
          match score, downloads recorded). */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-card ring-1 ring-border"
            >
              <span
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-xl",
                  s.tint
                )}
              >
                <Icon className="size-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-lg font-extrabold leading-tight text-foreground">
                  {s.value}
                </p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Continue where you left off - the two most recent resumes. */}
      <section>
        <h2 className="mb-3 text-base font-bold text-foreground">
          Continue where you left off
        </h2>
        <div className="space-y-3">
          {continueResumes.map((rec) => {
            const pct = resumeCompletion(rec.data);
            const done = pct === 100;
            return (
              <div
                key={rec.id}
                className="flex flex-wrap items-center gap-4 rounded-2xl bg-card p-4 shadow-card ring-1 ring-border"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <FileText className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1" style={{ minWidth: 200 }}>
                  <p className="truncate text-sm font-semibold text-foreground">
                    {rec.title || "Untitled resume"}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2.5">
                    <div className="h-1.5 max-w-[220px] flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          done ? "bg-progress-done" : "bg-gradient-progress"
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span
                      className={cn(
                        "shrink-0 text-xs font-bold",
                        done ? "text-progress-done" : "text-foreground"
                      )}
                    >
                      {pct}%
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openResume(rec)}
                  className="inline-flex h-9 shrink-0 items-center rounded-[6px] bg-(--brand-blue) px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
                >
                  {done ? "Review" : "Continue"}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Next best actions - real navigations into the rest of the app. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            href: "/jobs",
            icon: Briefcase,
            tint: "bg-progress-done/10 text-progress-done",
            title: "Tailor to a job",
            sub: "Match keywords and boost your ATS score",
          },
          {
            href: "/interview-prep",
            icon: Mic,
            tint: "bg-ai-text/10 text-ai-text",
            title: "Practice the interview",
            sub: "Questions built from your resume",
          },
          {
            href: newResumeHref,
            icon: Plus,
            tint: "bg-primary/10 text-primary",
            title: "Start a new version",
            sub: "From scratch or an upload",
          },
        ].map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.title}
              href={a.href}
              className="group flex items-start gap-3.5 rounded-2xl bg-card p-4 shadow-card ring-1 ring-border transition-colors hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
            >
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-lg",
                  a.tint
                )}
              >
                <Icon className="size-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{a.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{a.sub}</p>
              </div>
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <ChevronRight className="size-4" aria-hidden />
              </span>
            </Link>
          );
        })}
      </div>

      {/* All resumes divider */}
      <div className="flex items-center gap-2.5 pt-1">
        <span className="text-base font-bold text-foreground">All resumes</span>
        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
          {resumes.length}
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      {/* Off-screen PDF source for card downloads: it mirrors the active resume
          store, so the download handler loads the clicked resume into the store,
          waits a tick, then exports this node - no need to open the editor. */}
      <div aria-hidden className="hidden">
        <LivePreview previewOnly />
      </div>

      {resumes.map((rec) => {
        const doc: ResumeDoc = {
          id: rec.id,
          title: rec.title,
          updatedAt: formatUpdated(rec.updatedAt),
          thumb: getTemplate(rec.templateId)?.image ?? "/resume-thumb.svg",
        };
        const open = () => {
          loadDocument(rec.id, rec.data);
          router.push("/resumes/write/personal");
        };
        // Free accounts may download up to 3 distinct resumes; a further one
        // needs a subscription (premium is unlimited). Within the allowance the
        // resume is exported to a PDF right here - no navigation: the clicked
        // resume is loaded into the hidden off-screen preview below, which the
        // exporter captures.
        const download = async () => {
          if (exportingId) return; // a download is already in flight
          // The in-flight check comes FIRST: authorizing before it would spend
          // an allowance slot for a click that is then ignored.
          const authorized = await authorizeResumeDownload(rec.id);
          if (!authorized.ok) {
            if (authorized.shouldUpsell) router.push("/payment");
            else toast.error(EXPORT_UNAVAILABLE);
            return;
          }
          loadDocument(rec.id, rec.data);
          setExportingId(rec.id);
          try {
            // Let the hidden preview commit the loaded resume, then settle fonts.
            await new Promise((r) => setTimeout(r, 80));
            try {
              await document.fonts?.ready;
            } catch {
              /* fonts API absent - proceed anyway */
            }
            await downloadResume();
          } finally {
            setExportingId(null);
          }
        };
        return (
          <ResumeCard
            key={rec.id}
            resume={doc}
            resumeBullets={experienceBullets(rec.data)}
            thumbnail={<ResumeThumbnail id={rec.id} data={rec.data} />}
            downloading={exportingId === rec.id}
            onEdit={open}
            onDownload={download}
            onCopy={() => {
              // Duplicating creates a new resume, so it hits the free-tier cap
              // too - send a capped free user to subscribe instead.
              if (atLimit) {
                router.push("/payment");
                return;
              }
              // Duplicate as a brand-new document (fresh id + timestamp).
              const id = newResumeId();
              upsertResume({
                ...rec,
                id,
                title: `${rec.title} (copy)`,
                updatedAt: Date.now(),
              });
              toast.success("Resume duplicated", {
                description: "Tailor the copy for a different role.",
              });
            }}
            onDelete={() => removeResume(rec.id)}
          />
        );
      })}

      {/* Secondary CTA to the "start from scratch / upload your resume" flow -
          large and noticeable, but quieter than the header's Create button.
          Free accounts past the cap are routed to subscribe instead. */}
      <div className="flex flex-col items-center gap-2 pt-2">
        <Link href={newResumeHref}>
          <GhostButton className="h-12 bg-card px-7 text-base shadow-card ring-1 ring-border transition-colors hover:bg-primary/10 hover:text-primary hover:ring-primary/30">
            <Plus className="size-4" />
            {/* Free + at the cap: subscribe. Subscribed: a positive "Build my
                resume" CTA (matches the empty state). Free under the cap: create. */}
            {atLimit
              ? "Subscribe to add more"
              : premium
                ? "Build my resume"
                : "Create new resume"}
          </GhostButton>
        </Link>
        {!premium && (
          <p className="text-xs text-muted-foreground">
            {atLimit
              ? `You have used all ${limit} free resumes.`
              : `${count} of ${limit} free resumes used${
                  remaining === 1 ? " - 1 left" : ` - ${remaining} left`
                }`}
          </p>
        )}
      </div>
    </div>
  );
}
