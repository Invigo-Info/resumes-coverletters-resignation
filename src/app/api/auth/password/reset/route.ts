import { NextResponse } from "next/server";
import { setUserPassword, setEmailVerified } from "@/services/database/users";
import {
  consumeAuthToken,
  invalidateAuthTokens,
} from "@/services/database/auth-tokens";
import { limit, clientIp, reset as resetLimit } from "@/permissions/rate-limit";
import { passwordResetSchema } from "@/validation/schemas";

export const runtime = "nodejs";

/** Reset attempts per IP per window - this is the token-guessing brake. */
const ATTEMPT_LIMIT = Number(process.env.PASSWORD_RESET_ATTEMPT_LIMIT ?? 20);
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

/**
 * POST /api/auth/password/reset - finish a password reset.
 *
 * Consuming the token IS the authentication: it proves the caller can read the
 * account's mailbox. So the order of operations matters and is not arbitrary.
 *
 *   1. Consume the token atomically. One statement marks it used and returns
 *      the email, so a replayed or concurrent request gets nothing back. A
 *      check-then-use would turn a single-use token into a reusable one.
 *   2. Set the new password.
 *   3. Invalidate every OTHER outstanding reset token for that account.
 *      Without this, an older link - perhaps requested by an attacker, or
 *      sitting in a mailbox the user has since lost - still works against the
 *      new password, which defeats the point of resetting it.
 *   4. Clear the failed-login throttle, so someone who just proved ownership is
 *      not left locked out by the attempts that made them reset in the first
 *      place.
 */
export async function POST(req: Request) {
  const gate = await limit(
    `pwreset:attempt:${clientIp(req)}`,
    ATTEMPT_LIMIT,
    ATTEMPT_WINDOW_MS
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

  const parsed = passwordResetSchema.safeParse(
    await req.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }
  const { token, password } = parsed.data;

  try {
    const email = await consumeAuthToken(token, "password_reset");
    if (!email) {
      // One message for unknown, expired and already-used, so the response does
      // not tell a caller which of those a guessed token was.
      return NextResponse.json(
        { error: "This reset link is invalid or has expired." },
        { status: 400 }
      );
    }

    const updated = await setUserPassword(email, password);
    if (!updated) {
      // The token was valid but the account is gone (deleted mid-flow).
      return NextResponse.json(
        { error: "This reset link is invalid or has expired." },
        { status: 400 }
      );
    }

    await invalidateAuthTokens(email, "password_reset");

    // Receiving mail at the address is exactly what verification proves, so a
    // completed reset confirms it too rather than asking the user again.
    await setEmailVerified(email).catch(() => {});

    // Let them straight back in; the lockout has served its purpose.
    await resetLimit(`login:${email}`);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/auth/password/reset]", err);
    return NextResponse.json(
      { error: "Something went wrong. Please request a new link." },
      { status: 500 }
    );
  }
}
