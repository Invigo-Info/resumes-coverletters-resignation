import { LoginForm } from "@/features/authentication/components/login-form";
import { SiteFooter } from "@/features/dashboard/components/site-footer";
import { HelpPill } from "@/components/layout/help-pill";

// Login page: renders the email/password form, optionally with a Google button.
export default async function LoginPage({
  searchParams,
}: {
  // NextAuth redirects failed sign-ins back here with `?error=<code>`.
  searchParams: Promise<{ error?: string }>;
}) {
  // Only offer Google sign-in when both OAuth env credentials are configured.
  const googleEnabled = !!process.env.AUTH_GOOGLE_ID && !!process.env.AUTH_GOOGLE_SECRET;
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <LoginForm googleEnabled={googleEnabled} initialError={error} />
      <SiteFooter />
      <HelpPill />
    </div>
  );
}
