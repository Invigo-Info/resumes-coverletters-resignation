"use client";

import { X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/common/dropdown-menu";

/** The reasons a user can give when dismissing a job (from the screenshots). */
export const NOT_INTERESTED_REASONS = [
  "I'm not interested in this company",
  "I'm not interested in this job",
  "The requirements don't match my skillset",
  "It's irrelevant to my search",
  "The salary is too low",
  "Location doesn't match my needs",
  "I already applied",
  "None of the above",
] as const;

/**
 * The "Not interested" control: a dropdown of reasons. Picking one dismisses the
 * job (hidden from recommendations) and records the reason. Renders either an
 * icon-only button (job card) or a full labelled button (detail panel).
 */
export function NotInterestedMenu({
  onDismiss,
  variant = "button",
  ariaLabel = "Not interested",
}: {
  onDismiss: (reason: string) => void;
  variant?: "icon" | "button";
  ariaLabel?: string;
}) {
  // Wrapper stops the click from bubbling to the card's select handler.
  return (
    <span onClick={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={ariaLabel}
          className={
            variant === "icon"
              ? "grid size-8 place-items-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-secondary hover:text-foreground"
              : "inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-4 text-sm font-medium text-foreground outline-none transition-colors hover:bg-secondary"
          }
        >
          <X className="size-4" />
          {variant === "button" && "Not interested"}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Why not?</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {NOT_INTERESTED_REASONS.map((reason) => (
            <DropdownMenuItem
              key={reason}
              onClick={() => onDismiss(reason)}
              className="text-sm"
            >
              {reason}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </span>
  );
}
