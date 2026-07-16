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
  jobCountFor,
  postedWithinDays,
  postedAgeHours,
  DATE_POSTED_DAYS,
  type JobPosting,
  type ResumeProfile,
} from "@/lib/jobs/job-search";
import { buildKeywordMatch } from "@/lib/jobs/keyword-match";
import type { ScoreResume } from "@/lib/jobs/scoreboard";
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
  /** Id of the source resume draft, so tailoring loads the right one. */
  resumeId: string;
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
  new: "Newest",
  old: "Oldest",
};

/**
 * The Search / Saved view toggle at the top of the job list - a segmented pill
 * with the active view highlighted (matches the jobs reference).
 */
function ViewToggle({
  tab,
  onTab,
  savedCount,
}: {
  tab: Tab;
  onTab: (t: Tab) => void;
  savedCount: number;
}) {
  const seg = (active: boolean) =>
    cn(
      "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors",
      active
        ? "bg-card text-foreground shadow-sm"
        : "text-muted-foreground hover:text-foreground"
    );
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-muted p-1">
      <button
        type="button"
        onClick={() => onTab("recommended")}
        aria-current={tab === "recommended" ? "page" : undefined}
        className={seg(tab === "recommended")}
      >
        Search
      </button>
      <button
        type="button"
        onClick={() => onTab("saved")}
        aria-current={tab === "saved" ? "page" : undefined}
        className={seg(tab === "saved")}
      >
        <Heart className={cn("size-3.5", tab === "saved" && "fill-current")} />
        Saved
        {savedCount > 0 && <span className="opacity-70">{savedCount}</span>}
      </button>
    </div>
  );
}

/** The "Best match / Newest / Oldest" sort dropdown. */
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

