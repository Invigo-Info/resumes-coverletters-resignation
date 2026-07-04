"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronDown, ArrowUpDown, FileText, Undo2, Heart } from "lucide-react";
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
  postedWithinDays,
  postedAgeHours,
  DATE_POSTED_DAYS,
  type JobPosting,
  type ResumeProfile,
} from "@/lib/jobs/job-search";
import { buildKeywordMatch } from "@/lib/jobs/keyword-match";
import type { ScoreResume } from "@/lib/jobs/scoreboard";
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
/* Tabs + sort                                                        */
/* ------------------------------------------------------------------ */

type Tab = "recommended" | "saved";
type SortMode = "match" | "new" | "old";

const SORT_LABEL: Record<SortMode, string> = {
  match: "Match",
  new: "New to old",
  old: "Old to new",
};

/** A Search / Saved toggle pill in the list header. */
function TabPill({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-foreground text-background"
          : "bg-secondary text-foreground hover:bg-[color-mix(in_oklab,var(--secondary),black_4%)]"
      )}
    >
      {icon}
      {children}
    </button>
  );
}

/** The "Match / New to old / Old to new" sort dropdown. */
function SortMenu({ value, onChange }: { value: SortMode; onChange: (v: SortMode) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground outline-none transition-colors hover:border-foreground/20">
        <ArrowUpDown className="size-4 text-muted-foreground" />
        {SORT_LABEL[value]}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        {(["match", "new", "old"] as SortMode[]).map((m) => (
          <DropdownMenuItem key={m} onClick={() => onChange(m)}>
            <span
              className={cn(
                "grid size-4 place-items-center rounded-full border",
                value === m ? "border-primary" : "border-border"
              )}
            >
              {value === m && <span className="size-2 rounded-full bg-primary" />}
            </span>
            {SORT_LABEL[m]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** The list-column header: Search/Saved pills + result count + sort control. */
function ListHeader({
  tab,
  onTab,
  savedCount,
  count,
  sortMode,
  onSort,
  showMeta,
}: {
  tab: Tab;
  onTab: (t: Tab) => void;
  savedCount: number;
  count: number;
  sortMode: SortMode;
  onSort: (v: SortMode) => void;
  showMeta: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <TabPill active={tab === "recommended"} onClick={() => onTab("recommended")}>
          Search
        </TabPill>
        <TabPill
          active={tab === "saved"}
          onClick={() => onTab("saved")}
          icon={<Heart className={cn("size-3.5", tab === "saved" && "fill-current")} />}
        >
          Saved
          {savedCount > 0 && <span className="opacity-70">{savedCount}</span>}
        </TabPill>
      </div>
      {showMeta && (
        <div className="flex items-center gap-3">
          <span className="whitespace-nowrap text-sm text-muted-foreground">
            {count} found
          </span>
          <SortMenu value={sortMode} onChange={onSort} />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page body                                                          */
/* ------------------------------------------------------------------ */

/**
 * The Jobs experience: resume-matched Recommended jobs (with filters, keyword
 * match rings, an explainable keyword match card, save/dismiss) and a Saved jobs
 * tab (with an undo stack). All results derive from the resume the user
 * built/uploaded.
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
  const [sortMode, setSortMode] = useState<SortMode>("match");
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
      .then((data: { jobs?: JobPosting[] } | null) => {
        if (!alive) return;
        const jobs = Array.isArray(data?.jobs) ? data.jobs : [];
        setLiveJobs(jobs.length ? jobs : generateJobs(profile));
      })
      .catch(() => {
        if (alive) setLiveJobs(generateJobs(profile));
      })
      .finally(() => {
        if (alive) setJobsLoading(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.role, filtersKey]);

  /* ----- Keyword match score per job (drives rings + Match sort) ----- */
  const scores = useMemo(() => {
    const m = new Map<string, number>();
    if (!profile) return m;
    for (const j of liveJobs ?? []) m.set(j.id, buildKeywordMatch(j, profile.resume).score);
    for (const j of Object.values(saved))
      if (!m.has(j.id)) m.set(j.id, buildKeywordMatch(j, profile.resume).score);
    return m;
  }, [liveJobs, saved, profile]);

  const scoreOf = (job: JobPosting) => scores.get(job.id) ?? job.matchScore;

  /** Sort a list by the active sort mode (Match / New to old / Old to new). */
  const sortJobs = (jobs: JobPosting[]): JobPosting[] => {
    const arr = [...jobs];
    arr.sort((a, b) => {
      if (sortMode === "match") return scoreOf(b) - scoreOf(a);
      const ah = postedAgeHours(a);
      const bh = postedAgeHours(b);
      return sortMode === "new" ? ah - bh : bh - ah;
    });
    return arr;
  };

  /* ----- Apply work-model + date + dismissed filters, then sort ----- */
  const recommended = useMemo(() => {
    const jobs = liveJobs ?? [];
    const maxDays = DATE_POSTED_DAYS[filters.datePosted];
    const filtered = jobs.filter((j) => {
      if (dismissed.includes(j.id)) return false;
      if (filters.workModel === "remote_only" && j.mode === "On-site") return false;
      if (filters.workModel === "onsite_only" && j.mode === "Remote") return false;
      if (!postedWithinDays(j, maxDays)) return false;
      return true;
    });
    return sortJobs(filtered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveJobs, dismissed, filters.workModel, filters.datePosted, sortMode, scores]);

  const savedJobs = useMemo(
    () => sortJobs(Object.values(saved)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [saved, sortMode, scores]
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

  const openTailor = (job: JobPosting, missing: string[]) => {
    const jd =
      job.description ||
      [
        job.summary,
        ...job.responsibilities,
        ...job.qualifications,
        ...missing.map((m) => `Keyword: ${m}`),
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
  const showLoading = jobsLoading && liveJobs === null;

  const selectedRec = recommended.find((j) => j.id === selectedId) ?? null;
  const selectedSaved = savedJobs.find((j) => j.id === savedSelectedId) ?? null;

  return (
    <div>
      {tab === "recommended" ? (
        <RecommendedView
          role={role}
          profiles={profiles}
          onSwitchRole={switchRole}
          filters={filters}
          onEditFilters={() => setEditOpen(true)}
          onResetFilters={() => resetFilters(role)}
          showLoading={showLoading}
          list={recommended}
          selected={selectedRec}
          selectedId={selectedId}
          onSelect={selectRecommended}
          onSave={saveFromRecommended}
          onDismiss={(id, reason) => dismiss(id, reason)}
          savedMap={saved}
          resume={profile.resume}
          scoreOf={scoreOf}
          onTailor={openTailor}
          detailRef={detailRef}
          tab={tab}
          onTab={setTab}
          savedCount={savedJobs.length}
          sortMode={sortMode}
          onSort={setSortMode}
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
          scoreOf={scoreOf}
          onTailor={openTailor}
          detailRef={detailRef}
          tab={tab}
          onTab={setTab}
          sortMode={sortMode}
          onSort={setSortMode}
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
  showLoading,
  list,
  selected,
  selectedId,
  onSelect,
  onSave,
  onDismiss,
  savedMap,
  resume,
  scoreOf,
  onTailor,
  detailRef,
  tab,
  onTab,
  savedCount,
  sortMode,
  onSort,
}: {
  role: string;
  profiles: Profile[];
  onSwitchRole: (i: number) => void;
  filters: ReturnType<typeof useJobsStore.getState>["filters"];
  onEditFilters: () => void;
  onResetFilters: () => void;
  showLoading: boolean;
  list: JobPosting[];
  selected: JobPosting | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onSave: (job: JobPosting) => void;
  onDismiss: (id: string, reason: string) => void;
  savedMap: Record<string, JobPosting>;
  resume: ScoreResume;
  scoreOf: (job: JobPosting) => number;
  onTailor: (job: JobPosting, missing: string[]) => void;
  detailRef: React.RefObject<HTMLDivElement | null>;
  tab: Tab;
  onTab: (t: Tab) => void;
  savedCount: number;
  sortMode: SortMode;
  onSort: (v: SortMode) => void;
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
        <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
          {/* Left column: header + list (or empty state) */}
          <div>
            <ListHeader
              tab={tab}
              onTab={onTab}
              savedCount={savedCount}
              count={list.length}
              sortMode={sortMode}
              onSort={onSort}
              showMeta={list.length > 0}
            />

            {list.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center">
                <h2 className="text-lg font-semibold text-foreground">
                  We did not find jobs matching your resume
                </h2>
                <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                  Add recent achievements or expand your location to discover more
                  roles.
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
              <div className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
                {list.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    score={scoreOf(job)}
                    selected={job.id === selectedId}
                    saved={Boolean(savedMap[job.id])}
                    onSelect={() => onSelect(job.id)}
                    onSave={() => onSave(job)}
                    onDismiss={(reason) => onDismiss(job.id, reason)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right column: detail */}
          <div ref={detailRef} className="lg:sticky lg:top-20">
            {selected && (
              <JobDetail
                job={selected}
                resume={resume}
                saved={Boolean(savedMap[selected.id])}
                onSave={() => onSave(selected)}
                onTailor={onTailor}
              />
            )}
          </div>
        </div>
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
  scoreOf,
  onTailor,
  detailRef,
  tab,
  onTab,
  sortMode,
  onSort,
}: {
  savedJobs: JobPosting[];
  pendingRemovals: ReturnType<typeof useJobsStore.getState>["pendingRemovals"];
  selected: JobPosting | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onRestore: (id: string) => void;
  resume: ScoreResume;
  scoreOf: (job: JobPosting) => number;
  onTailor: (job: JobPosting, missing: string[]) => void;
  detailRef: React.RefObject<HTMLDivElement | null>;
  tab: Tab;
  onTab: (t: Tab) => void;
  sortMode: SortMode;
  onSort: (v: SortMode) => void;
}) {
  const empty = savedJobs.length === 0 && pendingRemovals.length === 0;

  return (
    <div>
      <h1 className="mt-6 text-2xl font-bold text-foreground sm:text-3xl">
        Your saved jobs
      </h1>

      <div className="mt-4 grid items-start gap-5 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
        <div>
          <ListHeader
            tab={tab}
            onTab={onTab}
            savedCount={savedJobs.length}
            count={savedJobs.length}
            sortMode={sortMode}
            onSort={onSort}
            showMeta={savedJobs.length > 0}
          />

          {empty ? (
            <SavedEmptyState />
          ) : (
            <div className="mt-4 space-y-3">
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

              {savedJobs.length > 0 && (
                <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
                  {savedJobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      score={scoreOf(job)}
                      selected={job.id === selectedId}
                      saved
                      onSelect={() => onSelect(job.id)}
                      onSave={() => onRemove(job.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
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
    </div>
  );
}
