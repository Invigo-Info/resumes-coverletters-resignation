import { NextResponse } from "next/server";
import { auth } from "@/features/authentication/auth";
import {
  authorizeDownload,
  getDownloadedIds,
  parseKind,
} from "@/permissions/download-ledger";
import { isPremium } from "@/permissions/entitlements";
import { isDbEnabled } from "@/services/database/db";
import { limit, clientIp } from "@/permissions/rate-limit";

// The ledger and entitlement lookups need Node, not Edge.
export const runtime = "nodejs";

/** Export authorizations per account per window. */
const EXPORT_LIMIT = Number(process.env.EXPORT_RATE_LIMIT ?? 60);
const EXPORT_WINDOW_MS = 60_000;

/**
 * POST /api/export/authorize - may this account export this document?
 *
 * The client MUST call this and receive `allowed: true` before exporting. The
 * decision and the recording happen here, in one transaction, so the free-tier
 * allowance is counted on the server against the account instead of in a
 * localStorage key the user can clear.
 *
 * Honest about what this is: the PDF is still rendered in the browser, so this
 * does not make exporting impossible for someone willing to edit the page's
 * JavaScript. It makes the ALLOWANCE real - which is the part that was
 * worthless before, because clearing site data handed back unlimited free
 * downloads. See docs/export-paywall.md.
 */
export async function POST(req: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json(
      { allowed: false, reason: "unauthenticated" },
      { status: 401 }
    );
  }

  const rl = await limit(
    `export:${email || clientIp(req)}`,
    EXPORT_LIMIT,
    EXPORT_WINDOW_MS
  );
  if (!rl.ok) {
    return NextResponse.json(
      { allowed: false, reason: "rate_limited" },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rl.resetMs / 1000)) },
      }
    );
  }

  const body = (await req.json().catch(() => null)) as {
    kind?: unknown;
    documentId?: unknown;
  } | null;

  const kind = parseKind(body?.kind);
  const documentId =
    typeof body?.documentId === "string" ? body.documentId.trim() : "";
  if (!kind || !documentId || documentId.length > 200) {
    return NextResponse.json(
      { allowed: false, reason: "bad_request" },
      { status: 400 }
    );
  }

  try {
    // Entitlement comes from the server's own subscription record, never from
    // anything the client sent.
    const premium = isDbEnabled() ? await isPremium(email) : false;
    const result = await authorizeDownload(email, kind, documentId, premium);
    return NextResponse.json({ ...result, premium });
  } catch (err) {
    console.error("[/api/export/authorize]", err);
    // Fail CLOSED, with a reason that tells the client to offer a RETRY rather
    // than an upgrade. Failing open here looked kinder to paying customers, but
    // "allowed whenever the ledger errors" is an invitation to make it error,
    // and it is the same hole as the client failing open on a blocked request.
    return NextResponse.json(
      { allowed: false, reason: "unavailable", used: 0, limit: 0 },
      { status: 503 }
    );
  }
}

/**
 * GET /api/export/authorize - this account's export history, for the UI.
 *
 * Read-only: it records nothing and authorizes nothing, so it is safe to call
 * on page load. Drives the "downloaded" badges and the remaining-allowance
 * hint, which previously read a localStorage value that could disagree with
 * what the server would actually permit.
 */
export async function GET() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ source: "unauthenticated" }, { status: 401 });
  }
  if (!isDbEnabled()) {
    return NextResponse.json({ source: "unconfigured" });
  }
  try {
    const [downloaded, premium] = await Promise.all([
      getDownloadedIds(email),
      isPremium(email),
    ]);
    return NextResponse.json({ source: "server", downloaded, premium });
  } catch (err) {
    console.error("[/api/export/authorize] GET", err);
    return NextResponse.json({ source: "unconfigured" });
  }
}
