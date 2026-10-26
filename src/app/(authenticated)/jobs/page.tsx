import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { JobSearch } from "@/features/jobs/components/job-search";

// Jobs dashboard: a search landing (v9 hero), then resume-matched results + saved jobs.
export default function JobsPage() {
  return (
    <DashboardShell>
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <JobSearch />
      </div>
    </DashboardShell>
  );
}
