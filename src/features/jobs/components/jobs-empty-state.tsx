"use client";

import Link from "next/link";
import { FileText, Check, Target, Sparkles, Mic } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/utilities/utils";

/** Briefcase + score-ring illustration, built from theme tokens. */
function JobsArt() {
  return (
    <svg
      viewBox="0 0 220 170"
      className="mx-auto h-auto w-[240px] max-w-full"
      role="img"
      aria-label="Jobs scored against your resume"
    >
      <circle cx="110" cy="92" r="82" fill="var(--brand-blue-soft)" opacity="0.6" />
      {/* briefcase */}
      <rect x="62" y="70" width="96" height="66" rx="10" fill="var(--card)" stroke="var(--border)" strokeWidth="1.5" />
      <path
        d="M92 70v-8a8 8 0 0 1 8-8h20a8 8 0 0 1 8 8v8"
        fill="none"
        stroke="var(--border)"
        strokeWidth="1.5"
      />
      <rect x="62" y="92" width="96" height="10" fill="var(--brand-blue-soft)" />
      <rect x="102" y="94" width="16" height="6" rx="3" fill="var(--brand-blue)" />
      {/* score-ring badge */}
      <g transform="translate(158 58)">
        <circle cx="0" cy="0" r="26" fill="var(--card)" stroke="var(--border)" strokeWidth="1" />
        <circle cx="0" cy="0" r="20" fill="none" stroke="var(--muted)" strokeWidth="5" />
        <circle
          cx="0"
          cy="0"
          r="20"
          fill="none"
          stroke="var(--brand-blue)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray="126"
          strokeDashoffset="14"
          transform="rotate(-90)"
        />
        <text x="0" y="5" textAnchor="middle" fontSize="14" fontWeight="800" fill="var(--brand-blue)">
          99
        </text>
      </g>
      <path
        d="M52 44 l2.4 6 6 2.4 -6 2.4 -2.4 6 -2.4 -6 -6 -2.4 6 -2.4 Z"
        fill="var(--brand-blue)"
        opacity="0.7"
      />
      <circle cx="176" cy="120" r="3" fill="var(--brand-purple)" />
    </svg>
  );
}

const UNLOCKS: { icon: LucideIcon; title: string; body: string; tint: string }[] = [
  {
    icon: Target,
    title: "Scored to 99",
    body: "Every listing matched to your resume",
    tint: "bg-primary/10 text-primary",
  },
  {
    icon: Sparkles,
    title: "Tailor in one click",
    body: "AI weaves in the missing keywords",
    tint: "bg-ai-text/10 text-ai-text",
  },
  {
    icon: Mic,
    title: "Prep from the posting",
    body: "Likely questions, built for the role",
    tint: "bg-progress-done/10 text-progress-done",
  },
];

/**
 * New-user Job Search dashboard: shown when the account has no resume yet (job
 * matches are scored against the resume, so there's nothing to score until one
 * exists). An illustrated hero, benefit chips, a "create a resume" CTA, and a
 * what-it-unlocks grid. Routes into the existing creation flow - no change.
 */
export function JobsEmptyState() {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <p className="eyebrow">Job search · matched to your resume</p>

      <div className="mt-6">
        <JobsArt />
      </div>

      <h1 className="mt-7 max-w-md font-heading text-2xl font-extrabold leading-snug tracking-tight text-foreground sm:text-3xl">
        See jobs matched to you
      </h1>
      <p className="mx-auto mt-2.5 max-w-md text-sm leading-relaxed text-muted-foreground">
        Every listing is scored against your resume - up to 99. Create a resume to
        unlock your match scores and tailor to any posting.
      </p>

      {/* benefit chips */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
        {["Scored up to 99", "Filtered to your role", "Save and track"].map((b) => (
          <span
            key={b}
            className="inline-flex items-center gap-1.5 rounded-full bg-progress-done/10 px-3 py-1.5 text-xs font-semibold text-progress-done"
          >
            <Check className="size-3" strokeWidth={3} aria-hidden />
            {b}
          </span>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-7">
        <Link
          href="/resume-creation-menu"
          className="inline-flex h-11 items-center gap-2 rounded-[6px] bg-(--brand-blue) px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          <FileText className="size-4" aria-hidden />
          Create a resume
        </Link>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        About 15 minutes · then every job is scored for you
      </p>

      {/* what your resume unlocks - spans the full dashboard width (max-w-6xl
          from the page wrapper), matching the main dashboard's full-width cards
          beneath its centered hero. */}
      <div className="mt-9 w-full text-left">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          What a resume unlocks here
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {UNLOCKS.map((u) => {
            const Icon = u.icon;
            return (
              <div
                key={u.title}
                className="flex items-start gap-3 rounded-2xl bg-card p-4 shadow-card ring-1 ring-border"
              >
                <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", u.tint)}>
                  <Icon className="size-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{u.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{u.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
