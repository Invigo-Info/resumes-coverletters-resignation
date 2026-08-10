"use client";

import Link from "next/link";
import { House } from "lucide-react";
import { cn } from "@/utilities/utils";

/**
 * Blue rounded-square Home button (house icon) used at the top-left of every
 * builder inner page - resume, cover letter and resignation letter flows.
 * Returns the user to the dashboard home (now the site root "/").
 */
export function HomeButton({
  href = "/",
  className,
  iconClassName,
}: {
  href?: string;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <Link
      href={href}
      aria-label="Go to home"
      className={cn(
        "grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90",
        className
      )}
    >
      <House className={cn("size-5", iconClassName)} />
    </Link>
  );
}
