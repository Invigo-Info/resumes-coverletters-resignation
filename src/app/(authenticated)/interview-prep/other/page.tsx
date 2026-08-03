import { TopNav } from "@/features/dashboard/components/top-nav";
import { SiteFooter } from "@/features/dashboard/components/site-footer";
import { HelpPill } from "@/components/layout/help-pill";
import { InterviewPrepView } from "@/components/interview-prep/interview-prep";

// Dedicated Other page: asks for a custom instruction, then generates and streams
// a bespoke prep sheet for the active apply job around that instruction.
export default function OtherInterviewPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopNav active="Interview prep" />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
          <InterviewPrepView lockedType="other" streamQuestions />
        </div>
      </main>

      <SiteFooter />
      <HelpPill />
    </div>
  );
}
