import { NextResponse } from "next/server";
import { auth } from "@/features/authentication/auth";
import { getStripe } from "@/services/payments/server";

/**
 * POST /api/billing/portal - open Stripe's Customer Portal for this account.
 *
 * Why the portal rather than a hand-rolled cancel button: the product sells a
 * $1.95 trial that becomes $29.95/month on day 7. A plan of that shape carries
 * an obligation to make cancelling genuinely easy - the FTC's negative-option
 * rule and UK/EU consumer law both require it, and it is the single biggest
 * source of chargebacks when it is missing. Until now the ONLY way to stop
 * billing was to delete the account entirely, which is not a cancellation path,
 * it is an ultimatum.
 *
 * Stripe's portal is the recommended answer (see their Billing integration
 * guidance): it handles cancellation, payment-method updates, invoice history
 * and dunning, is PCI-handled, and stays correct as the subscription model
 * changes. What it configures is set in the Stripe dashboard, not here.
 */
export async function POST(req: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const stripe = getStripe();
  if (!stripe) {
    // No key configured (local/dev). Say so plainly rather than 500ing.
    return NextResponse.json({ error: "billing_unconfigured" }, { status: 503 });
  }

  const origin = req.headers.get("origin") ?? new URL(req.url).origin;

  try {
    // Resolve the Stripe customer from the signed-in email. We deliberately do
    // not trust a customer id from the client: it would let anyone open another
    // person's billing portal.
    const customers = await stripe.customers.list({ email, limit: 1 });
    const customer = customers.data[0];
    if (!customer) {
      // Signed in but never checked out - there is nothing to manage.
      return NextResponse.json({ error: "no_customer" }, { status: 404 });
    }

    const portal = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: `${origin}/account`,
    });

    return NextResponse.json({ url: portal.url });
  } catch (err) {
    console.error("[/api/billing/portal]", err);
    return NextResponse.json({ error: "portal_failed" }, { status: 500 });
  }
}
