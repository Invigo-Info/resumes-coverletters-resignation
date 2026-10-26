import { auth } from "@/features/authentication/auth";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { DashboardResumes } from "@/features/dashboard/components/dashboard-resumes";
import { LandingPage } from "@/features/marketing/components/landing-page";

/**
 * Site root. Signed-out visitors get the public marketing landing (indexable,
 * good first impression); signed-in users get their resumes dashboard here (in
 * the v9 left-sidebar shell), so the post-login URL stays at the root.
 */
export default async function Home() {
  const session = await auth();
  if (!session?.user) {
    return <LandingPage />;
  }

  return (
    <DashboardShell>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <DashboardResumes />
      </div>
    </DashboardShell>
  );
}
