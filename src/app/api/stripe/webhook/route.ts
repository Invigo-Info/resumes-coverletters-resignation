import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/services/payments/server";
import {
  upsertEntitlement,
  setEntitlementByCustomer,
} from "@/permissions/entitlements";
import { sendReceiptEmail } from "@/services/email/email";

// Stripe SDK + raw-body signature verification need the Node.js runtime.
export const runtime = "nodejs";

/** Read `current_period_end` (seconds) defensively across Stripe API versions. */
function periodEndMs(sub: Stripe.Subscription): number | null {
  const sec = (sub as unknown as { current_period_end?: number }).current_period_end;
  return typeof sec === "number" ? sec * 1000 : null;
}

function customerIdOf(
  ref: string | { id: string } | null | undefined
): string | null {
  if (!ref) return null;
  return typeof ref === "string" ? ref : ref.id;
}

/**
 * POST /api/stripe/webhook - the source of truth for entitlement.
 *
 * Verifies the Stripe signature, then maps subscription lifecycle events onto
 * the `subscriptions` table so premium is granted and revoked server-side
 * (checkout completed, subscription updated/deleted, payment failed). Configure
 * the endpoint in the Stripe dashboard and set STRIPE_WEBHOOK_SECRET.
 */
export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  // Raw body is required for signature verification - do not parse as JSON first.
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig, secret);
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  const now = Date.now();
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const email =
          s.client_reference_id ||
          s.customer_details?.email ||
          s.customer_email ||
          null;
        if (email) {
          const customerId = customerIdOf(s.customer);
          const subId =
            typeof s.subscription === "string"
              ? s.subscription
              : (s.subscription?.id ?? null);
          let status = "active";
          let end: number | null = null;
          if (subId) {
            const sub = await stripe.subscriptions.retrieve(subId);
            status = sub.status;
            end = periodEndMs(sub);
          }
          await upsertEntitlement(
            email,
            {
              stripeCustomerId: customerId,
              stripeSubscriptionId: subId,
              status,
              currentPeriodEnd: end,
            },
            now
          );
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = customerIdOf(sub.customer);
        const end = periodEndMs(sub);
        const email =
          (sub.metadata && sub.metadata.email) || null;
        // Prefer updating an existing row by customer id; if none exists yet,
        // resolve the email (from metadata, else the Stripe customer) and insert.
        const updated = customerId
          ? await setEntitlementByCustomer(customerId, sub.status, end, now)
          : 0;
        if (updated === 0) {
          let resolved = email;
          if (!resolved && customerId) {
            const cust = await stripe.customers.retrieve(customerId);
            resolved = "deleted" in cust ? null : (cust.email ?? null);
          }
          if (resolved) {
            await upsertEntitlement(
              resolved,
              {
                stripeCustomerId: customerId,
                stripeSubscriptionId: sub.id,
                status: sub.status,
                currentPeriodEnd: end,
              },
              now
            );
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = customerIdOf(sub.customer);
        if (customerId) {
          await setEntitlementByCustomer(customerId, "canceled", null, now);
        }
        break;
      }

      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        const customerId = customerIdOf(inv.customer);
        if (customerId) {
          await setEntitlementByCustomer(customerId, "past_due", null, now);
        }
        break;
      }

      case "invoice.payment_succeeded": {
        // Receipt only - entitlement is granted by the subscription events.
        // Wrapped locally so an email problem never fails the webhook (which
        // would make Stripe retry the whole event). Requires the
        // `invoice.payment_succeeded` event to be enabled on the endpoint.
        try {
          const inv = event.data.object as Stripe.Invoice;
          if (inv.amount_paid > 0) {
            let email = inv.customer_email ?? null;
            const customerId = customerIdOf(inv.customer);
            if (!email && customerId) {
              const cust = await stripe.customers.retrieve(customerId);
              email = "deleted" in cust ? null : (cust.email ?? null);
            }
            if (email) {
              await sendReceiptEmail(email, {
                amountPaid: inv.amount_paid,
                currency: inv.currency,
                invoiceNumber: inv.number ?? null,
                hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
              });
            }
          }
        } catch (err) {
          console.error("[stripe webhook] receipt email failed", err);
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    // Return 500 so Stripe retries (its webhooks are safe to retry).
    console.error("[stripe webhook]", err);
    return NextResponse.json({ error: "handler_error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
