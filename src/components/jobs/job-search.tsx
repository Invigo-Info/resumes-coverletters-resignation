"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Bookmark,
  BookmarkCheck,
  X,
  SlidersHorizontal,
  Briefcase,
  ChevronDown,
  ArrowUpDown,
  FileText,
} from "lucide-react";
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
  matchMeta,
  type JobPosting,
  type ResumeProfile,
} from "@/lib/jobs/job-search";

/* ------------------------------------------------------------------ */
/* Resume -> profiles                                                 */
/* ------------------------------------------------------------------ */

/** Pull a usable target role from a resume's content. */
function profileFromResume(
  role: string,
  skills: string[],
  location: string
): ResumeProfile {
  return { role: role.trim(), skills: skills.filter(Boolean), location: location.trim() };
}

/* ------------------------------------------------------------------ */
/* Match badge                                                        */
/* ------------------------------------------------------------------ */

/** The circular score + "Strong match" label shown on each card. */
function MatchBadge({ score }: { score: number }) {
  const { label, strong } = matchMeta(score);
  const color = strong ? "#16A34A" : "#D97706";
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="grid size-8 shrink-0 place-items-center rounded-full border-2 text-[11px] font-semibold"
        style={{ borderColor: color, color }}
      >
        {score}
      </span>
      <span className="text-sm font-medium text-foreground">{label}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Job card                                                           */
/* ------------------------------------------------------------------ */

function JobCard({
  job,
  selected,
  saved,
  onSelect,
  onToggleSave,
  onDismiss,
}: {
  job: JobPosting;
  selected: boolean;
  saved: boolean;
  onSelect: () => void;
  onToggleSave: () => void;
  onDismiss?: () => void;
}) {
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
        "group cursor-pointer rounded-2xl border bg-card p-4 text-left transition-colors",
        selected
          ? "border-primary ring-2 ring-primary/20"
          : "border-border hover:border-foreground/20"
      )}
    >
      <div className="flex gap-3">
        {/* Company logo placeholder (initial) */}
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-sm font-semibold text-foreground">
          {job.company.charAt(0).toUpperCase()}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 text-[15px] font-semibold leading-snug text-foreground">
              {job.title}, {job.company}
            </h3>
            <span className="shrink-0 text-xs text-muted-foreground">
              {job.postedLabel}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {job.locationLabel}, {job.salaryLabel}/year
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <MatchBadge score={job.matchScore} />

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave();
            }}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium transition-colors",
              saved
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
            aria-pressed={saved}
          >
            {saved ? (
              <BookmarkCheck className="size-4" />
            ) : (
              <Bookmark className="size-4" />
            )}
            {saved ? "Saved" : "Save"}
          </button>
          {onDismiss && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
              aria-label={`Dismiss ${job.title}`}
              className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Detail panel                                                       */
/* ------------------------------------------------------------------ */

function JobDetail({
  job,
  saved,
  onToggleSave,
}: {
  job: JobPosting;
  saved: boolean;
  onToggleSave: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="flex items-start justify-between gap-3 border-b border-border p-5">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-foreground">
            {job.title}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {job.company}, {job.locationLabel}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="inline-flex h-9 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={onToggleSave}
            aria-pressed={saved}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            {saved ? (
              <BookmarkCheck className="size-4" />
            ) : (
              <Bookmark className="size-4" />
            )}
            {saved ? "Saved" : "Save"}
          </button>
        </div>
      </div>

      <div className="max-h-[60vh] space-y-6 overflow-y-auto p-5">
        <p className="text-sm leading-relaxed text-muted-foreground">{job.summary}</p>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-foreground">
            Responsibilities
          </h3>
          <ul className="space-y-2">
            {job.responsibilities.map((r, i) => (
              <li
                key={i}
                className="flex gap-2 text-sm leading-relaxed text-muted-foreground"
              >
                <span
                  className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground/60"
                  aria-hidden
                />
                {r}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-foreground">
            Qualifications
          </h3>
          <ul className="space-y-2">
            {job.qualifications.map((q, i) => (
              <li
                key={i}
                className="flex gap-2 text-sm leading-relaxed text-muted-foreground"
              >
                <span
                  className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground/60"
                  aria-hidden
                />
                {q}
              </li>
            ))}
          </ul>
        </section>

        <p className="text-xs text-muted-foreground">
          Pay range: {job.salaryLabel}/year. {job.mode}.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page body                                                          */
/* ------------------------------------------------------------------ */

type Tab = "recommended" | "saved";

/**
 * The Jobs search experience: recommended postings matched to the user's
 * resume, plus a Saved tab. The role, salaries, and qualifications all derive
 * from the resume the user uploaded/built.
 */
export function JobSearch() {
  const resumes = useDocumentsStore((s) => s.resumes);
  // Select each field separately - a selector returning a new object every
  // render would loop Zustand's useSyncExternalStore.
  const activeRole = useResumeStore((s) => s.personal.jobTitle);
  const activeSkills = useResumeStore((s) => s.skills);
  const activeLocation = useResumeStore((s) => s.contact.location);
  const activeEmployment = useResumeStore((s) => s.employment);

  const saved = useJobsStore((s) => s.saved);
  const dismissed = useJobsStore((s) => s.dismissed);
  const toggleSave = useJobsStore((s) => s.toggleSave);
  const dismiss = useJobsStore((s) => s.dismiss);

  // Drafts live in localStorage - render real content only after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [tab, setTab] = useState<Tab>("recommended");
  const [roleIndex, setRoleIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  // Build the list of role profiles available from the user's resumes (plus the
  // in-progress one), de-duplicated by role title.
  const profiles = useMemo<ResumeProfile[]>(() => {
    if (!mounted) return [];
    const out: ResumeProfile[] = [];
    const seen = new Set<string>();
    const add = (role: string, skills: string[], location: string) => {
      const r = role.trim();
      if (!r || seen.has(r.toLowerCase())) return;
      seen.add(r.toLowerCase());
      out.push(profileFromResume(r, skills, location));
    };
    for (const rec of resumes) {
      const role =
        rec.data.personal.jobTitle?.trim() ||
        rec.data.employment?.find((e) => e.jobTitle.trim())?.jobTitle ||
        "";
      add(
        role,
        (rec.data.skills ?? []).map((sk) => sk.name),
        rec.data.contact?.location ?? ""
      );
    }
    const empRole = activeEmployment.find((e) => e.jobTitle.trim())?.jobTitle ?? "";
    add(activeRole || empRole, activeSkills.map((sk) => sk.name), activeLocation);
    return out;
  }, [mounted, resumes, activeRole, activeSkills, activeLocation, activeEmployment]);

  const profile = profiles[roleIndex] ?? profiles[0];

  // Generated jobs for the selected role (stable per role).
  const allJobs = useMemo<JobPosting[]>(
    () => (profile ? generateJobs(profile) : []),
    [profile]
  );

  const recommended = useMemo(
    () => allJobs.filter((j) => !dismissed.includes(j.id)),
    [allJobs, dismissed]
  );
  const savedJobs = useMemo(() => Object.values(saved), [saved]);

  const list = tab === "recommended" ? recommended : savedJobs;

  // Keep a valid selection whenever the visible list changes.
  useEffect(() => {
    if (list.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !list.some((j) => j.id === selectedId)) {
      setSelectedId(list[0].id);
    }
  }, [list, selectedId]);

  const selected = list.find((j) => j.id === selectedId) ?? null;

  const selectJob = (id: string) => {
    setSelectedId(id);
    // On mobile the detail sits below the list - scroll it into view.
    if (window.matchMedia("(max-width: 1023px)").matches) {
      requestAnimationFrame(() =>
        detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      );
    }
  };

  /* ----- Empty: no resume to match against ----- */
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

  /* ----- Loading skeleton (pre-mount) ----- */
  if (!mounted) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-secondary" />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-2xl bg-secondary"
              />
            ))}
          </div>
          <div className="hidden h-96 animate-pulse rounded-2xl bg-secondary lg:block" />
        </div>
      </div>
    );
  }

  const role = profile?.role ?? "";
  const count = jobCountFor(role);

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
                  <DropdownMenuItem
                    key={p.role}
                    onClick={() => {
                      setRoleIndex(i);
                      setSelectedId(null);
                    }}
                  >
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

      {/* Filter chips (display) */}
      {tab === "recommended" && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground">
            <SlidersHorizontal className="size-4 text-muted-foreground" />
            Edit filters
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm text-foreground">
            <Briefcase className="size-4 text-muted-foreground" />
            {role}
          </span>
          <span className="rounded-full border border-border bg-card px-3 py-1.5 text-sm text-foreground">
            Remote and on-site
          </span>
          <span className="rounded-full border border-border bg-card px-3 py-1.5 text-sm text-foreground">
            Past month
          </span>
        </div>
      )}

      {/* Count + sort */}
      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {tab === "recommended"
            ? `${count.toLocaleString("en-US")} jobs found`
            : `${savedJobs.length} saved ${savedJobs.length === 1 ? "job" : "jobs"}`}
        </p>
        {tab === "recommended" && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground">
            <ArrowUpDown className="size-4 text-muted-foreground" />
            Best match
          </span>
        )}
      </div>

      {/* List + detail */}
      {list.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            {tab === "saved"
              ? "No saved jobs yet. Tap Save on a posting to keep it here."
              : "No more recommendations right now. Check back soon."}
          </p>
        </div>
      ) : (
        <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
          <div className="space-y-3">
            {list.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                selected={job.id === selectedId}
                saved={Boolean(saved[job.id])}
                onSelect={() => selectJob(job.id)}
                onToggleSave={() => toggleSave(job)}
                onDismiss={tab === "recommended" ? () => dismiss(job.id) : undefined}
              />
            ))}
          </div>

          <div ref={detailRef} className="lg:sticky lg:top-20">
            {selected && (
              <JobDetail
                job={selected}
                saved={Boolean(saved[selected.id])}
                onToggleSave={() => toggleSave(selected)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
