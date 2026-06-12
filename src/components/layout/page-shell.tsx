import { cn } from "@/lib/utils";

interface PageShellProps {
  children: React.ReactNode;
  /** Vertically + horizontally center the content (used by the onboarding screens). */
  center?: boolean;
  className?: string;
}

/** Full-height light-gray page background used by every screen. */
export function PageShell({ children, center, className }: PageShellProps) {
  return (
    <div
      className={cn(
        "min-h-screen w-full bg-background",
        center && "flex flex-col items-center justify-center px-4",
        className
      )}
    >
      {children}
    </div>
  );
}
