"use client";

import Link from "next/link";
import { Sparkles, Briefcase, Check, UserRound, Palette, FileCheck2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/utilities/utils";

/** Letter + envelope illustration, built from theme tokens (no hardcoded palette). */
function LetterArt() {
  return (
    <svg
      viewBox="0 0 180 132"
      className="mx-auto h-auto w-[250px] max-w-full"
      role="img"
      aria-label="A cover letter and envelope"
    >
      <rect x="46" y="6" width="88" height="112" rx="7" fill="var(--card)" stroke="var(--border)" strokeWidth="1.5" />
      <rect x="58" y="20" width="40" height="6" rx="3" fill="var(--foreground)" />
      <rect x="58" y="32" width="28" height="4.5" rx="2.25" fill="var(--input)" />
      <rect x="58" y="46" width="64" height="4.5" rx="2.25" fill="var(--muted)" />
      <rect x="58" y="55" width="58" height="4.5" rx="2.25" fill="var(--muted)" />
      <rect x="58" y="64" width="62" height="4.5" rx="2.25" fill="var(--muted)" />
      <rect x="58" y="73" width="44" height="4.5" rx="2.25" fill="var(--muted)" />
      <rect x="58" y="88" width="30" height="5" rx="2.5" fill="var(--brand-blue)" />
      <path
        d="M10 84h44a6 6 0 0 1 6 6v30a6 6 0 0 1-6 6H10a6 6 0 0 1-6-6V90a6 6 0 0 1 6-6Z"
        fill="var(--brand-blue-soft)"
        stroke="var(--brand-blue)"
        strokeWidth="1.5"
      />
      <path d="m5 88 27 20 27-20" stroke="var(--brand-blue)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="152" cy="26" r="3" fill="var(--brand-purple)" />
      <path d="M164 44l2.2 5 5 2.2-5 2.2-2.2 5-2.2-5-5-2.2 5-2.2 2.2-5Z" fill="var(--brand-blue)" />
      <circle cx="36" cy="52" r="2.5" fill="var(--success)" />
    </svg>
  );
}

const PERKS: { icon: LucideIcon; title: string; body: string; tint: string }[] = [
  {
    icon: UserRound,
    title: "Names the hiring manager",
    body: "Personal beats generic every time",
    tint: "bg-primary/10 text-primary",
  },
  {
    icon: Palette,
    title: "Matches your resume design",
    body: "One consistent, polished look",
    tint: "bg-ai-text/10 text-ai-text",
  },
  {
    icon: FileCheck2,
    title: "Attach from any job",
    body: "One click in the apply flow",
    tint: "bg-progress-done/10 text-progress-done",
  },
];

/**
 * New-user cover-letters dashboard: shown when the account has no letters yet.
 * Matches the v9 "Write your first cover letter" design - an illustrated hero,
 * the value promise, benefit chips, two entry paths, and a perks grid. Both CTAs
 * route into the existing flows - no workflow change.
 */
export function CoverLettersEmptyState() {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <p className="eyebrow">Cover letters · the perfect pair to your resume</p>

      <div className="mt-6">
        <LetterArt />
      </div>

      <h1 className="mt-7 max-w-md font-heading text-2xl font-extrabold leading-snug tracking-tight text-foreground sm:text-3xl">
        Write your first cover letter
      </h1>
      <p className="mx-auto mt-2.5 max-w-md text-sm leading-relaxed text-muted-foreground">
        AI drafts it section by section - greeting, opener, body, close -
        personalized to the company and hiring manager.
      </p>

      {/* benefit chips */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
        {["Written for each company", "Matches your resume design", "One clean ATS page"].map(
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

      {/* entry paths */}
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/cover-letter/new"
          className="inline-flex h-11 items-center gap-2 rounded-[6px] bg-(--brand-blue) px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          <Sparkles className="size-4" aria-hidden />
          Write my letter
        </Link>
        <Link
          href="/jobs"
          className="inline-flex h-11 items-center gap-2 rounded-[6px] border-[1.5px] border-primary bg-card px-5 text-sm font-semibold text-primary transition-colors hover:bg-accent hover:text-primary-strong focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          <Briefcase className="size-4" aria-hidden />
          Start from a job
        </Link>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Takes about 5 minutes · edit every word before sending
      </p>

      {/* why it's worth the 5 minutes */}
      <div className="mt-9 w-full max-w-2xl text-left">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Why it&apos;s worth the 5 minutes
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {PERKS.map((u) => {
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
