import { NextResponse } from "next/server";
import { createUser } from "@/lib/users";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: { email?: string; password?: string; name?: string };
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
