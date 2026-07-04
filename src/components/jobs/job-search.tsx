"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronDown, ArrowUpDown, FileText, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDocumentsStore } from "@/lib/store/documents-store";
import { useResumeStore } from "@/lib/store/resume-store";
import { useJobsStore } from "@/lib/store/jobs-store";
import {
  generateJobs,
  jobCountFor,
  postedWithinDays,
  DATE_POSTED_DAYS,
  type JobPosting,
  type ResumeProfile,
} from "@/lib/jobs/job-search";
import type { MatchScoreboard, ScoreResume } from "@/lib/jobs/scoreboard";
import { TailorDialog } from "@/components/dashboard/tailor-dialog";
import { JobCard } from "./job-card";
import { JobDetail } from "./job-detail";
import { FilterChips } from "./filter-chips";
import { EditFiltersModal } from "./edit-filters-modal";
import { JobsLoading } from "./jobs-loading";
import { SavedEmptyState } from "./saved-empty-state";

/* ------------------------------------------------------------------ */
/* Resume -> profile                                                  */
/* ------------------------------------------------------------------ */

/** A resume's role/skills/location plus the fuller context for scoring. */
interface Profile extends ResumeProfile {
  resume: ScoreResume;
}

/** Strip HTML tags to plain text. */
const stripHtml = (html: string) =>
  html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

/* ------------------------------------------------------------------ */
/* Page body                                                          */
/* ------------------------------------------------------------------ */

type Tab = "recommended" | "saved";

/**
 * The Jobs experience: resume-matched Recommended jobs (with filters, an
 * explainable Scoreboard, save/dismiss) and a Saved jobs tab (with an undo
 * stack). All results derive from the resume the user built/uploaded.
 */
