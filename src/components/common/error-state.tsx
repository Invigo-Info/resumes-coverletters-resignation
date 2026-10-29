import Link from "next/link";
import { LogoMark } from "@/components/common/brand/logo-mark";

/**
 * Shared presentation for every error / not-found screen.
 *
 * Deliberately dependency-light: it is used by `global-error.tsx`, which renders
 * its own <html>/<body> because the root layout has already failed by the time
 * it runs, and therefore cannot rely on providers, the session, or anything the
 * layout would normally set up. Plain Tailwind on design tokens only.
 */
export function ErrorState({
  code,
  title,
  message,
  incidentId,
  onRetry,
  homeHref = "/",
  homeLabel = "Back to my resumes",
}: {
  /** Short marker shown above the heading, e.g. "404". Omit for generic errors. */
  code?: string;
  title: string;
  message: string;
  /** Sentry event id or similar, shown so support can correlate a report. */
  incidentId?: string;
  /** When provided, renders a retry button (client error boundaries). */
  onRetry?: () => void;
  homeHref?: string;
  homeLabel?: string;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <div className="px-6 pt-6">
        <Link href="/" aria-label="resumewriter.ai home">
          <LogoMark />
        </Link>
      </div>

      <main id="main-content" tabIndex={-1} className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md text-center">
          {code && (
            <p className="mb-3 font-mono text-sm font-semibold tracking-widest text-muted-foreground">
              {code}
            </p>
          )}
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {title}
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-base text-muted-foreground">
            {message}
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex h-11 w-full items-center justify-center rounded-[6px] bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-strong focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40 sm:w-auto"
              >
                Try again
              </button>
            )}
            <Link
              href={homeHref}
              className="inline-flex h-11 w-full items-center justify-center rounded-[6px] px-6 text-sm font-semibold text-foreground ring-1 ring-border transition-colors hover:bg-secondary sm:w-auto"
            >
              {homeLabel}
            </Link>
          </div>

          {incidentId && (
            // The only detail we surface. Never the message, the stack, or a
            // file path: an error page is rendered to strangers, and internal
            // text there is an information leak, not a kindness.
            <p className="mt-8 text-xs text-muted-foreground">
              Reference:{" "}
              <code className="font-mono text-foreground">{incidentId}</code>
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
