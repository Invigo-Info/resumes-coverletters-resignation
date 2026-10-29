import Link from "next/link";
import { LogoMark } from "@/components/common/brand/logo-mark";

/**
 * Shared frame for the account-recovery screens (forgot password, reset
 * password, confirm email), matching the login page's layout and type scale so
 * the recovery flow does not look like a different product mid-way through.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main id="main-content" tabIndex={-1} className="flex flex-1 flex-col items-center px-4 pt-16 sm:pt-20">
      <Link href="/" aria-label="resumewriter.ai home">
        <LogoMark className="size-9" />
      </Link>

      <h1 className="mt-10 max-w-xl text-center font-heading text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-4 max-w-md text-center text-muted-foreground">
          {subtitle}
        </p>
      )}

      <div className="mt-8 w-full max-w-md">{children}</div>

      {footer && <div className="mt-8 text-sm text-muted-foreground">{footer}</div>}
    </main>
  );
}

/** The input styling used across the auth screens. */
export const authInputClass =
  "h-12 w-full rounded-[10px] border border-border bg-card px-4 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-3 focus:ring-ring/30";

/** The primary submit-button styling used across the auth screens. */
export const authButtonClass =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-[6px] bg-(--brand-blue) text-sm font-semibold text-primary-foreground shadow-sm transition-colors disabled:opacity-60";
