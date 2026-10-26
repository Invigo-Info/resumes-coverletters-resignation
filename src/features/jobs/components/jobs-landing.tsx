"use client";

import { useState } from "react";
import { Search, MapPin, Briefcase, FileText, Heart, Trophy, Sparkles, Mail, Mic, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/utilities/utils";
import type { JobFilters } from "@/features/jobs/lib/job-search";

type WorkOption = { label: string; value: JobFilters["workModel"] };
type DateOption = { label: string; value: JobFilters["datePosted"] };

const WORK_OPTIONS: WorkOption[] = [
  { label: "Remote and on-site", value: "remote_and_onsite" },
  { label: "Remote only", value: "remote_only" },
  { label: "On-site only", value: "onsite_only" },
];
const DATE_OPTIONS: DateOption[] = [
  { label: "Past 24 hours", value: "24h" },
  { label: "Past week", value: "week" },
  { label: "Past month", value: "month" },
];

const FLOW: { title: string; sub: string; icon: LucideIcon }[] = [
  { title: "Search & score", sub: "Every role scored vs your resume", icon: Search },
  { title: "Tailor to 99", sub: "AI weaves in missing keywords", icon: Sparkles },
  { title: "Attach a letter", sub: "Written for that company", icon: Mail },
  { title: "Prep the interview", sub: "Likely questions per job", icon: Mic },
];

/** A preference chip: filled blue when active, outline blue otherwise. */
function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-[6px] border-[1.5px] px-3.5 py-2 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-(--brand-blue) text-primary-foreground"
          : "border-primary bg-card text-primary hover:bg-accent"
      )}
    >
      {children}
    </button>
  );
}

/**
 * The Job Search section dashboard: a hero landing shown before results. The user
 * searches from here (title + location + preferences), which hands a full
 * JobFilters up to the parent to run the existing master/detail search. Every
 * stat is real (counts + best match passed in from the scored results).
 */
export function JobsLanding({
  defaultTitle,
  trending,
  resumeCount,
  savedCount,
  bestMatch,
  onSearch,
}: {
  defaultTitle: string;
  trending: string[];
  resumeCount: number;
  savedCount: number;
  bestMatch: number | null;
  onSearch: (filters: JobFilters) => void;
}) {
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [workModel, setWorkModel] = useState<JobFilters["workModel"]>("remote_and_onsite");
  const [datePosted, setDatePosted] = useState<JobFilters["datePosted"]>("month");

  const run = () => {
    const t = title.trim() || defaultTitle.trim();
    onSearch({
      jobTitles: t ? [t] : [],
      locations: location.trim() ? [location.trim()] : [],
      datePosted,
      workModel,
      sort: "best_match",
    });
  };

  const stats: {
    value: number | string;
    label: string;
    icon: LucideIcon;
    tint: string;
  }[] = [
    {
      value: resumeCount,
      label: resumeCount === 1 ? "resume to match" : "resumes to match",
      icon: FileText,
      tint: "bg-primary/10 text-primary",
    },
    {
      value: savedCount,
      label: savedCount === 1 ? "saved job" : "saved jobs",
      icon: Heart,
      tint: "bg-destructive/10 text-destructive",
    },
    {
      value: bestMatch ?? "-",
      label: "your top match score",
      icon: Trophy,
      tint: "bg-progress-low/10 text-progress-low",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl pt-6 sm:pt-10">
        <h1 className="text-center font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Find your{" "}
          <span className="bg-brand-gradient bg-clip-text text-transparent">
            next role
          </span>
        </h1>
        <p className="mx-auto mt-3 max-w-md text-center text-sm text-muted-foreground sm:text-base">
          Search thousands of openings, scored against your resume so the best
          matches rise to the top.
        </p>

        {/* unified search bar */}
        <div className="mt-8 flex flex-col gap-2 rounded-2xl bg-card p-2 shadow-card ring-1 ring-border sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-2 px-3 py-2">
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && run()}
              placeholder={`Job title, e.g. ${defaultTitle || "Product Manager"}`}
              aria-label="Job title"
              className="w-full min-w-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          <span className="hidden h-7 w-px shrink-0 bg-border sm:block" />
          <div className="flex flex-1 items-center gap-2 px-3 py-2">
            <MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && run()}
              placeholder="Anywhere"
              aria-label="Location"
              className="w-full min-w-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          <button
            type="button"
            onClick={run}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-(--brand-blue) px-6 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
          >
            <Search className="size-4" aria-hidden />
            Search
          </button>
        </div>

        {/* trending */}
        {trending.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
            <span className="text-sm text-muted-foreground">Trending:</span>
            {trending.slice(0, 4).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setTitle(s)}
                className={cn(
                  "rounded-[6px] border-[1.5px] border-primary px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-accent",
                  title === s && "bg-accent"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* search preferences */}
        <div className="mt-7 rounded-2xl bg-card p-5 shadow-card ring-1 ring-border">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="mb-2.5 text-xs font-semibold text-muted-foreground">Work model</p>
              <div className="flex flex-wrap gap-2">
                {WORK_OPTIONS.map((o) => (
                  <Chip key={o.value} active={workModel === o.value} onClick={() => setWorkModel(o.value)}>
                    {o.label}
                  </Chip>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2.5 text-xs font-semibold text-muted-foreground">Date posted</p>
              <div className="flex flex-wrap gap-2">
                {DATE_OPTIONS.map((o) => (
                  <Chip key={o.value} active={datePosted === o.value} onClick={() => setDatePosted(o.value)}>
                    {o.label}
                  </Chip>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* stat tiles */}
        <div className="mt-6 grid grid-cols-3 gap-3 sm:gap-4">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-card ring-1 ring-border"
              >
                <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", s.tint)}>
                  <Icon className="size-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-lg font-extrabold leading-tight text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* from search to offer */}
        <div className="mt-6 rounded-2xl bg-card p-5 shadow-card ring-1 ring-border">
          <h2 className="mb-4 text-base font-bold text-foreground">From search to offer</h2>
          <ol className="flex flex-wrap items-stretch gap-2">
            {FLOW.map((step, i) => {
              const Icon = step.icon;
              return (
                <li key={step.title} className="flex flex-1 items-center gap-2" style={{ minWidth: 180 }}>
                  <div className="flex-1 rounded-xl bg-secondary/60 p-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        {i + 1}
                      </span>
                      <Icon className="size-4 shrink-0 text-primary" aria-hidden />
                      <span className="text-sm font-semibold text-foreground">{step.title}</span>
                    </div>
                    <p className="mt-1.5 pl-[34px] text-xs text-muted-foreground">{step.sub}</p>
                  </div>
                  {i < FLOW.length - 1 && (
                    <ChevronRight className="hidden size-4 shrink-0 text-muted-foreground lg:block" aria-hidden />
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        {/* browse-all escape hatch: search with the resume role */}
        <div className="mt-6 flex items-center justify-center gap-2 pb-2">
          <Briefcase className="size-4 text-muted-foreground" aria-hidden />
          <button
            type="button"
            onClick={run}
            className="text-sm font-semibold text-primary hover:underline"
          >
            Or browse all roles matched to your resume
          </button>
        </div>
      </div>
  );
}
