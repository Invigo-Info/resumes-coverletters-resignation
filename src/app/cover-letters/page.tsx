import Link from "next/link";
import { Plus, Sparkles, Heart } from "lucide-react";
import { TopNav } from "@/components/dashboard/top-nav";
import { SiteFooter } from "@/components/dashboard/site-footer";
import { HelpPill } from "@/components/layout/help-pill";
import { CoverLetterCard } from "@/components/cover-letter/cover-letter-card";
import { mockCoverLetters, coverLetterStats } from "@/lib/cover-letter/mock-data";

export default async function CoverLettersPage({
  searchParams,
}: {
  searchParams: Promise<{ filled?: string }>;
}) {
  const { filled } = await searchParams;
  // Default shows the saved card; ?filled=0 previews the empty state.
  const docs = filled === "0" ? [] : mockCoverLetters;
  const { written, applications, daysToOffer } = coverLetterStats;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopNav active="Cover letters" />

      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
          {/* Hero */}
          <div className="text-center">
            <h1 className="mx-auto max-w-xl font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Secure your dream job with AI-tailored cover letters
            </h1>
            <Link
              href="/cover-letter/new"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              <Sparkles className="size-4" />
              Write one more
            </Link>
          </div>

          {/* Stat cards */}
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-card p-5 shadow-card ring-1 ring-border">
              <div className="flex items-center justify-between">
                <span className="grid size-9 place-items-center rounded-full bg-[#FCE7F3] text-[#DB2777]">
                  <Heart className="size-4" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wide text-[#DB2777]">
                  Today
                </span>
              </div>
              <p className="mt-3 text-2xl font-extrabold text-[#DB2777]">
                {written.used}/{written.limit}
              </p>
              <p className="text-sm font-semibold text-foreground">Cover letters written</p>
              <p className="mt-1 text-xs text-muted-foreground">{written.note}</p>
            </div>

            <div className="rounded-2xl bg-card p-5 shadow-card ring-1 ring-border">
              <p className="text-2xl font-extrabold text-primary">{applications.value}</p>
              <p className="text-sm font-semibold text-foreground">Job applications</p>
              <p className="mt-1 text-xs text-muted-foreground">{applications.note}</p>
            </div>

            <div className="rounded-2xl bg-card p-5 shadow-card ring-1 ring-border">
              <p className="text-2xl font-extrabold text-primary">{daysToOffer.value}</p>
              <p className="text-sm font-semibold text-foreground">Days to get an offer</p>
              <p className="mt-1 text-xs text-muted-foreground">{daysToOffer.note}</p>
            </div>
          </div>

          {/* Saved cover letters */}
          {docs.length > 0 && (
            <div className="mt-8 space-y-6">
              {docs.map((doc) => (
                <CoverLetterCard key={doc.id} doc={doc} />
              ))}
            </div>
          )}

          {/* Create new */}
          <div className="mt-8 flex justify-center">
            <Link
              href="/cover-letter/new"
              className="inline-flex items-center gap-2 rounded-full bg-card px-5 py-2.5 text-sm font-semibold text-foreground shadow-card ring-1 ring-border transition-colors hover:bg-secondary"
            >
              <Plus className="size-4" />
              Create new cover letter
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
      <HelpPill />
    </div>
  );
}
