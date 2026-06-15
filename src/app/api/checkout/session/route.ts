import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/server";
import { getPlan } from "@/lib/stripe/plans";
import { auth } from "@/auth";

/**
 * Create a Checkout Session for the chosen plan and return its client secret.
 * Uses `ui_mode: 'embedded'` so Stripe's secure payment form embeds directly in
 * our checkout page (subscription mode handles the trial + recurring billing,
 * card + wallets like Google Pay / PayPal when enabled in the dashboard).
 */
export async function POST(req: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe isn't configured. Add STRIPE_SECRET_KEY to .env.local." },
      { status: 503 }
    );
  }

  let planId = "trial";
  try {
    const body = await req.json();
    if (body?.plan) planId = String(body.plan);
  } catch {
    /* default trial */
  }
  const plan = getPlan(planId);

  const session = await auth();
  const email = session?.user?.email ?? undefined;

  const origin = req.headers.get("origin") ?? new URL(req.url).origin;

  try {
    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      ui_mode: "embedded_page",
      customer_email: email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            product_data: { name: plan.stripe.productName },
            unit_amount: plan.stripe.unitAmount,
            recurring: { interval: plan.stripe.interval },
          },
        },
      ],
      subscription_data:
        plan.stripe.trialDays > 0 ? { trial_period_days: plan.stripe.trialDays } : undefined,
      return_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    });

    return NextResponse.json({ clientSecret: checkout.client_secret });
  } catch (err) {
    console.error("[/api/checkout/session]", err);
    const message = err instanceof Error ? err.message : "Could not start checkout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
