import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { UserDashboard } from "@/features/dashboard/components/user-dashboard";

// Unified account dashboard: a single overview of everything the user has stored
// (resumes, cover letters, resignation letters, saved jobs, interview prep),
// rendered inside the dashboard's left-sidebar app shell.
export default function DashboardPage() {
  return (
    <DashboardShell>
      <UserDashboard />
    </DashboardShell>
  );
}
