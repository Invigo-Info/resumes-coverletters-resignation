import { TopNav } from "@/components/dashboard/top-nav";
import { AccountSettings } from "@/components/account/account-settings";
import { SiteFooter } from "@/components/dashboard/site-footer";
import { HelpPill } from "@/components/layout/help-pill";

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
