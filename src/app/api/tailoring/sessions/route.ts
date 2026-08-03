import { NextResponse } from "next/server";
import { auth } from "@/features/authentication/auth";
import {
  getTailoringSessions,
  getTailoringSession,
  upsertTailoringSession,
  removeTailoringSession,
  type PersistedTailoringSession,
} from "@/features/jobs/tailoring/sessions";
import { tailoringSessionBodySchema } from "@/validation/schemas";

/**
 * Account-level tailoring sessions. The owner email is derived from the verified
 * session only (never trusted from the client), so a user can only read/write
 * their own sessions. Mirrors `/api/documents` and `/api/jobs/saved`.
 */

/** GET one session (`?id=`) or all of the signed-in user's sessions. */
export async function GET(request: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (id) {
    return NextResponse.json({ session: await getTailoringSession(email, id) });
  }
  return NextResponse.json({ sessions: await getTailoringSessions(email) });
}

/** Insert or update a session. Body: `{ session }`. */
export async function PUT(request: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = tailoringSessionBodySchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // The schema gates the fields the server keys on; the client owns and sends the
  // full TailoringSession shape, stored as-is.
  await upsertTailoringSession(
    email,
    parsed.data.session as unknown as PersistedTailoringSession
  );
  return NextResponse.json({ ok: true });
}

/** Remove one session. Query: `?id=...`. */
export async function DELETE(request: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  await removeTailoringSession(email, id);
  return NextResponse.json({ ok: true });
}
