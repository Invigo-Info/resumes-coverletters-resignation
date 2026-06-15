import { LoginForm } from "@/components/auth/login-form";
import { SiteFooter } from "@/components/dashboard/site-footer";
import { HelpPill } from "@/components/layout/help-pill";

export default function LoginPage() {
  const googleEnabled = !!process.env.AUTH_GOOGLE_ID && !!process.env.AUTH_GOOGLE_SECRET;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <LoginForm googleEnabled={googleEnabled} />
      <SiteFooter />
      <HelpPill />
    </div>
  );
}
