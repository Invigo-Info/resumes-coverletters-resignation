"use client";

import Link from "next/link";
import {
  Sparkles,
  Upload,
  Check,
  Briefcase,
  Mic,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/utilities/utils";

/** Lightweight, on-brand illustration: a resume sheet with a live score ring -
 *  built from theme tokens (no hardcoded palette) so it follows the theme. */
function ResumeArt() {
  return (
    <svg
      viewBox="0 0 300 210"
      className="mx-auto h-auto w-[280px] max-w-full"
      role="img"
      aria-label="A resume with a match score"
    >
      {/* soft glow */}
      <circle cx="150" cy="112" r="92" fill="var(--brand-blue-soft)" opacity="0.6" />
      {/* sheet */}
      <rect
        x="86"
        y="30"
        width="128"
        height="160"
        rx="12"
        fill="var(--card)"
        stroke="var(--border)"
      />
      {/* header: avatar + name lines */}
      <circle cx="110" cy="58" r="10" fill="var(--brand-blue)" />
      <rect x="128" y="52" width="56" height="6" rx="3" fill="var(--foreground)" />
      <rect x="128" y="64" width="38" height="5" rx="2.5" fill="var(--input)" />
      {/* body lines */}
      {[86, 100, 114, 128, 142, 156].map((y, i) => (
        <rect
          key={y}
          x="104"
          y={y}
          width={i % 2 === 0 ? 92 : 72}
          height="5"
          rx="2.5"
          fill="var(--muted)"
        />
      ))}
      {/* floating score ring badge */}
      <g transform="translate(196 44)">
        <circle cx="0" cy="0" r="26" fill="var(--card)" />
        <circle cx="0" cy="0" r="21" fill="none" stroke="var(--muted)" strokeWidth="5" />
        <circle
          cx="0"
          cy="0"
          r="21"
          fill="none"
          stroke="var(--brand-blue)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray="132"
          strokeDashoffset="14"
          transform="rotate(-90)"
        />
        <text
          x="0"
          y="5"
          textAnchor="middle"
          fontSize="15"
          fontWeight="800"
          fill="var(--brand-blue)"
        >
          99
        </text>
      </g>
      {/* sparkle accents */}
      <path
        d="M64 96 l2.6 6.6 6.6 2.6 -6.6 2.6 -2.6 6.6 -2.6 -6.6 -6.6 -2.6 6.6 -2.6 Z"
        fill="var(--brand-blue)"
        opacity="0.75"
      />
      <path
        d="M234 150 l1.8 4.6 4.6 1.8 -4.6 1.8 -1.8 4.6 -1.8 -4.6 -4.6 -1.8 4.6 -1.8 Z"
        fill="var(--brand-purple)"
        opacity="0.7"
      />
    </svg>
  );
}

const UNLOCKS: { icon: LucideIcon; title: string; body: string; tint: string }[] = [
  {
    icon: Briefcase,
    title: "Match scores on jobs",
    body: "Every listing scored up to 99",
    tint: "bg-primary/10 text-primary",
  },
  {
    icon: Sparkles,
    title: "One-click AI tailoring",
    body: "Keywords woven in per posting",
    tint: "bg-ai-text/10 text-ai-text",
  },
  {
    icon: Mic,
    title: "Interview questions",
    body: "Built from your experience",
    tint: "bg-progress-done/10 text-progress-done",
  },
];

/**
 * The resumes dashboard shown to a brand-new user (no resumes yet). Matches the
 * v9 "Create your first resume" design: an illustrated hero, the value promise,
 * benefit chips, two entry paths, and a "what your resume unlocks" grid. Both
 * CTAs route into the existing creation flow - no workflow change.
 */
export function ResumesEmptyState({
  newResumeHref = "/resume-creation-menu",
}: {
  newResumeHref?: string;
}) {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <p className="eyebrow">Resumes · Step 1 of your job hunt</p>

      <div className="mt-6">
        <ResumeArt />
      </div>

      <h1 className="mt-7 max-w-md font-heading text-2xl font-extrabold leading-snug tracking-tight text-foreground sm:text-3xl">
        Create your first resume
      </h1>
      <p className="mx-auto mt-2.5 max-w-md text-sm leading-relaxed text-muted-foreground">
        AI writes with you and formats for ATS - about 15 minutes. It also unlocks
        match scores on every job.
      </p>

      {/* benefit chips */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
        {["ATS-friendly templates", "AI writing help", "Job match scores"].map(
          (b) => (
            <span
              key={b}
              className="inline-flex items-center gap-1.5 rounded-full bg-progress-done/10 px-3 py-1.5 text-xs font-semibold text-progress-done"
            >
              <Check className="size-3" strokeWidth={3} aria-hidden />
              {b}
            </span>
          )
        )}
      </div>

      {/* two entry paths */}
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Link
          href={newResumeHref}
          className="inline-flex h-11 items-center gap-2 rounded-[6px] bg-(--brand-blue) px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          <Sparkles className="size-4" aria-hidden />
          Build my resume
        </Link>
        <Link
          href={newResumeHref}
          className="inline-flex h-11 items-center gap-2 rounded-[6px] border-[1.5px] border-primary bg-card px-5 text-sm font-semibold text-primary transition-colors hover:bg-accent hover:text-primary-strong focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          <Upload className="size-4" aria-hidden />
          Upload existing
        </Link>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="size-3.5" aria-hidden />
        PDF and DOCX supported · your content stays private
      </p>

      {/* what your resume unlocks */}
      <div className="mt-9 w-full max-w-2xl text-left">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          What your resume unlocks
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {UNLOCKS.map((u) => {
            const Icon = u.icon;
            return (
              <div
                key={u.title}
                className="flex items-start gap-3 rounded-2xl bg-card p-4 shadow-card ring-1 ring-border"
              >
                <span
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-lg",
                    u.tint
                  )}
                >
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
