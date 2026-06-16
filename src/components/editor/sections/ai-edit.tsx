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
import { cn } from "@/lib/utils";

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
      "Make it sound more natural and human — warmer and less robotic or buzzword-heavy — while staying professional.",
  },
  {
    key: "shorter",
    label: "Shorter",
    icon: Shrink,
    instruction:
      "Make it more concise: tighten the wording and cut filler while keeping the key impact.",
  },
] as const;

/** Length feedback shown in the editor toolbar ("Good length"). */
export function lengthInfo(
  html: string
): { label: string; tone: "good" | "warn" } | null {
  const words = strip(html).split(/\s+/).filter(Boolean).length;
  if (words === 0) return null;
  if (words < 12) return { label: "Too short", tone: "warn" };
  if (words <= 140) return { label: "Good length", tone: "good" };
  return { label: "Too long", tone: "warn" };
}

/** The "Good length" dot + label badge. */
export function LengthBadge({ html }: { html: string }) {
  const info = lengthInfo(html);
  if (!info) return null;
  return (
    <span className="hidden items-center gap-1.5 text-xs font-medium text-muted-foreground sm:inline-flex">
      <span
        className={cn(
          "size-2 rounded-full",
          info.tone === "good" ? "bg-emerald-500" : "bg-amber-500"
        )}
      />
      {info.label}
    </span>
  );
}

/**
 * Dropdown of AI actions (Improve · More human · Shorter · Ask AI to…).
 * Used as the toolbar "Edit with AI" button and the preview "Rewrite" button,
 * across Employment history and Professional summary.
 */
export function EditWithAiMenu({
  busy,
  onRun,
  label = "Edit with AI",
  busyLabel = "Editing…",
  idleIcon: IdleIcon = WandSparkles,
  triggerClassName = "inline-flex items-center gap-1.5 rounded-full border border-[var(--ai-from)]/30 bg-[var(--ai-from)]/5 px-3 py-1.5 text-xs font-semibold text-[var(--ai-from)] transition-colors hover:bg-[var(--ai-from)]/10 disabled:opacity-50",
  openUp = false,
}: {
  busy: boolean;
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
        disabled={busy}
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
