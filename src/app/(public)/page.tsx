import { auth } from "@/features/authentication/auth";
import { TopNav } from "@/features/dashboard/components/top-nav";
import { DashboardResumes } from "@/features/dashboard/components/dashboard-resumes";
import { SiteFooter } from "@/features/dashboard/components/site-footer";
import { HelpPill } from "@/components/layout/help-pill";
import { LandingPage } from "@/features/marketing/components/landing-page";

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
