import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/services/payments/server";
import {
  upsertEntitlement,
  setEntitlementByCustomer,
} from "@/permissions/entitlements";
import {
  claimEvent,
  releaseEvent,
  pruneProcessedEvents,
} from "@/services/payments/events";
import { isDbEnabled } from "@/services/database/db";
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
 * the `subscriptions` table so premium is granted and revoked server-side.
 * Configure the endpoint in the Stripe dashboard and set STRIPE_WEBHOOK_SECRET.
 *
 * Two delivery properties shape everything below, because Stripe guarantees
 * at-least-once delivery and no ordering:
 *
 *   - Every event is CLAIMED by id before it is handled, so a retry of an
 *     already-processed event is dropped rather than re-run. The claim is
 *     released if the handler fails, so a genuine retry still gets through -
 *     without that, a transient database error would permanently lose the
 *     entitlement a customer just paid for.
 *   - Every entitlement write carries the event's own `created` time, and the
 *     store refuses writes older than the state it already holds. Otherwise a
 *     delayed "subscription updated / active" event delivered after a
 *     cancellation would hand premium back to someone who stopped paying.
 */
export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  // Entitlement lives in Postgres only. Say so plainly instead of failing later
  // with a connection error that looks like a bug in the handler.
  if (!isDbEnabled()) {
    return NextResponse.json({ error: "no_database" }, { status: 503 });
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
  // The event's own creation time (seconds -> ms), used as the ordering key.
  const eventAt = event.created * 1000;

  // Exclusive claim. A duplicate delivery returns 200 immediately: it was
  // already handled, and reporting failure would only make Stripe retry it.
  let claimed: boolean;
  try {
    claimed = await claimEvent(event.id, event.type, now);
  } catch (err) {
    console.error("[stripe webhook] claim failed", err);
    return NextResponse.json({ error: "claim_failed" }, { status: 500 });
  }
  if (!claimed) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const email =
          s.client_reference_id ||
          s.customer_details?.email ||
          s.customer_email ||
          null;
        // `complete` can still mean unpaid for delayed payment methods, and
        // granting on those would give away access before the money arrives.
        // A trial is the exception: it reports `no_payment_required` when the
        // plan charges nothing today, which is a legitimate grant.
        const paid =
          s.payment_status === "paid" ||
          s.payment_status === "no_payment_required";
        if (email && paid) {
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
              plan:
                typeof s.metadata?.plan === "string" ? s.metadata.plan : null,
              currentPeriodEnd: end,
              lastEventAt: eventAt,
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
        const email = (sub.metadata && sub.metadata.email) || null;
        // Prefer updating an existing row by customer id; if none exists yet,
        // resolve the email (from metadata, else the Stripe customer) and insert.
        const result = customerId
          ? await setEntitlementByCustomer(
              customerId,
              { status: sub.status, currentPeriodEnd: end, lastEventAt: eventAt },
              now
            )
          : "no_row";
        // "stale" means a newer event is already stored - inserting here would
        // undo it, which is exactly the resurrection bug the guard exists for.
        if (result === "no_row") {
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
                lastEventAt: eventAt,
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
          // The period end is left as-is rather than cleared: `canceled` is
          // what revokes access, and the stored date is still the truthful
          // record of what the customer last paid for.
          await setEntitlementByCustomer(
            customerId,
            { status: "canceled", lastEventAt: eventAt },
            now
          );
        }
        break;
      }

      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        const customerId = customerIdOf(inv.customer);
        if (customerId) {
          // A failed payment says nothing about the billing period, so the
          // period end is deliberately NOT passed. Passing a blanket null here
          // used to erase a renewal date we already knew.
          await setEntitlementByCustomer(
            customerId,
            { status: "past_due", lastEventAt: eventAt },
            now
          );
        }
        break;
      }

      case "invoice.payment_succeeded": {
        // Receipt only - entitlement is granted by the subscription events.
        // Wrapped locally so an email problem never fails the webhook (which
        // would make Stripe retry the whole event). Requires the
        // `invoice.payment_succeeded` event to be enabled on the endpoint.
        // Sending exactly once now rests on the event claim above; before it,
        // a Stripe retry mailed the customer a second receipt for one payment.
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
    // Hand the claim back so Stripe's retry is processed rather than rejected
    // as a duplicate, then return 500 to ask for that retry.
    console.error("[stripe webhook]", err);
    await releaseEvent(event.id).catch((e) =>
      console.error("[stripe webhook] release failed", e)
    );
    return NextResponse.json({ error: "handler_error" }, { status: 500 });
  }

  // Opportunistic housekeeping, after the response-critical work and unable to
  // fail it. 1-in-50 keeps it off the hot path without needing a scheduled job.
  if (Math.random() < 0.02) await pruneProcessedEvents(now);

  return NextResponse.json({ received: true });
}
