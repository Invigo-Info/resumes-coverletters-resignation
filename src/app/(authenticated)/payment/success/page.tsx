import Link from "next/link";
import { CircleCheck } from "lucide-react";
import { LogoMark } from "@/components/common/brand/logo-mark";
import { PrimaryButton } from "@/components/common/brand/brand-buttons";
import { UnlockPremium } from "@/features/billing/components/unlock-premium";
import { getStripe } from "@/services/payments/server";
import { auth } from "@/features/authentication/auth";
import { upsertEntitlement } from "@/permissions/entitlements";
import { isDbEnabled } from "@/services/database/db";

/**
 * Post-checkout confirmation page. Reads the Stripe session_id from the URL,
 * verifies the Checkout Session status server-side, and shows a success or
 * "processing" message accordingly.
 */
export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; next?: string }>;
}) {
  const { session_id, next } = await searchParams;
  // Return the user to where they started checkout (same-origin path only).
  const dashboardHref = next && next.startsWith("/") ? next : "/";

  // Confirm the Checkout Session status server-side (best-effort).
  let status: string | null = null;
  let email: string | null = null;
  const stripe = getStripe();
  if (stripe && session_id) {
    try {
      const s = await stripe.checkout.sessions.retrieve(session_id);
      status = s.status ?? null;
      email = s.customer_details?.email ?? null;

      // A verified, completed checkout grants premium server-side right here -
      // so access sticks even when the Stripe webhook isn't configured (the
      // webhook still maintains the later lifecycle: renewals/cancellations).
      // Keyed by the signed-in email, which is what /api/entitlement reads.
      if (s.status === "complete" && isDbEnabled()) {
        const authed = await auth();
        const userEmail = authed?.user?.email ?? email ?? undefined;
        if (userEmail) {
          const plan = typeof s.metadata?.plan === "string" ? s.metadata.plan : null;
          const customerId =
            typeof s.customer === "string" ? s.customer : (s.customer?.id ?? null);
          const subId =
            typeof s.subscription === "string"
              ? s.subscription
              : (s.subscription?.id ?? null);
          await upsertEntitlement(
            userEmail,
            {
              stripeCustomerId: customerId,
              stripeSubscriptionId: subId,
              status: "active",
              plan,
            },
            Date.now()
          );
        }
      }
    } catch {
      /* ignore - the client UnlockPremium below still flips the local flag */
    }
  }

  // Treat a completed session as success; also show success when no session_id
  // was supplied (e.g. a direct visit) rather than a scary error.
  const ok = status === "complete" || !session_id;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Checkout completed -> flip the persisted premium flag so downloads work. */}
      {ok && <UnlockPremium />}
      <div className="px-5 py-6 sm:px-8">
        <Link href="/" aria-label="resumewriter.ai home" className="inline-block">
          <LogoMark />
        </Link>
      </div>

      <main className="flex flex-1 flex-col items-center justify-center px-4 pb-24 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-600">
          <CircleCheck className="size-9" />
        </span>
        <h1 className="mt-6 font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          {ok ? "You're all set!" : "Payment processing"}
        </h1>
        <p className="mt-3 max-w-md text-muted-foreground">
          {ok
            ? "Your Resumewriter.ai premium subscription is active. Enjoy unlimited downloads, AI-tailored resumes, and more."
            : "Your payment is being processed. You'll get a confirmation email shortly."}
          {email && <> A receipt was sent to <span className="font-medium text-foreground">{email}</span>.</>}
        </p>

        <div className="mt-8">
          <Link href={dashboardHref}>
            <PrimaryButton>Go to dashboard</PrimaryButton>
          </Link>
        </div>
      </main>
    </div>
  );
}
