import { TopNav } from "@/features/dashboard/components/top-nav";
import { SiteFooter } from "@/features/dashboard/components/site-footer";
import { HelpPill } from "@/components/layout/help-pill";
import { ReopenSavedPrep } from "@/components/interview-prep/reopen-saved-prep";

// Re-open a saved interview-prep sheet by id, rendering its stored content.
export default async function SavedInterviewPrepDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopNav active="Interview prep" />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
          <ReopenSavedPrep id={id} />
        </div>
      </main>

      <SiteFooter />
      <HelpPill />
    </div>
  );
}
