import { NextResponse } from "next/server";
import { auth } from "@/features/authentication/auth";
import { updateUserName, deleteUser } from "@/services/database/users";
import { getStripe } from "@/services/payments/server";

/** Update the signed-in user's display name. */
export async function PATCH(request: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { name?: unknown };
  const name = typeof body.name === "string" ? body.name.trim() : "";

  // Persists for file-store (email/password) accounts; for OAuth-only accounts
  // there's no stored record, so the name change lives in the session only.
  await updateUserName(email, name);
  return NextResponse.json({ ok: true, name });
}

/**
 * Permanently delete the signed-in user's account.
 *
 * Order matters: any active paid subscription is cancelled FIRST, so we never
 * leave a live subscription billing a user whose account no longer exists. If
 * that cancellation fails we stop and do NOT delete (returning 502), so the
 * client can show a subscription-specific error and keep the account intact.
 * The user record is then removed; the client wipes local data and signs out.
 * Distinct status codes let the client choose the right message:
 *   401 unauthorized · 502 subscription cancel failed (not deleted) · 500 delete failed.
 */
export async function DELETE() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Cancel active subscriptions before deleting. When Stripe isn't configured
  // (no secret key - the common dev/mock case) there's nothing to cancel, so we
  // skip straight to deletion.
  const stripe = getStripe();
  if (stripe) {
    try {
      const customers = await stripe.customers.list({ email, limit: 10 });
      for (const customer of customers.data) {
        const subs = await stripe.subscriptions.list({
          customer: customer.id,
          status: "all",
          limit: 100,
        });
        for (const sub of subs.data) {
          if (sub.status === "canceled" || sub.status === "incomplete_expired") {
            continue; // already inactive - nothing to cancel
          }
          await stripe.subscriptions.cancel(sub.id);
        }
      }
    } catch (err) {
      console.error("[/api/account] subscription cancel failed", err);
      return NextResponse.json({ error: "subscription" }, { status: 502 });
    }
  }

  try {
    await deleteUser(email);
  } catch (err) {
    console.error("[/api/account] delete failed", err);
    return NextResponse.json({ error: "delete" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
