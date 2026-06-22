import { LoginForm } from "@/components/auth/login-form";
import { SiteFooter } from "@/components/dashboard/site-footer";
import { HelpPill } from "@/components/layout/help-pill";

// Login page: renders the email/password form, optionally with a Google button.
export default function LoginPage() {
  // Only offer Google sign-in when both OAuth env credentials are configured.
  const googleEnabled = !!process.env.AUTH_GOOGLE_ID && !!process.env.AUTH_GOOGLE_SECRET;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <LoginForm googleEnabled={googleEnabled} />
      <SiteFooter />
      <HelpPill />
    </div>
  );
}
