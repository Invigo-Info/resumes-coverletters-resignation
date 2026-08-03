"use client";

import { useEffect, useState } from "react";
import { UploadCloud } from "lucide-react";
import { LivePreview } from "@/features/resume-builder/components/live-preview";

/** Skeleton line groups that mimic a resume's sections while it's parsed. */
const GROUPS: string[][] = [
  ["w-3/5", "w-2/5"],
  ["w-1/4", "w-3/5"],
  ["w-2/5", "w-full", "w-4/5"],
  ["w-2/5", "w-3/5", "w-full"],
  ["w-2/5", "w-3/5", "w-full", "w-4/5"],
];

export type UploadPhase = "uploading" | "filling";

/**
 * Full-screen loader shown while an uploaded resume is processed. The heading and
 * cloud mark stay constant across both phases (matching resume.co); only the card
 * below changes:
 * - "uploading"  - parsing the file; shows a skeleton of the resume being read.
 * - "filling"    - fields extracted; shows the real parsed resume preview while
 *                  the editor fields are populated.
 */
export function UploadingResume({ phase }: { phase: UploadPhase }) {
  const filling = phase === "filling";

  // Animated ellipsis after the title (".", "..", "..."), cycling while the
  // loader is on screen. The width is reserved so the centred heading doesn't
  // jitter as dots are added.
  const [dots, setDots] = useState(1);
  useEffect(() => {
    const t = setInterval(() => setDots((d) => (d % 3) + 1), 400);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Uploading resume"
      className="fixed inset-0 z-50 overflow-y-auto bg-background"
    >
      <div className="mx-auto flex min-h-full max-w-xl flex-col items-center px-6 py-16 text-center">
        {/* Cloud mark with a dashed ring + spinning arc (both phases) */}
        <div className="relative grid size-20 shrink-0 place-items-center">
          <span className="absolute inset-0 rounded-full border-2 border-dashed border-primary/30" />
          <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-primary" />
          <UploadCloud className="size-8 text-primary" />
        </div>

        <h1 className="mt-7 font-heading text-3xl font-extrabold tracking-tight text-foreground">
          Uploading resume
          <span aria-hidden className="inline-block w-[0.9em] text-left align-bottom">
            {".".repeat(dots)}
          </span>
        </h1>
        <p className="mt-3 max-w-md text-pretty text-muted-foreground">
          Please wait while our artificial intelligence processes the information
          from your resume and selects the right fields
        </p>

        {filling ? (
          // Real parsed resume preview, sized like a page.
          <div className="mt-10 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-card-lg ring-1 ring-border">
            <LivePreview previewOnly />
          </div>
        ) : (
          // Skeleton resume page while the file is still being read.
          <div className="mt-10 w-full max-w-md rounded-2xl bg-card px-8 py-10 text-left shadow-card-lg ring-1 ring-border">
            <div className="space-y-7">
              {GROUPS.map((bars, gi) => (
                <div key={gi} className="space-y-2.5">
                  {bars.map((w, bi) => (
                    <div
                      key={bi}
                      className={`h-2.5 animate-pulse rounded-full bg-muted ${w}`}
                      style={{ animationDelay: `${(gi * bars.length + bi) * 90}ms` }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
