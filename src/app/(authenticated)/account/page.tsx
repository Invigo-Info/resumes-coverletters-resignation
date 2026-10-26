import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { AccountSettings } from "@/features/user-profile/components/account-settings";

// Account settings page: profile/name editing and account deletion for the signed-in user.
export default function AccountPage() {
  return (
    <DashboardShell>
      <AccountSettings />
    </DashboardShell>
  );
}
