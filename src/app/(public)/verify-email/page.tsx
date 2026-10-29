import type { Metadata } from "next";
import { VerifyEmailView } from "@/features/authentication/components/verify-email-view";
import { SiteFooter } from "@/features/dashboard/components/site-footer";

export const metadata: Metadata = {
  title: "Confirm your email",
  // Must never be indexed: the URL carries a single-use verification token.
  robots: { index: false, follow: false },
};

/** Confirm an email address from the emailed link. */
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <VerifyEmailView token={token ?? ""} />
      <SiteFooter />
    </div>
  );
}