export function JobSearch() {
  const resumes = useDocumentsStore((s) => s.resumes);
  // Select each field separately - a selector returning a new object every
  // render would loop Zustand's useSyncExternalStore.
  const activeRole = useResumeStore((s) => s.personal.jobTitle);
  const activeSkills = useResumeStore((s) => s.skills);
  const activeLocation = useResumeStore((s) => s.contact.location);
  const activeEmployment = useResumeStore((s) => s.employment);
  const activeSummary = useResumeStore((s) => s.summary);

  const saved = useJobsStore((s) => s.saved);
  const dismissed = useJobsStore((s) => s.dismissed);
  const filters = useJobsStore((s) => s.filters);
  const pendingRemovals = useJobsStore((s) => s.pendingRemovals);
  const toggleSave = useJobsStore((s) => s.toggleSave);
  const dismiss = useJobsStore((s) => s.dismiss);
  const setFilters = useJobsStore((s) => s.setFilters);
  const resetFilters = useJobsStore((s) => s.resetFilters);
  const removeSaved = useJobsStore((s) => s.removeSaved);
  const restoreSaved = useJobsStore((s) => s.restoreSaved);
  const expirePending = useJobsStore((s) => s.expirePending);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [tab, setTab] = useState<Tab>("recommended");
  const [roleIndex, setRoleIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savedSelectedId, setSavedSelectedId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [tailor, setTailor] = useState<{ open: boolean; jd: string; role: string }>({
    open: false,
    jd: "",
    role: "",
  });
  const detailRef = useRef<HTMLDivElement>(null);

  // Live results from /api/jobs (null = not loaded yet).
  const [liveJobs, setLiveJobs] = useState<JobPosting[] | null>(null);
  const [liveCount, setLiveCount] = useState<number | null>(null);
  const [jobsLoading, setJobsLoading] = useState(false);

  /* ----- Build one profile per resume ----- */
  const profiles = useMemo<Profile[]>(() => {
    if (!mounted) return [];
    const out: Profile[] = [];
    const seen = new Set<string>();
    const add = (
      role: string,
      skills: string[],
      location: string,
      summary: string,
      experience: string
    ) => {
      const r = role.trim();
      if (!r || seen.has(r.toLowerCase())) return;
      seen.add(r.toLowerCase());
      const cleanSkills = skills.filter(Boolean);
      out.push({
        role: r,
        skills: cleanSkills,
        location: location.trim(),
        resume: { role: r, skills: cleanSkills, summary, experience },
      });
    };
    for (const rec of resumes) {
      const d = rec.data;
      const role =
        d.personal.jobTitle?.trim() ||
        d.employment?.find((e) => e.jobTitle.trim())?.jobTitle ||
        "";
      const experience = (d.employment ?? [])
        .map((e) => `${e.jobTitle} ${e.company} ${stripHtml(e.description || "")}`)
        .join("\n");
      add(
        role,
        (d.skills ?? []).map((sk) => sk.name),
        d.contact?.location ?? "",
        stripHtml(d.summary || ""),
        experience
      );
    }
    const empRole = activeEmployment.find((e) => e.jobTitle.trim())?.jobTitle ?? "";
    const activeExp = activeEmployment
      .map((e) => `${e.jobTitle} ${e.company} ${stripHtml(e.description || "")}`)
      .join("\n");
    add(
      activeRole || empRole,
      activeSkills.map((sk) => sk.name),
      activeLocation,
      stripHtml(activeSummary || ""),
      activeExp
    );
    return out;
  }, [
    mounted,
    resumes,
    activeRole,
    activeSkills,
    activeLocation,
    activeEmployment,
    activeSummary,
  ]);

  const profile = profiles[roleIndex] ?? profiles[0];

  /* ----- Seed filters from the role on first load ----- */
  useEffect(() => {
    if (mounted && profile && filters.jobTitles.length === 0) {
      resetFilters(profile.role);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, profile]);

  /* ----- Fetch live jobs whenever the role or filters change ----- */
  const filtersKey = JSON.stringify(filters);
  useEffect(() => {
    if (!profile || filters.jobTitles.length === 0) return;
    let alive = true;
    setJobsLoading(true);
    const params = new URLSearchParams({
      role: profile.role,
      titles: filters.jobTitles.join(","),
      where: filters.location,
      skills: profile.skills.slice(0, 8).join(","),
      date: filters.datePosted,
      work: filters.workModel,
      sort: filters.sort,
    });
    fetch(`/api/jobs?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { jobs?: JobPosting[]; count?: number } | null) => {
        if (!alive) return;
        const jobs = Array.isArray(data?.jobs) ? data.jobs : [];
        if (jobs.length) {
          setLiveJobs(jobs);
          setLiveCount(typeof data?.count === "number" ? data.count : jobs.length);
        } else {
          setLiveJobs(generateJobs(profile));
          setLiveCount(jobCountFor(profile.role));
        }
      })
      .catch(() => {
        if (!alive) return;
        setLiveJobs(generateJobs(profile));
        setLiveCount(jobCountFor(profile.role));
      })
      .finally(() => {
        if (alive) setJobsLoading(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.role, filtersKey]);

  /* ----- Apply work-model + date + dismissed filters client-side ----- */
  const recommended = useMemo(() => {
    const jobs = liveJobs ?? [];
    const maxDays = DATE_POSTED_DAYS[filters.datePosted];
    return jobs.filter((j) => {
      if (dismissed.includes(j.id)) return false;
      if (filters.workModel === "remote_only" && j.mode === "On-site") return false;
      if (filters.workModel === "onsite_only" && j.mode === "Remote") return false;
      if (!postedWithinDays(j, maxDays)) return false;
      return true;
    });
  }, [liveJobs, dismissed, filters.workModel, filters.datePosted]);

  const savedJobs = useMemo(
    () => Object.values(saved).sort((a, b) => b.matchScore - a.matchScore),
    [saved]
  );

  /* ----- Keep selections valid ----- */
  useEffect(() => {
    if (recommended.length === 0) setSelectedId(null);
    else if (!selectedId || !recommended.some((j) => j.id === selectedId))
      setSelectedId(recommended[0].id);
  }, [recommended, selectedId]);

  useEffect(() => {
    if (savedJobs.length === 0) setSavedSelectedId(null);
    else if (!savedSelectedId || !savedJobs.some((j) => j.id === savedSelectedId))
      setSavedSelectedId(savedJobs[0].id);
  }, [savedJobs, savedSelectedId]);

  /* ----- Expire pending undo cards after their window ----- */
  useEffect(() => {
    if (pendingRemovals.length === 0) return;
    const timers = pendingRemovals.map((p) =>
      setTimeout(
        () => expirePending(p.jobId),
        Math.max(0, 6000 - (Date.now() - p.removedAt))
      )
    );
    return () => timers.forEach(clearTimeout);
  }, [pendingRemovals, expirePending]);

  /* ----- Actions ----- */
  const selectRecommended = (id: string) => {
    setSelectedId(id);
    if (window.matchMedia("(max-width: 1023px)").matches) {
      requestAnimationFrame(() =>
        detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      );
    }
  };

  const saveFromRecommended = (job: JobPosting) => {
    const wasSaved = Boolean(saved[job.id]);
    toggleSave(job);
    if (!wasSaved) {
      toast("Job saved", {
        action: { label: "View saved jobs", onClick: () => setTab("saved") },
      });
    }
  };

  const openTailor = (job: JobPosting, scoreboard: MatchScoreboard | null) => {
    const jd =
      job.description ||
      [
        job.summary,
        ...job.responsibilities,
        ...job.qualifications,
        ...(scoreboard?.mainGaps ?? []).map((g) => `Requirement: ${g}`),
      ].join("\n");
    setTailor({ open: true, jd, role: job.title });
  };

  const switchRole = (i: number) => {
    setRoleIndex(i);
    const role = profiles[i]?.role ?? "";
    setFilters({ ...filters, jobTitles: role ? [role] : [] });
    setSelectedId(null);
  };

  /* ----- No resume ----- */
  if (mounted && profiles.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-secondary">
          <FileText className="size-6 text-muted-foreground" />
        </span>
        <h2 className="mt-4 text-lg font-semibold text-foreground">
          Add a resume to see job matches
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your job recommendations are matched to your resume - its role, skills,
          and location. Create or upload a resume to get started.
        </p>
        <Link
          href="/resume-creation-menu"
          className="mt-5 inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          Create a resume
        </Link>
      </div>
    );
  }

  /* ----- Pre-mount skeleton ----- */
  if (!mounted) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-secondary" />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-secondary" />
            ))}
          </div>
          <div className="hidden h-96 animate-pulse rounded-2xl bg-secondary lg:block" />
        </div>
      </div>
    );
  }

  const role = profile?.role ?? "";
  const count = liveCount ?? jobCountFor(role);
  const showLoading = jobsLoading && liveJobs === null;

  const selectedRec = recommended.find((j) => j.id === selectedId) ?? null;
  const selectedSaved = savedJobs.find((j) => j.id === savedSelectedId) ?? null;

  return (
    <div>
      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-border">
        {(
          [
            ["recommended", "Recommended jobs"],
            ["saved", "Saved jobs"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "-mb-px border-b-2 pb-3 text-sm font-medium transition-colors",
              tab === key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
            {key === "saved" && savedJobs.length > 0 && (
              <span className="ml-1.5 rounded-full bg-secondary px-1.5 py-0.5 text-xs text-foreground">
                {savedJobs.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "recommended" ? (
        <RecommendedView
          role={role}
          profiles={profiles}
          onSwitchRole={switchRole}
          filters={filters}
          onEditFilters={() => setEditOpen(true)}
          onResetFilters={() => resetFilters(role)}
          count={count}
          showLoading={showLoading}
          list={recommended}
          selected={selectedRec}
          selectedId={selectedId}
          onSelect={selectRecommended}
          onSave={saveFromRecommended}
          onDismiss={(id, reason) => {
            dismiss(id, reason);
          }}
          savedMap={saved}
          resume={profile.resume}
          onTailor={openTailor}
          detailRef={detailRef}
        />
      ) : (
        <SavedView
          savedJobs={savedJobs}
          pendingRemovals={pendingRemovals}
          selected={selectedSaved}
          selectedId={savedSelectedId}
          onSelect={setSavedSelectedId}
          onRemove={removeSaved}
          onRestore={restoreSaved}
          resume={profile.resume}
          onTailor={openTailor}
          detailRef={detailRef}
        />
      )}

      <EditFiltersModal
        open={editOpen}
        onOpenChange={setEditOpen}
        role={role}
        applied={filters}
        onApply={setFilters}
      />

      <TailorDialog
        open={tailor.open}
        onClose={() => setTailor((t) => ({ ...t, open: false }))}
        resumeTitle={`Resume, ${tailor.role}`}
        initialJobDescription={tailor.jd}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Recommended view                                                   */
/* ------------------------------------------------------------------ */

function RecommendedView({
  role,
  profiles,
  onSwitchRole,
  filters,
  onEditFilters,
  onResetFilters,
  count,
  showLoading,
  list,
  selected,
  selectedId,
  onSelect,
  onSave,
  onDismiss,
  savedMap,
  resume,
  onTailor,
  detailRef,
}: {
  role: string;
  profiles: Profile[];
  onSwitchRole: (i: number) => void;
  filters: ReturnType<typeof useJobsStore.getState>["filters"];
  onEditFilters: () => void;
  onResetFilters: () => void;
  count: number;
  showLoading: boolean;
  list: JobPosting[];
  selected: JobPosting | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onSave: (job: JobPosting) => void;
  onDismiss: (id: string, reason: string) => void;
  savedMap: Record<string, JobPosting>;
  resume: ScoreResume;
  onTailor: (job: JobPosting, sb: MatchScoreboard | null) => void;
  detailRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div>
      {/* Heading + role switcher */}
      <div className="mt-6">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          Top picks for{" "}
          {profiles.length > 1 ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center gap-1 text-primary outline-none hover:opacity-80">
                {role}
                <ChevronDown className="size-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-56">
                {profiles.map((p, i) => (
                  <DropdownMenuItem key={p.role} onClick={() => onSwitchRole(i)}>
                    {p.role}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <span className="text-primary">{role}</span>
          )}
        </h1>
      </div>

      {/* Filter chips */}
      <div className="mt-4">
        <FilterChips filters={filters} onEdit={onEditFilters} />
      </div>

      {showLoading ? (
        <JobsLoading />
      ) : (
        <>
          {/* Count + sort */}
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {list.length > 0
                ? `${count.toLocaleString("en-US")} jobs found`
                : "No matching jobs"}
            </p>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground">
              <ArrowUpDown className="size-4 text-muted-foreground" />
              Best match
            </span>
          </div>

          {list.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
              <h2 className="text-lg font-semibold text-foreground">
                We did not find jobs matching your resume
              </h2>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                Add recent achievements or expand your location to discover more roles.
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onEditFilters}
                  className="inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                >
                  Edit filters
                </button>
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="inline-flex h-10 items-center rounded-full bg-secondary px-5 text-sm font-semibold text-foreground transition-colors hover:bg-[color-mix(in_oklab,var(--secondary),black_4%)]"
                >
                  Reset filters
                </button>
                <Link
                  href="/builder"
                  className="inline-flex h-10 items-center rounded-full border border-border bg-card px-5 text-sm font-semibold text-foreground transition-colors hover:border-foreground/20"
                >
                  Improve resume
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
              <div className="space-y-3">
                {list.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    selected={job.id === selectedId}
                    saved={Boolean(savedMap[job.id])}
                    onSelect={() => onSelect(job.id)}
                    onSave={() => onSave(job)}
                    onDismiss={(reason) => onDismiss(job.id, reason)}
                  />
                ))}
              </div>

              <div ref={detailRef} className="lg:sticky lg:top-20">
                {selected && (
                  <JobDetail
                    job={selected}
                    resume={resume}
                    saved={Boolean(savedMap[selected.id])}
                    onSave={() => onSave(selected)}
                    onDismiss={(reason) => onDismiss(selected.id, reason)}
                    onTailor={onTailor}
                  />
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Saved view                                                         */
/* ------------------------------------------------------------------ */

function SavedView({
  savedJobs,
  pendingRemovals,
  selected,
  selectedId,
  onSelect,
  onRemove,
  onRestore,
  resume,
  onTailor,
  detailRef,
}: {
  savedJobs: JobPosting[];
  pendingRemovals: ReturnType<typeof useJobsStore.getState>["pendingRemovals"];
  selected: JobPosting | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onRestore: (id: string) => void;
  resume: ScoreResume;
  onTailor: (job: JobPosting, sb: MatchScoreboard | null) => void;
  detailRef: React.RefObject<HTMLDivElement | null>;
}) {
  const empty = savedJobs.length === 0 && pendingRemovals.length === 0;

  return (
    <div>
      <h1 className="mt-6 text-2xl font-bold text-foreground sm:text-3xl">
        Your saved jobs
      </h1>

      {empty ? (
        <SavedEmptyState />
      ) : (
        <>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {savedJobs.length} {savedJobs.length === 1 ? "job" : "jobs"}
            </p>
            {savedJobs.length > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground">
                <ArrowUpDown className="size-4 text-muted-foreground" />
                Best match
              </span>
            )}
          </div>

          <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
            <div className="space-y-3">
              {/* Undo cards for just-removed jobs */}
              {pendingRemovals.map((p) => (
                <div
                  key={p.jobId}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-secondary/50 px-4 py-3.5"
                >
                  <p className="min-w-0 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{p.job.title}</span>
                    , {p.job.company} is removed from your bookmarks.
                  </p>
                  <button
                    type="button"
                    onClick={() => onRestore(p.jobId)}
                    className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-primary hover:opacity-80"
                  >
                    <Undo2 className="size-4" />
                    Undo
                  </button>
                </div>
              ))}

              {savedJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  selected={job.id === selectedId}
                  saved
                  onSelect={() => onSelect(job.id)}
                  onSave={() => onRemove(job.id)}
                />
              ))}
            </div>

            <div ref={detailRef} className="lg:sticky lg:top-20">
              {selected && (
                <JobDetail
                  job={selected}
                  resume={resume}
                  saved
                  onSave={() => onRemove(selected.id)}
                  onTailor={onTailor}
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
