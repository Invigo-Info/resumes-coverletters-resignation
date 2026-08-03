import { NextResponse } from "next/server";
import { auth } from "@/features/authentication/auth";
import { getSavedJobs, addSavedJob, removeSavedJob } from "@/features/jobs/lib/saved";
import { savedJobBodySchema } from "@/validation/schemas";
import type { JobPosting } from "@/features/jobs/lib/job-search";

/**
 * Account-level saved jobs. The owner email is derived from the verified session
 * only (never trusted from the client), so a user can only read/write their own
 * saved postings. Mirrors `/api/documents`.
 */

/** All of the signed-in user's saved postings, newest first. */
export async function GET() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ jobs: await getSavedJobs(email) });
}

/** Save one posting. Body: `{ job }`. */
export async function POST(request: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = savedJobBodySchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // The schema gates the fields the server relies on and keeps the rest; the
  // client owns and sends the full JobPosting shape, stored as-is.
  await addSavedJob(email, parsed.data.job as unknown as JobPosting, Date.now());
  return NextResponse.json({ ok: true });
}

/** Remove one saved posting. Query: `?id=...`. */
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

  await removeSavedJob(email, id);
  return NextResponse.json({ ok: true });
}
