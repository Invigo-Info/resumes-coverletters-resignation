import { TopNav } from "@/features/dashboard/components/top-nav";
import { SiteFooter } from "@/features/dashboard/components/site-footer";
import { HelpPill } from "@/components/layout/help-pill";
import { SavedInterviewPrepList } from "@/features/interview-prep/components/saved-interview-prep-list";

// Saved interview-prep sheets: the account's stored prep, ready to reopen.
export default function SavedInterviewPrepPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopNav active="Interview prep" />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
          <SavedInterviewPrepList />
        </div>
      </main>

      <SiteFooter />
      <HelpPill />
    </div>
  );
}
