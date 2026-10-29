import Link from "next/link";
import { CircleCheck } from "lucide-react";
import { LogoMark } from "@/components/common/brand/logo-mark";
import { PrimaryButton } from "@/components/common/brand/brand-buttons";
import { UnlockPremium } from "@/features/billing/components/unlock-premium";
import { getStripe } from "@/services/payments/server";
import { auth } from "@/features/authentication/auth";
import { upsertEntitlement } from "@/permissions/entitlements";
import { isDbEnabled } from "@/services/database/db";
import { safeInternalPath } from "@/validation/url";

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
  // Return the user to where they started checkout. Validated as a same-origin
  // path - `startsWith("/")` alone accepts `//evil.com`, which a browser reads
  // as protocol-relative and follows off-site.
  const dashboardHref = safeInternalPath(next) || "/";

  // Confirm the Checkout Session status server-side (best-effort).
  let email: string | null = null;
  // True only when this session belonged to the signed-in account AND was paid.
  let granted = false;
  const stripe = getStripe();
  if (stripe && session_id) {
    try {
      const s = await stripe.checkout.sessions.retrieve(session_id);
      email = s.customer_details?.email ?? null;

      // A verified, completed checkout grants premium server-side right here -
      // so access sticks even when the Stripe webhook isn't configured (the
      // webhook still maintains the later lifecycle: renewals/cancellations).
      //
      // The session must BELONG to the signed-in account. Taking the session id
      // on trust was a paywall bypass: session ids travel in the URL, so one
      // real payment could be replayed by any number of other signed-in users
      // simply by visiting this page with that id, and each would be granted
      // premium. The id now has to match the account that paid, and the grant
      // only happens when Stripe says the money actually arrived.
      const authed = await auth();
      const userEmail = authed?.user?.email?.toLowerCase() ?? null;
      const sessionEmail = (
        s.client_reference_id ||
        s.customer_details?.email ||
        s.customer_email ||
        ""
      ).toLowerCase();
      const ownsSession = Boolean(
        userEmail && sessionEmail && userEmail === sessionEmail
      );
      // `complete` can still be unpaid for delayed payment methods; a trial
      // that charges nothing today legitimately reports no_payment_required.
      const paid =
        s.payment_status === "paid" ||
        s.payment_status === "no_payment_required";

      granted = s.status === "complete" && ownsSession && paid;

      if (granted && isDbEnabled()) {
        const plan =
          typeof s.metadata?.plan === "string" ? s.metadata.plan : null;
        const customerId =
          typeof s.customer === "string"
            ? s.customer
            : (s.customer?.id ?? null);
        const subId =
          typeof s.subscription === "string"
            ? s.subscription
            : (s.subscription?.id ?? null);
        // Take the real status from the subscription rather than asserting
        // "active": a trialing subscription is `trialing`, and hardcoding
        // active here also discarded the renewal date entirely.
        let subStatus = "active";
        let periodEnd: number | null = null;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          subStatus = sub.status;
          const sec = (sub as unknown as { current_period_end?: number })
            .current_period_end;
          periodEnd = typeof sec === "number" ? sec * 1000 : null;
        }
        await upsertEntitlement(
          userEmail as string,
          {
            stripeCustomerId: customerId,
            stripeSubscriptionId: subId,
            status: subStatus,
            plan,
            currentPeriodEnd: periodEnd,
          },
          // This runs inside an async Server Component helper, not a React
          // render path; the purity rule cannot model that and flags the
          // clock read as impure rendering.
          // eslint-disable-next-line react-hooks/purity
          Date.now()
        );
      }
    } catch {
      /* ignore - the client UnlockPremium below still flips the local flag */
    }
  }

  // Treat a completed session as success; also show success when no session_id
  // was supplied (e.g. a direct visit) rather than a scary error. When an id IS
  // supplied it must be this account's, so someone else's session id cannot be
  // pasted in to produce a convincing "You're all set!" screen.
  const ok = granted || !session_id;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Checkout completed -> flip the persisted premium flag so downloads work. */}
      {ok && <UnlockPremium />}
      <div className="px-5 py-6 sm:px-8">
        <Link href="/" aria-label="resumewriter.ai home" className="inline-block">
          <LogoMark />
        </Link>
      </div>

      <main id="main-content" tabIndex={-1} className="flex flex-1 flex-col items-center justify-center px-4 pb-24 text-center">
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
