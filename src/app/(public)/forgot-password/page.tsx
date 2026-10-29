import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/features/authentication/components/forgot-password-form";
import { SiteFooter } from "@/features/dashboard/components/site-footer";

export const metadata: Metadata = {
  title: "Forgot your password",
  // Recovery pages have no business in search results.
  robots: { index: false, follow: false },
};

/** Request a password-reset link. Public: the user is locked out by definition. */
export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <ForgotPasswordForm />
      <SiteFooter />
    </div>
  );
}
