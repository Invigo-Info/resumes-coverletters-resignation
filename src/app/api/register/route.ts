import { NextResponse } from "next/server";
import { createUser } from "@/lib/users";

// Basic email shape check: non-space chars, an @, a domain, and a TLD.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/register — creates a new account from { email, password, name }.
 * Validates input, then maps the createUser "exists" error to a 409 conflict.
 */
export async function POST(req: Request) {
  let body: { email?: string; password?: string; name?: string };
  // Reject malformed/non-JSON request bodies before any processing.
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const email = (body.email || "").trim();
  const password = body.password || "";

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  try {
    const user = await createUser(email, password, body.name);
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
