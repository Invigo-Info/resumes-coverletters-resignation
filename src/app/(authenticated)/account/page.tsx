import { TopNav } from "@/features/dashboard/components/top-nav";
import { AccountSettings } from "@/features/user-profile/components/account-settings";
import { SiteFooter } from "@/features/dashboard/components/site-footer";
import { HelpPill } from "@/components/layout/help-pill";

// Account settings page: profile/name editing and account deletion for the signed-in user.
export default function AccountPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopNav />
      <main className="flex-1">
        <AccountSettings />
      </main>
      <SiteFooter />
      <HelpPill />
    </div>
  );
}
