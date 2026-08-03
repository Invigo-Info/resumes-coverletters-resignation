import { TopNav } from "@/components/dashboard/top-nav";
import { SiteFooter } from "@/components/dashboard/site-footer";
import { HelpPill } from "@/components/layout/help-pill";
import { InterviewPrepView } from "@/components/interview-prep/interview-prep";

// Dedicated Meeting with a manager page: skips the type picker, generates the
// manager-stage prep for the active apply job, and streams it into view.
export default function ManagerInterviewPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopNav active="Interview prep" />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
          <InterviewPrepView lockedType="manager" streamQuestions />
        </div>
      </main>

      <SiteFooter />
      <HelpPill />
    </div>
  );
}
