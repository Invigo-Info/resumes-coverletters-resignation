import type { Metadata } from "next";
import { ResetPasswordForm } from "@/features/authentication/components/reset-password-form";
import { SiteFooter } from "@/features/dashboard/components/site-footer";

export const metadata: Metadata = {
  title: "Choose a new password",
  // Must never be indexed: the URL carries a single-use reset token.
  robots: { index: false, follow: false },
};

/** Set a new password using the token from the emailed link. */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <ResetPasswordForm token={token ?? ""} />
      <SiteFooter />
    </div>
  );
}
