"use client";

import {
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Sparkles,
  User,
  ClipboardCheck,
  ListChecks,
  Loader2,
} from "lucide-react";
import { matchMeta } from "@/lib/jobs/job-search";
import type {
  MatchScoreboard,
  ScoreCategory,
} from "@/lib/jobs/scoreboard";

/** Circular progress ring around the match percentage. */
function ScoreRing({ score }: { score: number }) {
  const { strong } = matchMeta(score);
  const color = strong ? "#16A34A" : "#D97706";
  const r = 34;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.max(0, Math.min(100, score)) / 100);
  return (
    <span className="relative grid size-[76px] shrink-0 place-items-center">
      <svg width="76" height="76" viewBox="0 0 76 76" className="-rotate-90">
        <circle cx="38" cy="38" r={r} fill="none" stroke="#E5E7EB" strokeWidth="5" />
        <circle
          cx="38"
          cy="38"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute text-xl font-bold text-foreground">{score}</span>
    </span>
  );
}

/** Icon for each scoreboard category. */
function CategoryIcon({ name }: { name: ScoreCategory["name"] }) {
  const cls = "size-4 text-[#16A34A]";
  if (name === "Requirements") return <ClipboardCheck className={cls} />;
  if (name === "Responsibilities") return <ListChecks className={cls} />;
  return <User className={cls} />;
}

/** One category card with its checklist rows. */
function CategoryCard({ category }: { category: ScoreCategory }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <CategoryIcon name={category.name} />
        <h4 className="text-sm font-semibold text-foreground">{category.name}</h4>
      </div>
      <div className="mt-3 space-y-2.5 border-t border-border pt-3">
        {category.items.map((item, i) => (
          <div key={i} className="flex items-start justify-between gap-3">
            <span className="text-sm leading-snug text-muted-foreground">
              {item.label}
            </span>
            {item.matched ? (
              <Check className="mt-0.5 size-4 shrink-0 text-[#16A34A]" aria-label="Covered" />
            ) : (
              <X className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-label="Missing" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * The explainable match Scoreboard inside the job detail panel. Collapsed: label,
 * short explanation, score ring + chevron, and the Tailor CTA. Expanded (chevron):
 * the ring stays visible and the Position/Requirements/Responsibilities category
 * cards appear below with matched (check) / missing (X) rows.
 */
export function MatchScoreboard({
  scoreboard,
  loading,
  fallbackScore,
  expanded,
  onToggle,
  onTailor,
}: {
  scoreboard: MatchScoreboard | null;
  loading: boolean;
  /** Score to show in the ring before the full analysis resolves. */
  fallbackScore: number;
  expanded: boolean;
  onToggle: () => void;
  onTailor: () => void;
}) {
  const score = scoreboard?.score ?? fallbackScore;
  const label = scoreboard?.label ?? matchMeta(score).label;
  const headline =
    score >= 90
      ? "Perfect match - tailor your resume to get noticed"
      : `${label} - tailor your resume to stand out`;

  return (
    <div className="rounded-2xl bg-secondary/60 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-foreground">{headline}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {loading && !scoreboard ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-3.5 animate-spin" />
                Analysing how your resume matches this role…
              </span>
            ) : (
              scoreboard?.summary
            )}
          </p>
        </div>

        {/* Score ring + expand chevron */}
        <div className="flex shrink-0 flex-col items-center gap-1">
          <ScoreRing score={score} />
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse match details" : "Expand match details"}
            className="grid size-6 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:text-foreground"
          >
            {expanded ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={onTailor}
        className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-full bg-card px-4 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-background"
      >
        <Sparkles className="size-3.5 text-[var(--ai-from)]" />
        Tailor resume to this job
      </button>

      {/* Expanded checklist */}
      {expanded && (
        <div className="mt-4 space-y-3">
          {loading && !scoreboard ? (
            [0, 1].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-card" />
            ))
          ) : scoreboard && scoreboard.categories.length > 0 ? (
            scoreboard.categories.map((c) => (
              <CategoryCard key={c.name} category={c} />
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              Detailed breakdown is unavailable for this posting.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
