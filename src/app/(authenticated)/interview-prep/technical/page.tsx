import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { InterviewPrepView } from "@/features/interview-prep/components/interview-prep";

// Dedicated Technical interview page: skips the type picker, generates the
// technical prep for the active apply job, and streams the questions + short
// answers into view one at a time.
export default function TechnicalInterviewPage() {
  return (
    <DashboardShell>
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <InterviewPrepView lockedType="technical" streamQuestions />
      </div>
    </DashboardShell>
  );
}
