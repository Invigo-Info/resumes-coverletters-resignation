import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { ResumeOnboarding } from "@/features/onboarding/components/resume-onboarding";

// Resume creation entry point: shows the onboarding flow inside the app sidebar
// shell. `embedded` drops the onboarding's own full-page chrome so it nests
// cleanly under the DashboardShell top bar + left nav.
export default function ResumeCreationMenuPage() {
  return (
    <DashboardShell>
      <ResumeOnboarding embedded />
    </DashboardShell>
  );
}
