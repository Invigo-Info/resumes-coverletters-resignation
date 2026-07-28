import { TopNav } from "@/components/dashboard/top-nav";
import { SiteFooter } from "@/components/dashboard/site-footer";
import { HelpPill } from "@/components/layout/help-pill";
import { UserDashboard } from "@/components/dashboard/user-dashboard";

// Unified account dashboard: a single overview of everything the user has stored
// (resumes, cover letters, resignation letters, saved jobs, interview prep).
export default function DashboardPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopNav />

      <main className="flex-1">
        <UserDashboard />
      </main>

      <SiteFooter />
      <HelpPill />
    </div>
  );
}
