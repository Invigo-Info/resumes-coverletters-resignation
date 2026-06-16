import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { updateUserName, deleteUser } from "@/lib/users";

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

/** Permanently delete the signed-in user's account. */
export async function DELETE() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await deleteUser(email);
  return NextResponse.json({ ok: true });
}
