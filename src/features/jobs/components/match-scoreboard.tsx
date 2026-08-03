"use client";

import { useEffect, useState } from "react";
import { Check, X, ThumbsUp } from "lucide-react";
import { cn } from "@/utilities/utils";
import { ringColor, type KeywordMatch } from "@/features/jobs/lib/keyword-match";

/**
 * Circular progress ring around a match percentage. Sized via `size` (small on
 * job cards, large in the detail panel). Colors default to the semantic
 * green/amber triage on cards; the detail card passes the brand-green spec
 * (progress #116B3A on a #E4EEE8 track) plus a thumbs-up for a positive match.
 * The value is clamped to 0-100 so it accepts any dynamic score.
 */
export function ScoreRing({
  score,
  size = 72,
  strokeWidth,
  trackColor = "#E5E7EB",
  progressColor,
  numberClassName,
  thumb = false,
}: {
  score: number;
  size?: number;
  /** Stroke width in px (defaults scale with size). */
  strokeWidth?: number;
  /** Remaining-track color. */
  trackColor?: string;
  /** Progress-stroke color (defaults to the semantic ringColor). */
  progressColor?: string;
  /** Override for the centered number's color class. */
  numberClassName?: string;
  /** Show a thumbs-up near the bottom of the ring (positive match). */
  thumb?: boolean;
}) {
  const stroke = strokeWidth ?? (size >= 60 ? 5 : 4);
  const r = (size - stroke) / 2 - 1;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const offset = c * (1 - pct / 100);
  const fontClass =
    size >= 110 ? "text-4xl" : size >= 84 ? "text-2xl" : size >= 60 ? "text-xl" : "text-sm";
  const progress = progressColor ?? ringColor(score);

  // Position the thumb at the leading tip of the green arc so it reads as part
  // of the progress bar. The ring fills counterclockwise from 12 o'clock (green
  // descends on the left, gap on the upper-right - matching the reference), so
  // the tip mirrors on X. It sits just inside the stroke to stay legible on the
  // ring's white interior.
  const theta = (2 * Math.PI * pct) / 100;
  const thumbR = r - stroke * 1.1;
  const thumbSize = Math.round(size * 0.16);
  const thumbX = size / 2 - thumbR * Math.sin(theta);
  const thumbY = size / 2 - thumbR * Math.cos(theta);

  return (
    <span
      className="relative grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: "scaleX(-1) rotate(-90deg)" }}
      >
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={progress}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset,stroke] duration-700 ease-out"
        />
      </svg>
      <span
        className={cn(
          "absolute font-bold tabular-nums",
          numberClassName ?? "text-foreground",
          fontClass
        )}
      >
        {Math.round(pct)}
      </span>
      {thumb && (
        <ThumbsUp
          aria-hidden="true"
          className="absolute"
          style={{
            left: thumbX,
            top: thumbY,
            width: thumbSize,
            height: thumbSize,
            transform: "translate(-50%, -50%)",
            color: progress,
            fill: progress,
          }}
        />
      )}
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
      <div className="grid gap-5 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] sm:gap-6">
        {/* Left: the match score card - label, brand-green progress ring with a
            thumbs-up for a positive match, and the Improve-keywords CTA. */}
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-sm font-medium text-muted-foreground">{match.label}</p>
          <ScoreRing
            score={match.score}
            size={120}
            strokeWidth={7}
            trackColor="#E4EEE8"
            progressColor="#116B3A"
            numberClassName="text-[#17352A]"
            thumb={match.score >= 55}
          />
          <button
            type="button"
            onClick={onImprove}
            className="inline-flex items-center rounded-full bg-[#F6F6F6] px-5 py-2.5 text-sm font-semibold text-[#4B5563] transition-colors hover:bg-[#ECECEC]"
          >
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
