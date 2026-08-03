import { auth } from "@/auth";
import { TopNav } from "@/components/dashboard/top-nav";
import { DashboardResumes } from "@/components/dashboard/dashboard-resumes";
import { SiteFooter } from "@/components/dashboard/site-footer";
import { HelpPill } from "@/components/layout/help-pill";
import { LandingPage } from "@/components/marketing/landing-page";

/**
 * Site root. Signed-out visitors get the public marketing landing (indexable,
 * good first impression); signed-in users get their resumes dashboard here, so
 * the post-login URL stays at the root instead of bouncing to "/dashboard".
 */
export default async function Home() {
  const session = await auth();
  if (!session?.user) {
    return <LandingPage />;
  }

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
