import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getDismissedJobs,
  addDismissedJob,
  removeDismissedJob,
  clearDismissedJobs,
} from "@/lib/jobs/dismissed";
import { dismissedJobBodySchema } from "@/lib/schemas";

/**
 * Account-level dismissed ("Not interested") jobs. Owner email is derived from
 * the verified session only, so a user can only read/write their own list.
 * Companion to `/api/jobs/saved`.
 */

/** All of the signed-in user's dismissed jobs. */
export async function GET() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ dismissed: await getDismissedJobs(email) });
}

/** Dismiss one posting. Body: `{ jobId, reason? }`. */
export async function POST(request: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = dismissedJobBodySchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  await addDismissedJob(
    email,
    parsed.data.jobId,
    parsed.data.reason ?? null,
    Date.now()
  );
  return NextResponse.json({ ok: true });
}

/** Remove one dismissed job (`?id=`), or clear all when no id is given. */
export async function DELETE(request: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (id) {
    await removeDismissedJob(email, id);
  } else {
    await clearDismissedJobs(email);
  }
  return NextResponse.json({ ok: true });
}
