import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getEntitlement } from "@/lib/entitlements";
import { isDbEnabled } from "@/lib/db";
import { isStripeConfigured } from "@/lib/stripe/server";

/**
 * GET /api/entitlement - the signed-in user's premium status, from the server.
 *
 * `source` tells the client whether to treat this as authoritative:
 *   - "server": DB + Stripe are configured; the client MUST use `premium` (this
 *     overrides any local flag, so a tampered localStorage value cannot unlock).
 *   - "unconfigured"/"unauthenticated": fall back to local behavior (dev), since
 *     there is no server truth to enforce.
 */
export async function GET() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ premium: false, source: "unauthenticated" });
  }
  if (!isDbEnabled() || !isStripeConfigured()) {
    return NextResponse.json({ premium: false, source: "unconfigured" });
  }
  const ent = await getEntitlement(email);
  return NextResponse.json({ premium: ent.premium, source: "server" });
}
