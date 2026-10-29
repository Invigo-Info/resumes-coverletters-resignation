import { getSql } from "@/services/database/db";

/**
 * Stripe webhook delivery guarantees are weaker than they look, and both gaps
 * are handled here.
 *
 * AT-LEAST-ONCE, NOT EXACTLY-ONCE. Stripe retries until it receives a 2xx and
 * documents that an event may arrive more than once regardless. Handlers that
 * only set a status are naturally safe to repeat; ones with a side effect are
 * not - a replayed `invoice.payment_succeeded` emails the customer a second
 * receipt for a single payment. `claimEvent` makes acceptance exclusive.
 *
 * NO ORDERING GUARANTEE. An event generated earlier can be delivered later.
 * The dangerous case is concrete: a `customer.subscription.updated` carrying
 * `status: active`, generated before a cancellation, arriving after the
 * `customer.subscription.deleted` that revoked access. Applied blindly it
 * restores premium to someone who cancelled and is no longer being billed.
 * `shouldApplyEvent` is the guard, compared against `subscriptions.last_event_at`.
 */

/** How long processed-event rows are kept: comfortably past Stripe's retry window. */
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Should an event be applied, given the event time already stored for the row?
 *
 * Pure, so the ordering rule is unit-testable without a database.
 *
 * `>=` rather than `>` deliberately: Stripe stamps `created` in whole seconds,
 * so two genuinely distinct events can share a timestamp. Dropping the second
 * would lose a real state change, and because a same-second pair is applied in
 * arrival order the outcome matches what un-guarded handling would have done.
 * Only STRICTLY older events - the out-of-order case - are refused.
 */
export function shouldApplyEvent(
  storedEventAt: number | null | undefined,
  eventAt: number
): boolean {
  if (storedEventAt == null) return true;
  return eventAt >= storedEventAt;
}

/**
 * Claim an event id for processing. Returns false when it has already been
 * accepted, meaning this delivery is a duplicate and must be skipped.
 *
 * The insert itself is the lock: `on conflict do nothing` + `returning` makes
 * the claim atomic in one statement, so two concurrent deliveries of the same
 * event cannot both win. A check-then-insert would let both through.
 */
export async function claimEvent(
  id: string,
  type: string,
  now: number
): Promise<boolean> {
  const sql = getSql();
  const rows = (await sql`
    insert into processed_events (id, type, processed_at)
    values (${id}, ${type}, ${now})
    on conflict (id) do nothing
    returning id
  `) as unknown as { id: string }[];
  return rows.length > 0;
}

/**
 * Give up a claim so Stripe's retry can be processed.
 *
 * Required for correctness, not tidiness: the claim is taken BEFORE the handler
 * runs, so if the handler throws we return 500 and Stripe retries - but the
 * retry would be rejected as a duplicate and the event would be lost forever.
 * For a `checkout.session.completed` that means a paying customer never gets
 * the entitlement they were charged for.
 */
export async function releaseEvent(id: string): Promise<void> {
  const sql = getSql();
  await sql`delete from processed_events where id = ${id}`;
}

/**
 * Drop rows past the retention window. Called opportunistically from the
 * webhook rather than from a cron job, so there is no extra piece of
 * infrastructure to deploy and monitor for a table this small. Best-effort:
 * a failure here must never fail the webhook, because that would make Stripe
 * retry an event that was in fact handled.
 */
export async function pruneProcessedEvents(now: number): Promise<void> {
  try {
    const sql = getSql();
    await sql`delete from processed_events where processed_at < ${now - RETENTION_MS}`;
  } catch (err) {
    console.error("[stripe webhook] prune failed", err);
  }
}
