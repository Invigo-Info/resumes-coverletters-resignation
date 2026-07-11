"use client";

import { cloneElement, useId, useRef, useState, type ReactNode } from "react";
import { Check, Pencil } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Labeled text input - the standard single-line form field used across sections. */
export function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
  error,
  hint,
  icon,
  onBlur,
  autoComplete,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  /** Marks the label and sets `required` on the input. */
  required?: boolean;
  /** Message to show under the field. Empty/undefined means valid. */
  error?: string;
  /** Advisory text under the field. Suppressed while an error is showing. */
  hint?: string;
  /** Leading icon rendered inside the input. */
  icon?: ReactNode;
  onBlur?: () => void;
  autoComplete?: string;
  inputMode?: React.ComponentProps<"input">["inputMode"];
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm text-muted-foreground">
        {label}
        {required && (
          <span className="ml-0.5 text-destructive" aria-hidden>
            *
          </span>
        )}
      </Label>
      <div className="relative">
        {icon && (
          <span
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:size-4"
            aria-hidden
          >
            {icon}
          </span>
        )}
        <Input
          id={id}
          type={type}
          value={value}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          inputMode={inputMode}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className={cn("h-12 rounded-xl bg-card", icon && "pl-10")}
        />
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : (
        hint && (
          <p id={hintId} className="text-sm text-muted-foreground">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

/**
 * Label + arbitrary control (for pickers / autocompletes).
 *
 * The control is cloned with a generated `id` so the label actually points at
 * it. Without this the label is decorative: screen readers announce the input
 * as unlabelled, and clicking the text does not focus the field.
 */
export function FieldWrap({
  label,
  children,
}: {
  label: string;
  children: React.ReactElement<{ id?: string }>;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm text-muted-foreground">
        {label}
      </Label>
      {cloneElement(children, { id })}
    </div>
  );
}

/** Page-level heading (title + subtext) shown at the top of each editor section. */
export function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground">
        {title}
      </h1>
      <p className="mt-2 text-muted-foreground">{description}</p>
    </div>
  );
}

/**
 * A SectionHeading whose title the user can rename via a pencil. Commits on
 * blur or Enter; Escape restores the value the edit started from. An empty
 * title falls back to `fallback` rather than leaving the section unnamed.
 */
export function EditableSectionHeading({
  title,
  fallback,
  onChange,
  description,
}: {
  title: string;
  fallback: string;
  onChange: (v: string) => void;
  description: string;
}) {
  const [editing, setEditing] = useState(false);
  const before = useRef(title);

  function start() {
    before.current = title;
    setEditing(true);
  }
  function commit() {
    if (!title.trim()) onChange(fallback);
    setEditing(false);
  }

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2">
        {editing ? (
          <Input
            autoFocus
            aria-label="Section title"
            value={title}
            onChange={(e) => onChange(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                onChange(before.current);
                setEditing(false);
              }
            }}
            className="h-11 w-full min-w-0 max-w-sm rounded-lg text-xl font-extrabold sm:text-2xl"
          />
        ) : (
          // min-w-0 + wrapping: as a flex item the heading would otherwise set a
          // min-content floor (its longest word) that no narrow screen can meet.
          <h1 className="min-w-0 break-words font-heading text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            {title.trim() || fallback}
          </h1>
        )}
        <button
          type="button"
          onClick={() => (editing ? commit() : start())}
          aria-label={editing ? "Save section title" : "Rename section"}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          {editing ? <Check className="size-4" /> : <Pencil className="size-4" />}
        </button>
      </div>
      <p className="mt-2 text-muted-foreground">{description}</p>
    </div>
  );
}
