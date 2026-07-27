import { getSql, isDbEnabled } from "./db";

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
}

/** Insert or update the entitlement for an email (used by the webhook). */
export async function upsertEntitlement(
  email: string,
  e: EntitlementUpsert,
  now: number
): Promise<void> {
  const sql = getSql();
  await sql`
    insert into subscriptions (
      email, stripe_customer_id, stripe_subscription_id, status, plan,
      current_period_end, updated_at
    )
    values (
      ${normalize(email)}, ${e.stripeCustomerId ?? null},
      ${e.stripeSubscriptionId ?? null}, ${e.status}, ${e.plan ?? null},
      ${e.currentPeriodEnd ?? null}, ${now}
    )
    on conflict (email) do update set
      stripe_customer_id     = coalesce(excluded.stripe_customer_id, subscriptions.stripe_customer_id),
      stripe_subscription_id = coalesce(excluded.stripe_subscription_id, subscriptions.stripe_subscription_id),
      status                 = excluded.status,
      plan                   = coalesce(excluded.plan, subscriptions.plan),
      current_period_end     = excluded.current_period_end,
      updated_at             = excluded.updated_at
  `;
}

/**
 * Update status/period by Stripe customer id (subscription lifecycle events
 * carry the customer, not the email). Returns the number of rows updated so the
 * caller can fall back to a customer->email lookup when nothing matched yet.
 */
export async function setEntitlementByCustomer(
  customerId: string,
  status: string,
  currentPeriodEnd: number | null,
  now: number
): Promise<number> {
  const sql = getSql();
  const rows = (await sql`
    update subscriptions
    set status = ${status}, current_period_end = ${currentPeriodEnd}, updated_at = ${now}
    where stripe_customer_id = ${customerId}
    returning email
  `) as unknown as { email: string }[];
  return rows.length;
}
