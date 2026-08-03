import Link from "next/link";
import type { ComponentType } from "react";
import {
  Sparkles,
  FileText,
  Briefcase,
  Target,
  Download,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { LogoMark } from "@/components/brand/logo-mark";
import { SiteFooter } from "@/features/dashboard/components/site-footer";

/** Primary call-to-action link, sized for marketing (larger than app buttons). */
function CtaPrimary({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {children}
    </Link>
  );
}

/** Secondary, neutral call-to-action (outline, never a colored fill). */
function CtaSecondary({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-background px-6 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {children}
    </Link>
  );
}

const FEATURES: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  body: string;
}[] = [
  {
    icon: Sparkles,
    title: "AI writing help",
    body: "Draft summaries, achievement bullets, and skills grounded in your real experience - never invented.",
  },
  {
    icon: FileText,
    title: "Resumes and letters",
    body: "Build resumes, cover letters, and resignation letters from one place, with polished templates.",
  },
  {
    icon: Briefcase,
    title: "Job matching",
    body: "See live roles that fit your profile, save the ones you like, and track them across devices.",
  },
  {
    icon: Target,
    title: "Tailor to a job",
    body: "Match your resume to a posting, surface the keywords that matter, and prep for the interview.",
  },
  {
    icon: Download,
    title: "Clean PDF export",
    body: "Download a pixel-accurate PDF that keeps its formatting wherever you send it.",
  },
  {
    icon: ShieldCheck,
    title: "ATS-friendly",
    body: "Structured, parseable layouts built to get through applicant tracking systems.",
  },
];

const STEPS: { n: string; title: string; body: string }[] = [
  {
    n: "1",
    title: "Start with your details",
    body: "Add your experience, or upload an existing resume and let AI extract it for you.",
  },
  {
    n: "2",
    title: "Polish with AI",
    body: "Sharpen each section with suggestions that stay true to what you have actually done.",
  },
  {
    n: "3",
    title: "Tailor and apply",
    body: "Match a resume to a job, download a clean PDF, and prepare for the interview.",
  },
];

/**
 * Public marketing landing for signed-out visitors (the app's home for signed-in
 * users is the resumes dashboard). Built entirely from semantic tokens so it
 * follows the theme in light and dark, uses lucide icons (no emoji), and stays
 * responsive from 320px up.
 */
export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" aria-label="resumewriter.ai home" className="inline-block">
          <LogoMark />
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Sign in
          </Link>
          <CtaPrimary href="/login">Get started</CtaPrimary>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto w-full max-w-5xl px-5 pt-12 pb-16 text-center sm:px-8 sm:pt-20 sm:pb-24">
          <p className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5" aria-hidden />
            AI-assisted, grounded in your real experience
          </p>
          <h1 className="mx-auto max-w-3xl font-heading text-4xl font-extrabold tracking-tight text-balance text-foreground sm:text-5xl md:text-6xl">
            Build a standout resume in minutes
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-pretty text-muted-foreground">
            Create resumes, cover letters, and resignation letters, tailor them
            to any job, and apply with confidence - all in one place.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <CtaPrimary href="/login">
              Get started free
              <ArrowRight className="size-4" aria-hidden />
            </CtaPrimary>
            <CtaSecondary href="/login">Sign in</CtaSecondary>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto w-full max-w-5xl px-5 pb-16 sm:px-8 sm:pb-24">
          <h2 className="text-center font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Everything you need to apply
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-2xl border border-border bg-card p-6 text-left"
              >
                <span className="mb-4 inline-grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="text-base font-semibold text-foreground">
                  {title}
                </h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto w-full max-w-5xl px-5 pb-16 sm:px-8 sm:pb-24">
          <h2 className="text-center font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            How it works
          </h2>
          <ol className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {STEPS.map(({ n, title, body }) => (
              <li key={n}>
                <span className="inline-grid size-9 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {n}
                </span>
                <h3 className="mt-4 text-base font-semibold text-foreground">
                  {title}
                </h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Final CTA */}
        <section className="mx-auto w-full max-w-5xl px-5 pb-20 sm:px-8">
          <div className="rounded-3xl border border-border bg-muted px-6 py-12 text-center sm:py-16">
            <h2 className="mx-auto max-w-2xl font-heading text-2xl font-bold tracking-tight text-balance text-foreground sm:text-3xl">
              Ready to build your next resume?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Start for free. No credit card required to create your first
              resume.
            </p>
            <div className="mt-8 flex justify-center">
              <CtaPrimary href="/login">
                Get started
                <ArrowRight className="size-4" aria-hidden />
              </CtaPrimary>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
