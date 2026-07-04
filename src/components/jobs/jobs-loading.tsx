"use client";

import { useEffect, useState } from "react";

/** Rotating reassurance copy shown while the matching engine runs. */
const LOADING_COPY = [
  "Scanning the market for the right fit",
  "Pairing your resume with top openings…",
];

/**
 * The re-matching loading state shown after applying filters or switching role.
 * Keeps the page header/chips in place (rendered by the parent) and shows an
 * indeterminate progress bar, rotating copy, and grey skeletons for the list +
 * detail panel - so the user understands the resume is actively being matched.
 */
export function JobsLoading() {
  const [copyIndex, setCopyIndex] = useState(0);

  // Cycle the copy every ~1.6s while loading.
  useEffect(() => {
    const t = setInterval(
      () => setCopyIndex((i) => (i + 1) % LOADING_COPY.length),
      1600
    );
    return () => clearInterval(t);
  }, []);

  return (
    <div>
      {/* Progress bar (grey track + animated blue fill) */}
      <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-secondary">
        <div className="h-full w-1/3 animate-[jobs-progress_1.4s_ease-in-out_infinite] rounded-full bg-primary" />
      </div>

      <p className="mt-3 text-sm text-muted-foreground">{LOADING_COPY[copyIndex]}</p>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
        {/* Skeleton job cards */}
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-border bg-card p-4"
            >
              <div className="flex gap-3">
                <div className="size-11 shrink-0 animate-pulse rounded-xl bg-secondary" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-secondary" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-secondary" />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="h-6 w-24 animate-pulse rounded-full bg-secondary" />
                <div className="h-6 w-16 animate-pulse rounded-lg bg-secondary" />
              </div>
            </div>
          ))}
        </div>

        {/* Skeleton detail panel */}
        <div className="hidden rounded-2xl border border-border bg-card p-5 lg:block">
          <div className="h-6 w-2/3 animate-pulse rounded bg-secondary" />
          <div className="mt-2 h-4 w-1/3 animate-pulse rounded bg-secondary" />
          <div className="mt-5 h-24 w-full animate-pulse rounded-xl bg-secondary" />
          <div className="mt-5 space-y-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-3 w-full animate-pulse rounded bg-secondary" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
