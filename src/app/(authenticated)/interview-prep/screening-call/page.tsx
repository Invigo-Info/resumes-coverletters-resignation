import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { InterviewPrepView } from "@/features/interview-prep/components/interview-prep";

// Dedicated Screening call page: skips the type picker, generates the screening
// prep for the active apply job, and streams the sections + answers into view.
export default function ScreeningCallInterviewPage() {
  return (
    <DashboardShell>
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <InterviewPrepView lockedType="screening" streamQuestions />
      </div>
    </DashboardShell>
  );
}