/** The list-column header: Search/Saved toggle + result count + sort control. */
function ListHeader({
  count,
  sortMode,
  onSort,
  showMeta,
  tab,
  onTab,
  savedCount,
}: {
  count: number;
  sortMode: SortMode;
  onSort: (v: SortMode) => void;
  showMeta: boolean;
  tab: Tab;
  onTab: (t: Tab) => void;
  savedCount: number;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <ViewToggle tab={tab} onTab={onTab} savedCount={savedCount} />
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
  const activeId = useResumeStore((s) => s.id);
  const activeRole = useResumeStore((s) => s.personal.jobTitle);
  const activeSkills = useResumeStore((s) => s.skills);
  const activeLocation = useResumeStore((s) => s.contact.location);
  const activeEmployment = useResumeStore((s) => s.employment);
  const activeSummary = useResumeStore((s) => s.summary);

  const saved = useJobsStore((s) => s.saved);
  const dismissed = useJobsStore((s) => s.dismissed);
  const filters = useJobsStore((s) => s.filters);
  const filtersRole = useJobsStore((s) => s.filtersRole);
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
  const detailRef = useRef<HTMLDivElement>(null);

  // Live results from /api/jobs (null = not loaded yet).
  const [liveJobs, setLiveJobs] = useState<JobPosting[] | null>(null);
  // Total available matches for the current query (the big "N found" count).
  const [liveCount, setLiveCount] = useState<number | null>(null);
  const [jobsLoading, setJobsLoading] = useState(false);

  /* ----- Build one profile per resume ----- */
  const profiles = useMemo<Profile[]>(() => {
    if (!mounted) return [];
    const out: Profile[] = [];
    const seen = new Set<string>();
    const add = (
      id: string,
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
        resumeId: id,
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
        rec.id,
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
      activeId,
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
    activeId,
    activeRole,
    activeSkills,
    activeLocation,
    activeEmployment,
    activeSummary,
  ]);

  const profile = profiles[roleIndex] ?? profiles[0];

  /* ----- Seed filters from the resume role (and re-seed when it changes) ----- */
  useEffect(() => {
    if (!mounted || !profile) return;
    // Filters are persisted, so a role left over from a previous resume/session
    // would otherwise stick and surface jobs unrelated to the resume the user
    // just uploaded or selected. Re-seed whenever the active resume's role no
    // longer matches the role the filters were seeded from. Deliberate title
    // edits (same role, extra titles) keep `filtersRole`, so they're preserved.
    const role = profile.role.trim();
    if (role && role !== filtersRole) {
      resetFilters(role);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, profile, filtersRole]);

  /* ----- Fetch live jobs whenever the role or filters change ----- */
  const filtersKey = JSON.stringify(filters);
  useEffect(() => {
    if (!profile) return;
    // Titles to search: the user's chosen title filters, or the resume's role when
    // none are set (e.g. the user cleared the title chip in Edit filters). Without
    // this fallback an empty title list skips the fetch entirely and the page is
    // stuck on the "no jobs" empty state.
    const role = profile.role.trim();
    const searchTitles = filters.jobTitles.length
      ? filters.jobTitles
      : role
        ? [role]
        : [];
    if (searchTitles.length === 0) return;
    // Wait until the filters have been (re-)seeded for THIS resume's role before
    // fetching, so an initial request never goes out for a stale role left in the
    // persisted filters (which would briefly surface unrelated jobs).
    if (role && filtersRole !== role) return;
    let alive = true;
    setJobsLoading(true);
    const params = new URLSearchParams({
      role: profile.role,
      titles: searchTitles.join(","),
      // The live jobs API takes a single "where"; use the first selected location.
      where: filters.locations[0] ?? "",
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
        setLiveJobs(jobs.length ? jobs : generateJobs(profile));
        // Use the live total when the API returns one; otherwise fall back to a
        // large stable per-role count so the header always shows a real "N found".
        setLiveCount(typeof data?.count === "number" && data.count > 0 ? data.count : null);
      })
      .catch(() => {
        if (alive) {
          setLiveJobs(generateJobs(profile));
          setLiveCount(null);
        }
      })
      .finally(() => {
        if (alive) setJobsLoading(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.role, filtersKey, filtersRole]);

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

  const switchRole = (i: number) => {
    setRoleIndex(i);
    const role = profiles[i]?.role ?? "";
    // Reset (not merge) so the new resume's role becomes the seeded role and the
    // recommendations refetch for it; `resetFilters` records `filtersRole`.
    resetFilters(role);
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
  // Show the re-matching state on EVERY fetch (initial load AND filter/role
  // changes), not just the first. The heading + chip row stay visible above it,
  // so applying a filter gives immediate feedback and a visible refresh instead
  // of leaving the previous results on screen while the (slow) live API responds.
  const showLoading = jobsLoading;

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
          resultCount={liveCount ?? jobCountFor(role)}
          list={recommended}
          selected={selectedRec}
          selectedId={selectedId}
          onSelect={selectRecommended}
          onSave={saveFromRecommended}
          onDismiss={(id, reason) => dismiss(id, reason)}
          savedMap={saved}
          resume={profile.resume}
          resumeId={profile.resumeId}
          scoreOf={scoreOf}
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
          resumeId={profile.resumeId}
          scoreOf={scoreOf}
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
  resultCount,
  list,
  selected,
  selectedId,
  onSelect,
  onSave,
  onDismiss,
  savedMap,
  resume,
  resumeId,
  scoreOf,
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
  /** Large total "N found" count for the current query. */
  resultCount: number;
  list: JobPosting[];
  selected: JobPosting | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onSave: (job: JobPosting) => void;
  onDismiss: (id: string, reason: string) => void;
  savedMap: Record<string, JobPosting>;
  resume: ScoreResume;
  resumeId: string;
  scoreOf: (job: JobPosting) => number;
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
      <div className="mt-2">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          Top picks for{" "}
          {profiles.length > 0 ? (
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
        <FilterChips filters={filters} role={role} onEdit={onEditFilters} />
      </div>

      {showLoading ? (
        <JobsLoading />
      ) : (
        <div className="mt-6 grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
          {/* Left column: header + list (or empty state) */}
          <div>
            <ListHeader
              count={resultCount}
              sortMode={sortMode}
              onSort={onSort}
              showMeta={list.length > 0}
              tab={tab}
              onTab={onTab}
              savedCount={savedCount}
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
              <div className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card lg:max-h-[calc(100vh-13rem)] lg:overflow-y-auto">
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
                resumeId={resumeId}
                saved={Boolean(savedMap[selected.id])}
                onSave={() => onSave(selected)}
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
  resumeId,
  scoreOf,
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
  resumeId: string;
  scoreOf: (job: JobPosting) => number;
  detailRef: React.RefObject<HTMLDivElement | null>;
  tab: Tab;
  onTab: (t: Tab) => void;
  sortMode: SortMode;
  onSort: (v: SortMode) => void;
}) {
  const empty = savedJobs.length === 0 && pendingRemovals.length === 0;

  return (
    <div>
      <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
        Your saved jobs
      </h1>

      <div className="mt-4 grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
        <div>
          <ListHeader
            count={savedJobs.length}
            sortMode={sortMode}
            onSort={onSort}
            showMeta={savedJobs.length > 0}
            tab={tab}
            onTab={onTab}
            savedCount={savedJobs.length}
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
                <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card lg:max-h-[calc(100vh-13rem)] lg:overflow-y-auto">
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
              resumeId={resumeId}
              saved
              onSave={() => onRemove(selected.id)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
