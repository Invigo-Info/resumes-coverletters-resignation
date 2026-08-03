import { TopNav } from "@/features/dashboard/components/top-nav";
import { SiteFooter } from "@/features/dashboard/components/site-footer";
import { HelpPill } from "@/components/layout/help-pill";
import { InterviewPrepView } from "@/features/interview-prep/components/interview-prep";
import { SavedPrepLink } from "@/features/interview-prep/components/saved-prep-link";

// Interview prep: pick an interview type for the active apply job, then show a
// generated, job-specific preparation sheet.
export default function InterviewPrepPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopNav active="Interview prep" />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
          <SavedPrepLink />
          <InterviewPrepView />
        </div>
      </main>

      <SiteFooter />
      <HelpPill />
    </div>
  );
}
