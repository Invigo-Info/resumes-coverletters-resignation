import { TopNav } from "@/components/dashboard/top-nav";
import { SiteFooter } from "@/components/dashboard/site-footer";
import { HelpPill } from "@/components/layout/help-pill";
import { JobSearch } from "@/components/jobs/job-search";

// Jobs dashboard: resume-matched job recommendations + saved jobs.
export default function JobsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopNav active="Jobs" />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          <JobSearch />
        </div>
      </main>

      <SiteFooter />
      <HelpPill />
    </div>
  );
}
