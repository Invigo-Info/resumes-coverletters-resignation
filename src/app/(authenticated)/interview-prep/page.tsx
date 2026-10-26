import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { InterviewPrepView } from "@/features/interview-prep/components/interview-prep";
import { SavedPrepLink } from "@/features/interview-prep/components/saved-prep-link";

// Interview prep: pick an interview type for the active apply job, then show a
// generated, job-specific preparation sheet.
export default function InterviewPrepPage() {
  return (
    <DashboardShell>
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <SavedPrepLink />
        <InterviewPrepView />
      </div>
    </DashboardShell>
  );
}
