import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { ReopenSavedPrep } from "@/features/interview-prep/components/reopen-saved-prep";

// Re-open a saved interview-prep sheet by id, rendering its stored content.
export default async function SavedInterviewPrepDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <DashboardShell>
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <ReopenSavedPrep id={id} />
      </div>
    </DashboardShell>
  );
}
