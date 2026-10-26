import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { InterviewPrepView } from "@/features/interview-prep/components/interview-prep";

// Dedicated Other page: asks for a custom instruction, then generates and streams
// a bespoke prep sheet for the active apply job around that instruction.
export default function OtherInterviewPage() {
  return (
    <DashboardShell>
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <InterviewPrepView lockedType="other" streamQuestions />
      </div>
    </DashboardShell>
  );
}
