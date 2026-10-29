import { NextResponse } from "next/server";
import { getStripe } from "@/services/payments/server";
import { getPlan } from "@/services/payments/plans";
import { auth } from "@/features/authentication/auth";
import { limit, clientIp } from "@/permissions/rate-limit";
import { safeInternalPath } from "@/validation/url";

/** Checkout sessions per identity per window. Generous for a human, not a script. */
const CHECKOUT_LIMIT = Number(process.env.CHECKOUT_RATE_LIMIT ?? 10);
const CHECKOUT_WINDOW_MS = 60_000;

/**
 * Create a Checkout Session for the chosen plan and return its client secret.
 * Uses `ui_mode: 'embedded'` so Stripe's secure payment form embeds directly in
 * our checkout page (subscription mode handles the trial + recurring billing,
 * card + wallets like Google Pay / PayPal when enabled in the dashboard).
 *
 * Sign-in is REQUIRED. The email is what ties the session, the subscription and
 * every later webhook event back to an account: without it the webhook receives
 * a payment it cannot attribute, so the customer is charged and never granted
 * anything. The checkout page already sits behind the route gate, so this only
 * closes the API path - it does not change the flow for any real user.
 */
export async function POST(req: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe isn't configured. Add STRIPE_SECRET_KEY to .env.local." },
      { status: 503 }
    );
  }

  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json(
      { error: "Please sign in before checking out." },
      { status: 401 }
    );
  }

  // Each session is a live object in the Stripe account, so an unmetered
  // endpoint lets anyone fill it with junk customers and sessions.
  const rl = await limit(
    `checkout:${email || clientIp(req)}`,
    CHECKOUT_LIMIT,
    CHECKOUT_WINDOW_MS
  );
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many checkout attempts. Please try again in a minute." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rl.resetMs / 1000)) },
      }
    );
  }

  let planId = "trial";
  // Where to send the user after checkout completes. Validated as a same-origin
  // path: `startsWith("/")` alone would wave through `//evil.com`, turning the
  // post-payment redirect into an open redirect. See `safeInternalPath`.
  let next = "";
  try {
    const body = await req.json();
    if (body?.plan) planId = String(body.plan);
    next = safeInternalPath(body?.next);
  } catch {
    /* default trial */
  }
  // Prices come from the server-side plan table, never from the request, so a
  // tampered body cannot buy premium for a chosen amount.
  const plan = getPlan(planId);

  const origin = req.headers.get("origin") ?? new URL(req.url).origin;
  const nextParam = next ? `&next=${encodeURIComponent(next)}` : "";

  try {
    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      ui_mode: "embedded_page",
      customer_email: email,
      // Link the session + subscription to the account so the webhook can map
      // lifecycle events (created/updated/canceled) back to this user's email.
      client_reference_id: email,
      metadata: { email, plan: plan.id },
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
        // A paid trial: the upfront charge is a ONE-TIME price alongside the
        // recurring one. Stripe bills one-time prices on the initial invoice
        // only, so this is taken today while the recurring price waits out
        // trial_period_days. Without it, trial_period_days alone gives a FREE
        // trial and the advertised trial price is never actually charged.
        ...(plan.stripe.upfrontAmount
          ? [
              {
                quantity: 1,
                price_data: {
                  currency: "usd",
                  product_data: {
                    name:
                      plan.stripe.upfrontProductName ??
                      `${plan.stripe.productName} trial`,
                  },
                  unit_amount: plan.stripe.upfrontAmount,
                },
              },
            ]
          : []),
      ],
      subscription_data: {
        ...(plan.stripe.trialDays > 0
          ? { trial_period_days: plan.stripe.trialDays }
          : {}),
        // Carried on subscription events so the webhook can resolve the email
        // even without a prior customer->email lookup.
        metadata: { email, plan: plan.id },
      },
      return_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}${nextParam}`,
    });

    return NextResponse.json({ clientSecret: checkout.client_secret });
  } catch (err) {
    console.error("[/api/checkout/session]", err);
    const message = err instanceof Error ? err.message : "Could not start checkout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
