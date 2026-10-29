import { NextResponse } from "next/server";
import { auth } from "@/features/authentication/auth";
import { findUserByEmail, setEmailVerified } from "@/services/database/users";
import {
  consumeAuthToken,
  createAuthToken,
  countRecentTokens,
} from "@/services/database/auth-tokens";
import { sendVerifyEmail } from "@/services/email/email";
import { limit, clientIp } from "@/permissions/rate-limit";
import { siteUrl } from "@/config/site";

export const runtime = "nodejs";

/** Verification emails per account per window. */
const RESEND_LIMIT = Number(process.env.EMAIL_VERIFY_RESEND_LIMIT ?? 3);
const RESEND_WINDOW_MS = 60 * 60 * 1000;
/** Confirm attempts per IP per window - the token-guessing brake. */
const CONFIRM_LIMIT = Number(process.env.EMAIL_VERIFY_ATTEMPT_LIMIT ?? 20);
const CONFIRM_WINDOW_MS = 15 * 60 * 1000;

/**
 * POST /api/auth/verify - confirm an address, or ask for a fresh link.
 *
 * `{ token }` confirms; an empty body resends to the signed-in account.
 *
 * Verification is NOT enforced at sign-in, and that is a deliberate choice
 * rather than an omission: every account that already exists predates this
 * feature, so gating login on a verified flag would lock out the entire current
 * user base on deploy. It is recorded, surfaced on the account page, and
 * available to gate individual actions later.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    token?: unknown;
  } | null;
  const token = typeof body?.token === "string" ? body.token.trim() : "";

  /* ---------------------------- confirm ---------------------------- */
  if (token) {
    const gate = await limit(
      `verify:attempt:${clientIp(req)}`,
      CONFIRM_LIMIT,
      CONFIRM_WINDOW_MS
    );
    if (!gate.ok) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(gate.resetMs / 1000)) },
        }
      );
    }

    try {
      // No session required. The token is the proof, and the link is routinely
      // opened in a different browser from the one that signed up.
      const email = await consumeAuthToken(token, "email_verify");
      if (!email) {
        return NextResponse.json(
          { error: "This confirmation link is invalid or has expired." },
          { status: 400 }
        );
      }
      await setEmailVerified(email);
      return NextResponse.json({ ok: true, email });
    } catch (err) {
      console.error("[/api/auth/verify] confirm", err);
      return NextResponse.json(
        { error: "Something went wrong. Please request a new link." },
        { status: 500 }
      );
    }
  }

  /* ----------------------------- resend ---------------------------- */
  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const user = await findUserByEmail(email);
    if (!user) {
      // Google-only accounts have no users row, and Google has already verified
      // the address - there is nothing for us to confirm.
      return NextResponse.json({ ok: true, alreadyVerified: true });
    }
    if (user.emailVerifiedAt) {
      return NextResponse.json({ ok: true, alreadyVerified: true });
    }

    const recent = await countRecentTokens(
      email,
      "email_verify",
      Date.now() - RESEND_WINDOW_MS
    );
    if (recent >= RESEND_LIMIT) {
      return NextResponse.json(
        { error: "Too many emails sent. Please try again later." },
        { status: 429 }
      );
    }

    const fresh = await createAuthToken(email, "email_verify");
    await sendVerifyEmail(
      email,
      `${siteUrl()}/verify-email?token=${encodeURIComponent(fresh)}`,
      user.name
    );
    return NextResponse.json({ ok: true, sent: true });
  } catch (err) {
    console.error("[/api/auth/verify] resend", err);
    return NextResponse.json(
      { error: "Could not send the email. Please try again." },
      { status: 500 }
    );
  }
}

/** GET /api/auth/verify - the signed-in account's verification state. */
export async function GET() {
  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const user = await findUserByEmail(email);
  return NextResponse.json({
    // No users row means a Google sign-in, which arrives pre-verified.
    verified: user ? Boolean(user.emailVerifiedAt) : true,
    applicable: Boolean(user),
  });
}
