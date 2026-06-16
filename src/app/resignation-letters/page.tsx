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
  // Home shows the empty "create one" state by default; ?filled=1 previews the
  // saved cards.
  const docs = filled === "1" ? mockResignationLetters : [];

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
