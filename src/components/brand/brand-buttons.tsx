"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap " +
  "transition-all outline-none select-none disabled:pointer-events-none disabled:opacity-50 " +
  "focus-visible:ring-3 focus-visible:ring-ring/40 [&_svg]:pointer-events-none [&_svg]:shrink-0";

/** Primary blue pill CTA — the strongest action (Download, Next, Create). */
export const PrimaryButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        base,
        "h-11 px-5 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:translate-y-px [&_svg]:size-4",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
);
PrimaryButton.displayName = "PrimaryButton";

/** Quiet gray pill — secondary actions (Back, Reorder, Share). */
export const GhostButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        base,
        "h-11 px-5 bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklab,var(--secondary),black_4%)] active:translate-y-px [&_svg]:size-4",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
);
GhostButton.displayName = "GhostButton";

/** Purple→fuchsia gradient pill with a sparkle — the "Write with AI" action. */
export const AiButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        base,
        "h-9 px-4 text-sm bg-gradient-ai text-white shadow-sm hover:opacity-90 active:translate-y-px [&_svg]:size-3.5",
        className
      )}
      {...props}
    >
      <Sparkles />
      {children}
    </button>
  )
);
AiButton.displayName = "AiButton";
