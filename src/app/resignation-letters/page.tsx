import { TopNav } from "@/components/dashboard/top-nav";
import { SiteFooter } from "@/components/dashboard/site-footer";
import { HelpPill } from "@/components/layout/help-pill";
import { ResignationDashboardBody } from "@/components/resignation-letter/dashboard-body";

export default function ResignationLettersPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopNav active="Resignation letters" />

      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
          <ResignationDashboardBody />
        </div>
      </main>

      <SiteFooter />
      <HelpPill />
    </div>
  );
}
