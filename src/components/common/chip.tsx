"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/utilities/utils";

/**
 * v9 selectable pill (search prefs, keyword picker, filters). Toggles via
 * `selected`; pass `onRemove` for the hover-× removable variant. Feature-
 * agnostic - wire it into any page that needs chips.
 */
interface ChipProps extends Omit<React.ComponentProps<"button">, "onClick"> {
  /** Filled/active state (blue-soft fill, blue text, blue border). */
  selected?: boolean;
  /** Toggle handler for the chip body. */
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  /** When provided, renders a trailing × that calls this (removable variant). */
  onRemove?: () => void;
}

function Chip({ className, selected, onRemove, children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      data-slot="chip"
      aria-pressed={selected}
      className={cn(
        "group/chip inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
        selected
          ? "border-primary bg-accent text-primary"
          : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-accent/50",
        className
      )}
      {...props}
    >
      {children}
      {onRemove && (
        <span
          aria-hidden
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="grid size-4 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
        >
          <X className="size-3" />
        </span>
      )}
    </button>
  );
}

export { Chip };
