import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { SavedInterviewPrepList } from "@/features/interview-prep/components/saved-interview-prep-list";

// Saved interview-prep sheets: the account's stored prep, ready to reopen.
export default function SavedInterviewPrepPage() {
  return (
    <DashboardShell>
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <SavedInterviewPrepList />
      </div>
    </DashboardShell>
  );
}
