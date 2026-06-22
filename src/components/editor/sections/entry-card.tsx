"use client";

import { useState } from "react";
import { ChevronDown, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Collapsible card wrapping one repeatable entry (a job, school, etc.) with a
 * title/subtitle header, delete and expand/collapse controls. Open state can be
 * controlled (for accordion behaviour) or self-managed.
 */
export function EntryCard({
  title,
  subtitle,
  onDelete,
  defaultOpen = true,
  open: openProp,
  onToggle,
  onActivate,
  children,
}: {
  title: string;
  subtitle?: string;
  onDelete: () => void;
  defaultOpen?: boolean;
  /** Controlled open state (for accordion behaviour). Omit for self-managed. */
  open?: boolean;
  onToggle?: () => void;
  /** Fired when this entry is interacted with — used to highlight it in the
   *  preview. */
  onActivate?: () => void;
  children: React.ReactNode;
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  // Controlled if `open` prop is passed; otherwise track open state internally.
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;
  const toggle = () => {
    if (isControlled) onToggle?.();
    else setInternalOpen((v) => !v);
  };

  return (
    <div
      className="rounded-xl border border-border bg-card"
      onFocusCapture={onActivate}
      onPointerDownCapture={onActivate}
    >
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          onClick={toggle}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">
              {title || "Untitled"}
            </p>
            {subtitle && (
              <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </button>
        <button
          onClick={onDelete}
          aria-label="Delete entry"
          className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </button>
        <button
          onClick={toggle}
          aria-label={open ? "Collapse" : "Expand"}
          className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted"
        >
          <ChevronDown
            className={cn("size-4 transition-transform", open && "rotate-180")}
          />
        </button>
      </div>

      {open && <div className="border-t border-border p-4">{children}</div>}
    </div>
  );
}

/** Full-width "add another entry" button shown beneath a list of entry cards. */
export function AddMoreButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-xl bg-muted px-5 py-4 text-left font-semibold text-foreground transition-colors hover:bg-muted/70"
    >
      <span className="text-lg leading-none">+</span>
      {label}
    </button>
  );
}
