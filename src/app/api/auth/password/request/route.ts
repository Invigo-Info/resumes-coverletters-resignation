import { NextResponse } from "next/server";
import { findUserByEmail } from "@/services/database/users";
import {
  createAuthToken,
  countRecentTokens,
  pruneAuthTokens,
  TOKEN_TTL_MS,
} from "@/services/database/auth-tokens";
import { sendPasswordResetEmail } from "@/services/email/email";
import { limit, clientIp } from "@/permissions/rate-limit";
import { passwordResetRequestSchema } from "@/validation/schemas";
import { siteUrl } from "@/config/site";

// Password hashing and the token store need Node, not Edge.
export const runtime = "nodejs";

/** Reset requests allowed per IP per window. */
const IP_LIMIT = Number(process.env.PASSWORD_RESET_IP_LIMIT ?? 10);
const IP_WINDOW_MS = 60 * 60 * 1000;
/** Reset emails allowed per ACCOUNT per window, whatever the source IP. */
const EMAIL_LIMIT = Number(process.env.PASSWORD_RESET_EMAIL_LIMIT ?? 3);
const EMAIL_WINDOW_MS = 60 * 60 * 1000;

/**
 * POST /api/auth/password/request - start a password reset.
 *
 * Until this existed, forgetting a password meant permanent loss of the account
 * and every document in it.
 *
 * The response is deliberately IDENTICAL for a registered and an unregistered
 * address. An endpoint that says "no account with that email" is an account
 * enumeration oracle: it confirms, for any address, whether that person uses
 * this site - which for a resume site means confirming they are job hunting.
 * That is worth protecting on its own, and it also feeds credential stuffing.
 *
 * Two independent throttles, because they stop different things. The per-IP cap
 * stops bulk enumeration attempts. The per-ACCOUNT cap stops mailbox flooding:
 * without it, anyone can make us send a victim reset mail over and over from
 * any number of addresses, which is both harassment and a fast way to get our
 * sending domain marked as spam.
 */
export async function POST(req: Request) {
  const ipGate = await limit(
    `pwreset:ip:${clientIp(req)}`,
    IP_LIMIT,
    IP_WINDOW_MS
  );
  if (!ipGate.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(ipGate.resetMs / 1000)) },
      }
    );
  }

  const parsed = passwordResetRequestSchema.safeParse(
    await req.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }
  const email = parsed.data.email.trim().toLowerCase();

  // Everything below is best-effort and must not change the response, so that
  // the caller learns nothing about whether the address is registered.
  try {
    const user = await findUserByEmail(email);
    if (user) {
      const recent = await countRecentTokens(
        email,
        "password_reset",
        Date.now() - EMAIL_WINDOW_MS
      );
      if (recent < EMAIL_LIMIT) {
        const token = await createAuthToken(email, "password_reset");
        const url = `${siteUrl()}/reset-password?token=${encodeURIComponent(token)}`;
        await sendPasswordResetEmail(
          email,
          url,
          Math.round(TOKEN_TTL_MS.password_reset / 60000)
        );
      }
    }
    // Housekeeping, cheap and off the critical path.
    if (Math.random() < 0.05) await pruneAuthTokens();
  } catch (err) {
    // Logged, never surfaced: an internal failure here must not become a signal
    // that distinguishes a known address from an unknown one.
    console.error("[/api/auth/password/request]", err);
  }

  return NextResponse.json({
    ok: true,
    message:
      "If an account exists for that address, a reset link is on its way.",
  });
}
