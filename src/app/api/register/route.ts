import { NextResponse } from "next/server";
import { createUser } from "@/lib/users";
import { limit, clientIp } from "@/lib/rate-limit";
import { registerBodySchema } from "@/lib/schemas";
import { sendWelcomeEmail } from "@/lib/email";

// Cap signups per IP to blunt automated account-creation spam.
const REGISTER_LIMIT = Number(process.env.REGISTER_RATE_LIMIT ?? 10);
const REGISTER_WINDOW_MS = 60_000;

/**
 * POST /api/register - creates a new account from { email, password, name }.
 * Validates input (email shape + password policy), then maps the createUser
 * "exists" error to a 409 conflict.
 */
export async function POST(req: Request) {
  const rl = await limit(
    `register:${clientIp(req)}`,
    REGISTER_LIMIT,
    REGISTER_WINDOW_MS
  );
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again in a minute." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetMs / 1000)) } }
    );
  }

  // Validate the body at the trust boundary; surface the first policy message so
  // the UI still shows a specific, actionable error.
  const parsed = registerBodySchema.safeParse(
    await req.json().catch(() => null)
  );
  if (!parsed.success) {
    const message =
      parsed.error.issues[0]?.message ?? "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  const { email, password, name } = parsed.data;

  try {
    const user = await createUser(email, password, name);
    // Best-effort welcome email. Awaited so it runs reliably on serverless, but
    // it never throws (errors are swallowed) and is instant when email is
    // unconfigured, so it cannot fail or slow down sign-up.
    await sendWelcomeEmail(user.email, user.name);
    return NextResponse.json({ ok: true, user }, { status: 201 });
  } catch (err) {
    // Duplicate-email signups surface as a 409 so the UI can prompt sign-in instead.
    if (err instanceof Error && err.message === "exists") {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }
    console.error("[/api/register]", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
