import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getUserDocuments,
  upsertDocument,
  removeDocument,
  isDocType,
  type StoredDocument,
} from "@/lib/documents";
import { getEntitlement } from "@/lib/entitlements";
import { FREE_RESUME_LIMIT } from "@/lib/limits";

/** All documents for the signed-in user (resumes, cover/resignation letters). */
export async function GET() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await getUserDocuments(email));
}

/** Insert or update one document. Body: `{ type, record }`. */
export async function PUT(request: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    type?: unknown;
    record?: Partial<StoredDocument>;
  };
  const { type, record } = body;
  if (!isDocType(type) || !record || typeof record.id !== "string") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // Enforce the free-tier resume cap server-side (the client also gates, but a
  // tampered localStorage flag must not bypass it). Only a NEW resume counts;
  // editing an existing one, and any non-resume document, is always allowed.
  if (type === "resumes") {
    const existing = await getUserDocuments(email);
    const isNew = !existing.resumes.some((r) => r.id === record.id);
    if (isNew && existing.resumes.length >= FREE_RESUME_LIMIT) {
      const { premium } = await getEntitlement(email);
      if (!premium) {
        return NextResponse.json(
          { error: "resume_limit", limit: FREE_RESUME_LIMIT },
          { status: 403 }
        );
      }
    }
  }

  await upsertDocument(email, type, {
    id: record.id,
    title: typeof record.title === "string" ? record.title : "Untitled",
    updatedAt:
      typeof record.updatedAt === "number" ? record.updatedAt : Date.now(),
    templateId:
      typeof record.templateId === "string" ? record.templateId : undefined,
    data: record.data,
  });
  return NextResponse.json({ ok: true });
}

/** Remove one document. Query: `?type=...&id=...`. */
export async function DELETE(request: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const id = searchParams.get("id");
  if (!isDocType(type) || !id) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  await removeDocument(email, type, id);
  return NextResponse.json({ ok: true });
}
