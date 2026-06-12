import { TopNav } from "@/components/dashboard/top-nav";
import { SiteFooter } from "@/components/dashboard/site-footer";
import { HelpPill } from "@/components/layout/help-pill";
import { ResignationDashboardBody } from "@/components/resignation-letter/dashboard-body";
import { mockResignationLetters } from "@/lib/resignation-letter/mock-data";

export default async function ResignationLettersPage({
  searchParams,
}: {
  searchParams: Promise<{ filled?: string }>;
}) {
  const { filled } = await searchParams;
  // Default shows the saved cards; ?filled=0 previews the empty state.
  const docs = filled === "0" ? [] : mockResignationLetters;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopNav active="Resignation letters" />

      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
          <ResignationDashboardBody initialDocs={docs} />
        </div>
      </main>

      <SiteFooter />
      <HelpPill />
    </div>
  );
}
