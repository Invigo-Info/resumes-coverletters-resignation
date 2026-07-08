"use client";

import { useEffect, useState } from "react";
import { Check, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { ringColor, type KeywordMatch } from "@/lib/jobs/keyword-match";

/**
 * Circular progress ring around a match percentage. Sized via `size` so it can
 * be small on job cards and large in the detail panel.
 */
export function ScoreRing({ score, size = 72 }: { score: number; size?: number }) {
  const stroke = size >= 60 ? 5 : 4;
  const r = (size - stroke) / 2 - 1;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const offset = c * (1 - pct / 100);
  const fontClass = size >= 84 ? "text-2xl" : size >= 60 ? "text-xl" : "text-sm";
  return (
    <span
      className="relative grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E5E7EB" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={ringColor(score)}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset,stroke] duration-700 ease-out"
        />
      </svg>
      <span className={cn("absolute font-bold text-foreground", fontClass)}>{score}</span>
    </span>
  );
}

/** One keyword chip: green with a check (covered) or grey with an X (missing). */
function KeywordChip({ label, matched }: { label: string; matched?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
        matched ? "bg-[#EAF7EE] text-[#166534]" : "bg-secondary text-muted-foreground"
      )}
    >
      {matched ? (
        <Check className="size-3.5 text-[#16A34A]" aria-hidden="true" />
      ) : (
        <X className="size-3.5 text-muted-foreground" aria-hidden="true" />
      )}
      {label}
    </span>
  );
}

/** The "+ N more" expander for a keyword group. */
function MoreButton({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center rounded-full px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      + {count} more
    </button>
  );
}

const PREVIEW = 5;

/**
 * The "Job keywords in your resume" match card inside the job detail panel.
 * Left: the score ring + label + Improve-keywords CTA. Right: the resume's
 * matched keywords (green check) followed by the missing keywords (grey X),
 * each group collapsed to a short preview with a "+ N more" expander.
 */
export function KeywordMatchCard({
  match,
  onImprove,
}: {
  match: KeywordMatch;
  onImprove: () => void;
}) {
  const [allMatched, setAllMatched] = useState(false);
  const [allMissing, setAllMissing] = useState(false);

  // Collapse both groups again whenever the selected job changes.
  useEffect(() => {
    setAllMatched(false);
    setAllMissing(false);
  }, [match]);

  const matchedShown = allMatched ? match.matched : match.matched.slice(0, PREVIEW);
  const missingShown = allMissing ? match.missing : match.missing.slice(0, PREVIEW);
  const moreMatched = match.matched.length - matchedShown.length;
  const moreMissing = match.missing.length - missingShown.length;
  const hasKeywords = match.matched.length > 0 || match.missing.length > 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="grid gap-5 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-6">
        {/* Left: ring + label + improve CTA */}
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-sm font-medium text-muted-foreground">{match.label}</p>
          <ScoreRing score={match.score} size={96} />
          <button
            type="button"
            onClick={onImprove}
            className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-foreground/20"
          >
            <Sparkles className="size-3.5 text-[var(--ai-from)]" />
            Improve keywords
          </button>
        </div>

        {/* Right: keyword chips */}
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">
            Job keywords in your resume
          </h3>
          {hasKeywords ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {matchedShown.map((k) => (
                <KeywordChip key={`m-${k}`} label={k} matched />
              ))}
              {moreMatched > 0 && (
                <MoreButton count={moreMatched} onClick={() => setAllMatched(true)} />
              )}
              {missingShown.map((k) => (
                <KeywordChip key={`x-${k}`} label={k} />
              ))}
              {moreMissing > 0 && (
                <MoreButton count={moreMissing} onClick={() => setAllMissing(true)} />
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Keyword analysis is unavailable for this posting.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
