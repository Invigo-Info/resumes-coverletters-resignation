"use client";

import { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  Pencil,
  Smile,
  Shrink,
  WandSparkles,
  Loader2,
  ArrowUp,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/utilities/utils";

/** Strip HTML tags to plain text (used for word-count length checks). */
const strip = (html: string) => html.replace(/<[^>]*>/g, "").trim();

/** The shared AI rewrite presets (Improve · More human · Shorter). */
export const AI_PRESETS = [
  {
    key: "improve",
    label: "Improve",
    icon: Pencil,
    instruction:
      "Make it stronger, more impactful and action-driven, quantifying results where it reads naturally.",
  },
  {
    key: "human",
    label: "More human",
    icon: Smile,
    instruction:
      "Make it sound more natural and human, warmer and less robotic or buzzword-heavy, while staying professional.",
  },
  {
    key: "shorter",
    label: "Shorter",
    icon: Shrink,
    instruction:
      "Make it more concise: tighten the wording and cut filler while keeping the key impact.",
  },
] as const;

const SHORTER_PRESET = AI_PRESETS.find((p) => p.key === "shorter");

/**
 * Only "Shorter" may condense several bullets into fewer; Improve, More human,
 * and any "Ask AI to..." request keep one rewritten bullet per input bullet.
 */
export function allowsBulletMerge(instruction: string): boolean {
  return !!SHORTER_PRESET && instruction === SHORTER_PRESET.instruction;
}

/** How full a writing area is: too little, getting there, or right. */
export type Status = { label: string; tone: "bad" | "warn" | "good" };

/**
 * Bullet-count feedback for a responsibilities editor. Recruiters skim: one
 * bullet says nothing, four or more tells a story.
 *   1 bullet  -> "Add more"            (red)
 *   2-3       -> "Keep going"          (amber)
 *   4-6       -> "Good length"         (green)
 *   7+        -> "Consider shortening" (amber)  recruiters skim; too many dilutes
 * Zero bullets shows nothing - the placeholder is already doing that job.
 */
export function bulletStatus(count: number): Status | null {
  if (count <= 0) return null;
  if (count === 1) return { label: "Add more", tone: "bad" };
  if (count <= 3) return { label: "Keep going", tone: "warn" };
  if (count <= 6) return { label: "Good length", tone: "good" };
  return { label: "Consider shortening", tone: "warn" };
}

/**
 * Word-count feedback for the professional summary, which the brief asks to be
 * 2-4 sentences. Roughly one sentence is 15-20 words, so:
 *   < 20    -> "Add more"    (red)    barely one sentence
 *   20-44   -> "Keep going"  (amber)  one to two sentences
 *   45-140  -> "Good length" (green)  the 2-4 sentence target
 *   > 140   -> "Too long"    (amber)  recruiters stop reading
 * Zero words shows nothing - the placeholder already prompts the user.
 */
export function summaryStatus(html: string): Status | null {
  const words = strip(html).split(/\s+/).filter(Boolean).length;
  if (words === 0) return null;
  if (words < 20) return { label: "Add more", tone: "bad" };
  if (words < 45) return { label: "Keep going", tone: "warn" };
  if (words <= 140) return { label: "Good length", tone: "good" };
  return { label: "Too long", tone: "warn" };
}

// Text shades are the darkened -700 steps, so each label clears 4.5:1 on the
// card: #B91C1C 6.47:1, #B45309 5.02:1, #15803D 5.02:1. The dots are graphics
// (3:1) and use the brighter -600 steps.
const TONE_DOT: Record<Status["tone"], string> = {
  bad: "bg-[#DC2626]",
  warn: "bg-[#D97706]",
  good: "bg-[#16A34A]",
};
const TONE_TEXT: Record<Status["tone"], string> = {
  bad: "text-[#B91C1C]",
  warn: "text-[#B45309]",
  good: "text-[#15803D]",
};

/**
 * Coloured square + label describing how much has been written. The colour is
 * never the only signal - the label says the same thing in words.
 */
export function StatusBadge({ status }: { status: Status | null }) {
  if (!status) return null;
  return (
    <span
      className={cn(
        "hidden items-center gap-1.5 text-xs font-medium sm:inline-flex",
        TONE_TEXT[status.tone]
      )}
    >
      <span className={cn("size-2.5 rounded-[3px]", TONE_DOT[status.tone])} />
      {status.label}
    </span>
  );
}

/** The status badge driven by how many bullets exist. */
export function BulletStatusBadge({ count }: { count: number }) {
  return <StatusBadge status={bulletStatus(count)} />;
}

/** The status badge driven by the summary's word count. */
export function SummaryStatusBadge({ html }: { html: string }) {
  return <StatusBadge status={summaryStatus(html)} />;
}

/**
 * Dropdown of AI actions (Improve · More human · Shorter · Ask AI to…).
 * Used as the toolbar "Edit with AI" button and the preview "Rewrite" button,
 * across Employment history and Professional summary.
 */
export function EditWithAiMenu({
  busy,
  disabled = false,
  onRun,
  label = "Edit with AI",
  busyLabel = "Editing…",
  idleIcon: IdleIcon = WandSparkles,
  // Label uses --ai-text, not --ai-from: on the 5% tint the latter is only
  // 3.99:1, below the 4.5:1 this 12px text needs.
  triggerClassName = "inline-flex items-center gap-1.5 rounded-full border border-[var(--ai-from)]/30 bg-[var(--ai-from)]/5 px-3 py-1.5 text-xs font-semibold text-[var(--ai-text)] transition-colors hover:bg-[var(--ai-from)]/10 disabled:opacity-50",
  openUp = false,
}: {
  /** This button's own action is running - shows the spinner + busyLabel. */
  busy: boolean;
  /** Another AI action is running - disable the trigger without spinning it, so
   *  only the active button shows a loading state (never two at once). */
  disabled?: boolean;
  onRun: (instruction: string) => void;
  label?: string;
  busyLabel?: string;
  idleIcon?: LucideIcon;
  triggerClassName?: string;
  openUp?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [asking, setAsking] = useState(false);
  const [ask, setAsk] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  // Close the dropdown (and any "Ask AI" input) when clicking outside it.
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setAsking(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // Close the menu and fire the chosen instruction up to the parent.
  function run(instruction: string) {
    setOpen(false);
    setAsking(false);
    setAsk("");
    onRun(instruction);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={busy || disabled}
        onClick={() => setOpen((o) => !o)}
        className={triggerClassName}
      >
        {busy ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <IdleIcon className="size-3.5" />
        )}
        {busy ? busyLabel : label}
      </button>

      {open && (
        <div
          className={cn(
            "absolute right-0 z-30 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-card-lg",
            asking ? "w-[28rem] max-w-[calc(100vw-2rem)]" : "w-52",
            openUp ? "bottom-full mb-1.5" : "top-full mt-1.5"
          )}
        >
          {!asking ? (
            <>
              {AI_PRESETS.map((it) => {
                const Icon = it.icon;
                return (
                  <button
                    key={it.key}
                    type="button"
                    onClick={() => run(it.instruction)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
                  >
                    <Icon className="size-4 text-[var(--ai-from)]" />
                    {it.label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setAsking(true)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
              >
                <Sparkles className="size-4 text-[var(--ai-from)]" />
                Ask AI to…
              </button>
            </>
          ) : (
            <div className="p-1.5">
              <div className="flex items-center gap-2 rounded-xl border border-[var(--ai-from)]/40 bg-card py-1.5 pl-3 pr-1.5 transition-colors focus-within:border-[var(--ai-from)]">
                <input
                  autoFocus
                  value={ask}
                  onChange={(e) => setAsk(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && ask.trim()) run(ask.trim());
                    if (e.key === "Escape") setAsking(false);
                  }}
                  placeholder="Write your request..."
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                <button
                  type="button"
                  disabled={!ask.trim()}
                  onClick={() => ask.trim() && run(ask.trim())}
                  aria-label="Send request"
                  className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--ai-from)] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  <ArrowUp className="size-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
