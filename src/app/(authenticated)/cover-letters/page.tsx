import { TopNav } from "@/features/dashboard/components/top-nav";
import { SiteFooter } from "@/features/dashboard/components/site-footer";
import { HelpPill } from "@/components/layout/help-pill";
import { DashboardCoverLetters } from "@/components/cover-letter/dashboard-cover-letters";

// Cover letters dashboard: the user's saved drafts (or an empty state).
export default function CoverLettersPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopNav active="Cover letters" />

      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
          <DashboardCoverLetters />
        </div>
      </main>

      <SiteFooter />
      <HelpPill />
    </div>
  );
}
