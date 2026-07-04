# Phase 4 - Match Scoreboard

An explainable resume-to-job match: a percentage, a short explanation, and a
checklist of covered / missing Position, Requirements, and Responsibilities
signals. Hybrid - Gemini when available, deterministic heuristic otherwise.

## Data - `src/lib/jobs/scoreboard.ts`

```ts
interface ScoreResume { role: string; skills: string[]; summary: string; experience: string; }
interface ScoreItem { label: string; matched: boolean; }
interface ScoreCategory { name: "Position" | "Requirements" | "Responsibilities"; items: ScoreItem[]; }
interface MatchScoreboard {
  score: number;        // 0-100
  label: string;        // from matchMeta(score)
  summary: string;      // short, specific explanation
  categories: ScoreCategory[];
  mainGaps: string[];   // labels of the most important missing items
}
```

Label scale (`matchMeta` in `job-search.ts`): 90-100 Perfect, 80-89 Strong,
75-79 Good, 50-74 Partial, <50 Low. `strong` (>= 80) drives green vs amber.

### AI task - `src/app/api/ai/route.ts` (`scoreJob`)
Input `{ resume: {role, skills, summary, experience}, job: {title, company, description} }`;
Gemini returns the `MatchScoreboard` JSON (JSON mode, weighted 30/35/25/10). Reuses the
route's existing 3-retry + `{ fallback: true }` pattern.

## Functionality

### Heuristic - `buildHeuristicScoreboard(job, resume)`
Deterministic fallback and ranking aid:
- Position items from title + seniority (+ position-like description lines).
- Requirements from the job's `qualifications` or requirement-like description lines.
- Responsibilities from the job's `responsibilities` or duty-like description lines.
- Each item is `matched` when its keywords overlap the resume haystack (role + skills + summary + experience) by >= 50%, or a named skill appears in the item.
- Score = Position 30% + Requirements 35% + Responsibilities 25% + skill bonus 10%, clamped 50-99.
- `summary` is templated from the label, top matched signals, and the first gap.

### Hybrid entry point - `getScoreboard(job, resume)`
Calls the AI (`callScoreAi` -> `/api/ai` `scoreJob`); on no-key / failure / malformed
response (`normalizeAi` validates and re-derives the label from the score) it returns
`buildHeuristicScoreboard`. Lazy-loaded per selected job (the brief's hybrid model).

### UI - `src/components/jobs/match-scoreboard.tsx`
- **Collapsed**: headline label ("Perfect match - tailor your resume to get noticed" at 90+), the short explanation, a circular SVG score **ring** (green >= 80, amber below) with an expand chevron, and the **Tailor resume to this job** CTA.
- **Expanded**: the ring stays; category cards appear (Position -> `User`, Requirements -> `ClipboardCheck`, Responsibilities -> `ListChecks`) with a divider and checklist rows - green `Check` (covered) or muted `X` (missing).
- **Loading**: spinner text in the summary + skeleton category cards until the analysis resolves; the ring shows the job's list score meanwhile.

### Fetch ownership - `src/components/jobs/job-detail.tsx`
The detail panel fetches the scoreboard in an effect keyed on the selected job, holds `loading`/`expanded` state, and passes `onTailor(job, scoreboard)` up so the Tailor CTA can seed the tailoring dialog with the description + missing gaps.

## Files
- `src/lib/jobs/scoreboard.ts` (new)
- `src/app/api/ai/route.ts` (`scoreJob` task)
- `src/components/jobs/match-scoreboard.tsx` (new)
- `src/components/jobs/job-detail.tsx` (fetch + expand)
