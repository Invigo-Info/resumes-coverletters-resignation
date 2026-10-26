"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Mic,
  MessageSquareText,
  Heart,
  FileText,
  Crosshair,
  ChevronRight,
  PhoneCall,
  UserRound,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/utilities/utils";
import { useDocumentsStore } from "@/features/resume-builder/store/documents-store";
import { useInterviewPrepDocumentsStore } from "@/features/interview-prep/store/interview-prep-documents-store";
import { useJobsStore } from "@/features/jobs/store/jobs-store";
import { INTERVIEW_TYPES, type InterviewType } from "@/features/interview-prep/lib/interview-prep";
import type { JobPosting } from "@/features/jobs/lib/job-search";

/** The four steps of a prep session - explanatory, not data. */
const FLOW: { title: string; sub: string; icon: LucideIcon }[] = [
  { title: "Pick a resume", sub: "AI scans it for context", icon: FileText },
  { title: "Set your target", sub: "A company or just practice", icon: Crosshair },
  { title: "Choose the type", sub: "Screening, manager, technical", icon: Mic },
  { title: "Rehearse answers", sub: "Tips and model responses", icon: MessageSquareText },
];

/** Icon per quick-practice type (Other is excluded - it needs a custom brief). */
const QUICK_ICON: Partial<Record<InterviewType, LucideIcon>> = {
  screening: PhoneCall,
  manager: UserRound,
  technical: Wrench,
};

/**
 * v9 interview-prep section dashboard (the /interview-prep landing). A greeting +
 * "Start a prep session", at-a-glance stat tiles, a "how a prep session works"
 * pipeline, and two shortcut columns: Quick practice (jump straight into a type
 * using the first resume) and Prep for a saved job. Adapts to a new user (zero
 * counts + empty states) and an existing user (real counts + data). All actions
 * are delegated to the parent, which owns the prep-flow state machine.
 */
export function InterviewPrepDashboard({
  onStart,
  onQuickPractice,
  onPrepSavedJob,
}: {
  /** Start a fresh prep session -> the "Start with your resume" picker (Step 1). */
  onStart: () => void;
  /** Jump straight to questions for a type, using the first saved resume. */
  onQuickPractice: (type: InterviewType) => void;
  /** Prep for a specific saved job -> the interview-type picker for that job. */
  onPrepSavedJob: (job: JobPosting) => void;
}) {
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const resumes = useDocumentsStore((s) => s.resumes);
  const sheets = useInterviewPrepDocumentsStore((s) => s.sheets);
  const savedJobsMap = useJobsStore((s) => s.saved);
  const savedJobs = Object.values(savedJobsMap);
  const savedJobCount = savedJobs.length;
  const hasResume = resumes.length > 0;

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

  // First saved resume grounds Quick practice; its name labels the section.
  const firstResumeLabel = hasResume
    ? (resumes[0].title?.trim() || "your resume")
    : "";

  const stats: {
    value: number | string;
    label: string;
    icon: LucideIcon;
    tint: string;
  }[] = [
    {
      value: INTERVIEW_TYPES.length,
      label: "interview types covered",
      icon: Mic,
      tint: "bg-ai-text/10 text-ai-text",
    },
    {
      value: sheets.length,
      label: sheets.length === 1 ? "saved prep sheet" : "saved prep sheets",
      icon: MessageSquareText,
      tint: "bg-primary/10 text-primary",
    },
    {
      value: savedJobCount,
      label: savedJobCount === 1 ? "saved job to prep for" : "saved jobs to prep for",
      icon: Heart,
      tint: "bg-destructive/10 text-destructive",
    },
    {
      value: resumes.length,
      label: resumes.length === 1 ? "resume powering prep" : "resumes powering prep",
      icon: FileText,
      tint: "bg-progress-done/10 text-progress-done",
    },
  ];

  const quickTypes = INTERVIEW_TYPES.filter((t) => t.id !== "other");

  return (
    <div className="space-y-6">
      {/* Greeting + start CTA */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            {greeting}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Walk in knowing what they will ask - and how you will answer.
          </p>
        </div>
        <button
          type="button"
          onClick={onStart}
          className="inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-[6px] bg-(--brand-blue) px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          <Mic className="size-4" aria-hidden />
          Start a prep session
        </button>
      </div>

      {/* Stat tiles - all real counts. */}
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

      {/* How a prep session works */}
      <div className="rounded-2xl bg-card p-5 shadow-card ring-1 ring-border">
        <h2 className="mb-4 text-base font-bold text-foreground">
          How a prep session works
        </h2>
        <ol className="flex flex-wrap items-stretch gap-2">
          {FLOW.map((step, i) => {
            const Icon = step.icon;
            return (
              <li
                key={step.title}
                className="flex flex-1 items-center gap-2"
                style={{ minWidth: 180 }}
              >
                <button
                  type="button"
                  onClick={onStart}
                  className="flex-1 cursor-pointer rounded-xl bg-secondary/60 p-3.5 text-left outline-none ring-1 ring-transparent transition-colors hover:ring-primary focus-visible:ring-primary"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      {i + 1}
                    </span>
                    <Icon className="size-4 shrink-0 text-primary" aria-hidden />
                    <span className="text-sm font-semibold text-foreground">
                      {step.title}
                    </span>
                  </div>
                  <p className="mt-1.5 pl-[34px] text-xs text-muted-foreground">
                    {step.sub}
                  </p>
                </button>
                {i < FLOW.length - 1 && (
                  <ChevronRight
                    className="hidden size-4 shrink-0 text-muted-foreground lg:block"
                    aria-hidden
                  />
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {/* Two shortcut columns: quick practice + saved jobs. */}
      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        {/* Quick practice by type */}
        <div className="rounded-2xl bg-card p-5 shadow-card ring-1 ring-border">
          <h2 className="text-base font-bold text-foreground">Quick practice</h2>
          <p className="mt-1 mb-4 text-sm text-muted-foreground">
            {hasResume
              ? `Jump straight to questions using ${firstResumeLabel}.`
              : "Pick a type - we will help you add a resume first."}
          </p>
          <div className="flex flex-col gap-2.5">
            {quickTypes.map((t) => {
              const Icon = QUICK_ICON[t.id] ?? Mic;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onQuickPractice(t.id)}
                  className="flex w-full cursor-pointer items-center gap-3.5 rounded-xl bg-secondary/60 px-4 py-3 text-left outline-none ring-1 ring-transparent transition-colors hover:ring-primary focus-visible:ring-primary"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-primary">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground">
                      {t.title}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {t.subtitle}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-primary" aria-hidden />
                </button>
              );
            })}
          </div>
        </div>

        {/* Prep for a saved job */}
        <div className="rounded-2xl bg-card p-5 shadow-card ring-1 ring-border">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-foreground">Prep for a saved job</h2>
            <span className="text-xs text-muted-foreground">{savedJobCount} saved</span>
          </div>
          {savedJobCount === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">
              No saved jobs yet - save a role in Job Search and it will show up here
              ready to prep for.
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {savedJobs.slice(0, 3).map((job) => (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => onPrepSavedJob(job)}
                  className="flex w-full cursor-pointer items-center gap-3.5 rounded-xl bg-secondary/60 px-4 py-3 text-left outline-none ring-1 ring-transparent transition-colors hover:ring-primary focus-visible:ring-primary"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-sm font-bold uppercase text-primary-foreground">
                    {job.company?.trim().charAt(0) || "?"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {job.title}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {job.company}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-primary" aria-hidden />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
