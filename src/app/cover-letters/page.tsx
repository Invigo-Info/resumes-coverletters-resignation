import { TopNav } from "@/components/dashboard/top-nav";
import { EmptyState } from "@/components/dashboard/empty-state";
import { SiteFooter } from "@/components/dashboard/site-footer";
import { HelpPill } from "@/components/layout/help-pill";

export default function CoverLettersPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopNav active="Cover letters" />

      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
          <EmptyState
            heading="If you don't have a cover letter yet, it's a great time to create one!"
            buttonLabel="Build my cover letter"
            href="/cover-letter/new"
          />
        </div>
      </main>

      <SiteFooter />
      <HelpPill />
    </div>
  );
}
