import { TopNav } from "@/components/dashboard/top-nav";
import { DashboardResumes } from "@/components/dashboard/dashboard-resumes";
import { SiteFooter } from "@/components/dashboard/site-footer";
import { HelpPill } from "@/components/layout/help-pill";

// Home landing page (after login): the Resumes dashboard. Rendered at "/" so the
// post-login URL stays at the site root instead of bouncing to "/dashboard".
export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopNav active="Resumes" />

      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
          <DashboardResumes />
        </div>
      </main>

      <SiteFooter />
      <HelpPill />
    </div>
  );
}
