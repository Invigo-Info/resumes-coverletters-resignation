"use client";

import { Check, Sparkles, PencilLine, Smile, Briefcase, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared "Improve with AI" menu actions (label + icon + the instruction sent to
 * the AI bridge). Used by both the Reason step and the Write-mode editor so the
 * dropdown is identical everywhere.
 */
export const IMPROVE_AI_ACTIONS: {
  label: string;
  icon: LucideIcon;
  instruction: string;
}[] = [
  {
    label: "Improve phrasing",
    icon: Sparkles,
    instruction: "Improve the phrasing and word choice while keeping the original meaning",
  },
  {
    label: "Improve grammar",
    icon: PencilLine,
    instruction: "Fix any spelling and grammar mistakes, keeping the original meaning",
  },
  {
    label: "More friendly",
    icon: Smile,
    instruction: "Rewrite this in a warmer, friendlier and more approachable tone",
  },
  {
    label: "More professional",
    icon: Briefcase,
    instruction: "Rewrite this in a more formal, professional tone",
  },
];

/** Left-aligned step heading + optional helper text (Step 2–8.png). */
export function StepHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-8">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h1>
      {subtitle && <p className="mt-3 max-w-lg text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

/** Labeled text/date input used by the builder forms. */
export function RLField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  error,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  error?: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        aria-invalid={!!error}
        className={cn(
          "h-12 w-full rounded-xl border bg-card px-4 text-sm text-foreground outline-none transition-colors focus:ring-3",
          error
            ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
            : "border-border focus:border-primary focus:ring-ring/30"
        )}
      />
      {error && <span className="mt-1.5 block text-xs font-medium text-red-500">{error}</span>}
    </label>
  );
}

/** Single-select chips (left-aligned), e.g. the Reason step (Step 5.png). */
export function ChipSingleSelect({
  options,
  value,
  onSelect,
}: {
  options: string[];
  value: string | null;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {options.map((opt) => {
        const isSel = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onSelect(opt)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-all",
              isSel ? "bg-card text-foreground ring-2 ring-primary" : "bg-muted text-foreground hover:bg-muted/70"
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

/** Multi-select chips with optional emoji + max limit, e.g. Gratitude (Step 6.png). */
export function ChipMultiSelect({
  options,
  selected,
  onToggle,
  max = 3,
}: {
  options: { label: string; emoji?: string }[];
  selected: string[];
  onToggle: (value: string) => void;
  max?: number;
}) {
  const full = selected.length >= max;
  return (
    <div className="flex flex-wrap gap-2.5">
      {options.map((opt) => {
        const isSel = selected.includes(opt.label);
        const disabled = !isSel && full;
        return (
          <button
            key={opt.label}
            type="button"
            disabled={disabled}
            onClick={() => onToggle(opt.label)}
            className={cn(
              "relative inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all",
              isSel ? "bg-card text-foreground ring-2 ring-primary" : "bg-muted text-foreground hover:bg-muted/70",
              disabled && "cursor-not-allowed opacity-40 hover:bg-muted"
            )}
          >
            {opt.emoji && <span aria-hidden>{opt.emoji}</span>}
            {opt.label}
            {isSel && (
              <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-primary text-white">
                <Check className="size-2.5" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Binary choice buttons (left-aligned), e.g. the Assistance step (Step 7.png). */
export function ChoiceButtons({
  options,
  value,
  onSelect,
}: {
  options: { label: string; emoji?: string; value: boolean }[];
  value: boolean | null;
  onSelect: (value: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {options.map((opt) => {
        const isSel = value === opt.value;
        return (
          <button
            key={opt.label}
            type="button"
            onClick={() => onSelect(opt.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all",
              isSel ? "bg-card text-foreground ring-2 ring-primary" : "bg-muted text-foreground hover:bg-muted/70"
            )}
          >
            {opt.emoji && <span aria-hidden>{opt.emoji}</span>}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
