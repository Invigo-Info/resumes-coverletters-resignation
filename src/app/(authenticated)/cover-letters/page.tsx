import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { DashboardCoverLetters } from "@/features/cover-letter/components/dashboard-cover-letters";

// Cover letters dashboard: the user's saved drafts (or an empty state).
export default function CoverLettersPage() {
  return (
    <DashboardShell>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <DashboardCoverLetters />
      </div>
    </DashboardShell>
  );
}
