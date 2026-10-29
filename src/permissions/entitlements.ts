import { getSql, isDbEnabled } from "@/services/database/db";

/**
 * Server-side subscription entitlement - the source of truth for "premium",
 * driven by the Stripe webhook (`/api/stripe/webhook`). Replaces trusting the
 * client's localStorage flag, so access is granted AND revoked from the server
 * (cancellation, failed payment, refund). Stored in Supabase; keyed by email.
 */

export interface Entitlement {
  premium: boolean;
  status: string;
  plan: string | null;
  currentPeriodEnd: number | null;
}

/** Statuses that grant premium access. */
const PREMIUM_STATUSES = new Set(["active", "trialing"]);

/** Pure helper (unit-testable): does this subscription status grant access? */
export function isPremiumStatus(status: string | null | undefined): boolean {
  return status != null && PREMIUM_STATUSES.has(status);
}

function normalize(email: string): string {
  return email.trim().toLowerCase();
}

interface SubRow {
  status: string;
  plan: string | null;
  current_period_end: string | number | null;
}

/** The account's entitlement. Returns free/inactive when no DB is configured. */
export async function getEntitlement(email: string): Promise<Entitlement> {
  const free: Entitlement = {
    premium: false,
    status: "inactive",
    plan: null,
    currentPeriodEnd: null,
  };
  if (!isDbEnabled()) return free;
  const sql = getSql();
  const rows = (await sql`
    select status, plan, current_period_end
    from subscriptions where email = ${normalize(email)} limit 1
  `) as unknown as SubRow[];
  const row = rows[0];
  if (!row) return free;
  return {
    premium: isPremiumStatus(row.status),
    status: row.status,
    plan: row.plan,
    currentPeriodEnd:
      row.current_period_end == null ? null : Number(row.current_period_end),
  };
}

/** Convenience: is this account premium right now? */
export async function isPremium(email: string): Promise<boolean> {
  return (await getEntitlement(email)).premium;
}

interface EntitlementUpsert {
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  status: string;
  plan?: string | null;
  currentPeriodEnd?: number | null;
  /**
   * Epoch ms of the Stripe event this state came from (its `created` field).
   *
   * Supplied by the webhook so a late-arriving older event cannot overwrite
   * newer state. Omitted by callers that are not reacting to an event (e.g. the
   * post-checkout page confirming a session it just verified), which then write
   * unconditionally - correct, because there is no ordering question to answer.
   */
  lastEventAt?: number;
}

/** Outcome of an ordering-guarded entitlement write. */
export type ApplyResult =
  /** The write landed. */
  | "applied"
  /** No row matched the Stripe customer id - the caller may need to insert. */
  | "no_row"
  /** A row exists but already holds state from a NEWER event; nothing changed. */
  | "stale";

/**
 * Insert or update the entitlement for an email (used by the webhook).
 *
 * When `lastEventAt` is given, an update is refused if the stored row already
 * carries a newer event - returning "stale" instead of silently rolling the
 * subscription backwards.
 */
export async function upsertEntitlement(
  email: string,
  e: EntitlementUpsert,
  now: number
): Promise<ApplyResult> {
  const sql = getSql();
  const at = e.lastEventAt ?? null;
  // Unguarded callers must still win, so their guard clause is always true.
  const guard =
    at == null
      ? sql`true`
      : sql`subscriptions.last_event_at is null or subscriptions.last_event_at <= ${at}`;
  const rows = (await sql`
    insert into subscriptions (
      email, stripe_customer_id, stripe_subscription_id, status, plan,
      current_period_end, updated_at, last_event_at
    )
    values (
      ${normalize(email)}, ${e.stripeCustomerId ?? null},
      ${e.stripeSubscriptionId ?? null}, ${e.status}, ${e.plan ?? null},
      ${e.currentPeriodEnd ?? null}, ${now}, ${at}
    )
    on conflict (email) do update set
      stripe_customer_id     = coalesce(excluded.stripe_customer_id, subscriptions.stripe_customer_id),
      stripe_subscription_id = coalesce(excluded.stripe_subscription_id, subscriptions.stripe_subscription_id),
      status                 = excluded.status,
      plan                   = coalesce(excluded.plan, subscriptions.plan),
      current_period_end     = excluded.current_period_end,
      updated_at             = excluded.updated_at,
      last_event_at          = coalesce(excluded.last_event_at, subscriptions.last_event_at)
    where ${guard}
    returning email
  `) as unknown as { email: string }[];
  return rows.length > 0 ? "applied" : "stale";
}

/**
 * Update status/period by Stripe customer id (subscription lifecycle events
 * carry the customer, not the email).
 *
 * `currentPeriodEnd` is deliberately OPTIONAL and distinguishes undefined from
 * null. Events like `invoice.payment_failed` say nothing about the billing
 * period, and passing a blanket null for them erased a period end we already
 * knew - leaving the account with no renewal date on record. Omit the field to
 * keep the stored value; pass null only to genuinely clear it (a cancellation).
 */
export async function setEntitlementByCustomer(
  customerId: string,
  patch: {
    status: string;
    currentPeriodEnd?: number | null;
    /** Epoch ms of the originating Stripe event; enforces ordering. */
    lastEventAt?: number;
  },
  now: number
): Promise<ApplyResult> {
  const sql = getSql();
  const at = patch.lastEventAt ?? null;
  const period =
    patch.currentPeriodEnd === undefined
      ? sql`current_period_end`
      : sql`${patch.currentPeriodEnd}`;
  const guard =
    at == null
      ? sql`true`
      : sql`(last_event_at is null or last_event_at <= ${at})`;
  const rows = (await sql`
    update subscriptions
    set status             = ${patch.status},
        current_period_end = ${period},
        updated_at         = ${now},
        last_event_at      = coalesce(${at}, last_event_at)
    where stripe_customer_id = ${customerId}
      and ${guard}
    returning email
  `) as unknown as { email: string }[];
  if (rows.length > 0) return "applied";

  // Zero rows is ambiguous - no such customer, or the guard refused a stale
  // event. The caller acts very differently on each (insert a new row vs do
  // nothing at all), so resolve it rather than guessing.
  const exists = (await sql`
    select 1 from subscriptions where stripe_customer_id = ${customerId} limit 1
  `) as unknown as unknown[];
  return exists.length > 0 ? "stale" : "no_row";
}

/**
 * Erase a user's stored subscription row. Used by account deletion.
 *
 * No-op without a database: entitlements are Postgres-only (file-store mode has
 * no subscription state to erase).
 */
export async function deleteEntitlement(email: string): Promise<void> {
  if (!isDbEnabled()) return;
  const sql = getSql();
  await sql`delete from subscriptions where email = ${normalize(email)}`;
}
