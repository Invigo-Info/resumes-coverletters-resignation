"use client";

import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface StartOptionCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick?: () => void;
  /** Render expandable content (used by the Upload card). */
  children?: React.ReactNode;
  expanded?: boolean;
}

/** One of the two large "How should we start?" option cards. */
export function StartOptionCard({
  icon,
  title,
  subtitle,
  onClick,
  children,
  expanded,
}: StartOptionCardProps) {
  return (
    <div className="overflow-hidden rounded-2xl bg-card shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-lg">
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-4 px-5 py-5 text-left outline-none"
      >
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary text-white">
          {icon}
        </span>
        <span className="flex-1">
          <span className="block text-lg font-bold text-foreground">{title}</span>
          <span className="block text-sm text-muted-foreground">{subtitle}</span>
        </span>
        <ChevronRight
          className={cn(
            "size-5 shrink-0 text-primary transition-transform",
            expanded && "rotate-90"
          )}
        />
      </button>
      {children}
    </div>
  );
}
