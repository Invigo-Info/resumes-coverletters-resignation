import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { InterviewPrepView } from "@/features/interview-prep/components/interview-prep";

// Dedicated Meeting with a manager page: skips the type picker, generates the
// manager-stage prep for the active apply job, and streams it into view.
export default function ManagerInterviewPage() {
  return (
    <DashboardShell>
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <InterviewPrepView lockedType="manager" streamQuestions />
      </div>
    </DashboardShell>
  );
}
