"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** Centered step heading + optional subtext. */
export function StepHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-8 text-center">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h1>
      {subtitle && <p className="mt-3 text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

/** Multi-select chips with a max limit. `hot` = number of leading chips with 🔥. */
export function ChipMultiSelect({
  options,
  selected,
  onToggle,
  max = 3,
  hot = 0,
}: {
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  max?: number;
  hot?: number;
}) {
  const full = selected.length >= max;
  return (
    <div className="flex flex-wrap justify-center gap-2.5">
      {options.map((opt, i) => {
        const isSel = selected.includes(opt);
        const disabled = !isSel && full;
        return (
          <button
            key={opt}
            type="button"
            disabled={disabled}
            onClick={() => onToggle(opt)}
            className={cn(
              "relative inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all",
              isSel
                ? "bg-card text-foreground ring-2 ring-primary"
                : "bg-muted text-foreground hover:bg-muted/70",
              disabled && "cursor-not-allowed opacity-40 hover:bg-muted"
            )}
          >
            {i < hot && <span aria-hidden>🔥</span>}
            {opt}
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

/** Single value: free-text input + suggestion chips that fill the input. */
export function ChipSingleSelectInput({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
}) {
  return (
    <div className="space-y-5">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-xl border border-border bg-card px-4 text-center text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-3 focus:ring-ring/30"
      />
      <div className="flex flex-wrap justify-center gap-2.5">
        {options.map((opt) => {
          const isSel = value.trim().toLowerCase() === opt.toLowerCase();
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-all",
                isSel
                  ? "bg-card text-foreground ring-2 ring-primary"
                  : "bg-muted text-foreground hover:bg-muted/70"
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Labeled text input used by the wizard forms. */
export function CLField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
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

/** Radio-style option card (education level). */
export function OptionRadioCard({
  icon,
  label,
  selected,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl bg-card px-5 py-4 text-left shadow-card ring-1 transition-all",
        selected ? "ring-2 ring-primary" : "ring-border hover:ring-primary/40"
      )}
    >
      <span className="grid size-8 place-items-center rounded-lg bg-muted text-foreground">
        {icon}
      </span>
      <span className="flex-1 font-semibold text-foreground">{label}</span>
      <span
        className={cn(
          "grid size-5 place-items-center rounded-full border-2",
          selected ? "border-primary bg-primary" : "border-border"
        )}
      >
        {selected && <Check className="size-3 text-white" />}
      </span>
    </button>
  );
}
