import { TopNav } from "@/components/dashboard/top-nav";
import { SiteFooter } from "@/components/dashboard/site-footer";
import { HelpPill } from "@/components/layout/help-pill";
import { CoverLettersHero } from "@/components/cover-letter/cover-letters-hero";
import { DashboardCoverLetters } from "@/components/cover-letter/dashboard-cover-letters";

// Cover letters dashboard: a hero with today's progress, then the saved drafts.
export default function CoverLettersPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopNav active="Cover letters" />

      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
          <CoverLettersHero />
          <div className="mt-12">
            <DashboardCoverLetters />
          </div>
        </div>
      </main>

      <SiteFooter />
      <HelpPill />
    </div>
  );
}
