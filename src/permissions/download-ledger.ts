import { getSql, isDbEnabled } from "@/services/database/db";
import { FREE_RESUME_LIMIT } from "@/permissions/limits";

/**
 * Server-side export allowance.
 *
 * Replaces a localStorage counter. The old gate kept the list of downloaded
 * document ids under `resume-co:downloads` in the browser, so clearing site
 * data reset it and the free tier was in practice unlimited - the paywall
 * created no reason to subscribe.
 *
 * Scope, stated plainly because it matters: the PDF is still rendered in the
 * browser from data the user typed, so this cannot make exporting
 * cryptographically impossible, and it is not claimed to. What it does make
 * real is the ALLOWANCE - it is counted on the server, against the account,
 * and cannot be reset by the client. See docs/export-paywall.md.
 */

export type DownloadKind = "resume" | "coverLetter" | "resignationLetter";

const KINDS: readonly DownloadKind[] = [
  "resume",
  "coverLetter",
  "resignationLetter",
];

/** Narrow an untrusted string to a known kind. */
export function parseKind(value: unknown): DownloadKind | null {
  return typeof value === "string" && (KINDS as readonly string[]).includes(value)
    ? (value as DownloadKind)
    : null;
}

export interface AuthorizeResult {
  allowed: boolean;
  /** Why, for the client to choose a message and where to send the user. */
  reason:
    | "premium"
    | "within_allowance"
    | "already_downloaded"
    | "limit_reached"
    | "unconfigured";
  /** Distinct documents of this kind already exported. */
  used: number;
  limit: number;
}

/**
 * Decide whether this account may export this document, and RECORD it in the
 * same breath. Check and record must be one operation: a separate
 * "may I?" then "I did" lets a client that fires several requests at once pass
 * the check several times before any of them records, spending one slot many
 * times over.
 *
 * Premium accounts are unlimited but still recorded, so the history survives a
 * lapse in subscription and a downgrade does not silently hand back slots.
 *
 * Returns `unconfigured` when there is no database (local file-store dev), in
 * which case the caller falls back to client-side behaviour rather than
 * blocking - the same shape `/api/entitlement` already uses.
 */
export async function authorizeDownload(
  email: string,
  kind: DownloadKind,
  documentId: string,
  premium: boolean,
  now: number = Date.now()
): Promise<AuthorizeResult> {
  if (!isDbEnabled()) {
    return {
      allowed: true,
      reason: "unconfigured",
      used: 0,
      limit: FREE_RESUME_LIMIT,
    };
  }

  const sql = getSql();
  const target = email.trim().toLowerCase();

  // A transaction, so the insert and the count cannot interleave with another
  // request for the same account.
  return sql.begin(async (tx) => {
    // The insert doubles as the "did this already exist?" probe: a brand-new
    // row comes back with count = 1, a repeat with 2 or more. One statement,
    // so two concurrent calls cannot both see "new".
    const rows = (await tx`
      insert into document_downloads (email, kind, document_id, first_at, last_at, count)
      values (${target}, ${kind}, ${documentId}, ${now}, ${now}, 1)
      on conflict (email, kind, document_id) do update set
        last_at = ${now},
        count   = document_downloads.count + 1
      returning count
    `) as unknown as { count: number }[];
    const isRepeat = Number(rows[0]?.count ?? 1) > 1;

    const distinct = (await tx`
      select count(*)::int as n from document_downloads
      where email = ${target} and kind = ${kind}
    `) as unknown as { n: number }[];
    const used = distinct[0]?.n ?? 0;

    // Re-exporting something already paid for (or already counted) is free,
    // whatever the allowance now says.
    if (isRepeat) {
      return {
        allowed: true,
        reason: "already_downloaded" as const,
        used,
        limit: FREE_RESUME_LIMIT,
      };
    }

    if (premium) {
      return {
        allowed: true,
        reason: "premium" as const,
        used,
        limit: FREE_RESUME_LIMIT,
      };
    }

    if (used <= FREE_RESUME_LIMIT) {
      return {
        allowed: true,
        reason: "within_allowance" as const,
        used,
        limit: FREE_RESUME_LIMIT,
      };
    }

    // Over the line. Undo the row we just wrote, so a refused attempt does not
    // occupy a slot and does not appear in the user's download history.
    await tx`
      delete from document_downloads
      where email = ${target} and kind = ${kind} and document_id = ${documentId}
    `;
    return {
      allowed: false,
      reason: "limit_reached" as const,
      used: used - 1,
      limit: FREE_RESUME_LIMIT,
    };
  }) as Promise<AuthorizeResult>;
}

/** One kind's exported document ids, for the "downloaded" badges in the UI. */
export async function getDownloadedIds(
  email: string
): Promise<Record<DownloadKind, string[]>> {
  const empty: Record<DownloadKind, string[]> = {
    resume: [],
    coverLetter: [],
    resignationLetter: [],
  };
  if (!isDbEnabled()) return empty;

  const sql = getSql();
  const rows = (await sql`
    select kind, document_id from document_downloads
    where email = ${email.trim().toLowerCase()}
  `) as unknown as { kind: DownloadKind; document_id: string }[];

  for (const row of rows) {
    if (empty[row.kind]) empty[row.kind].push(row.document_id);
  }
  return empty;
}

/** Erase an account's download history. Used by account deletion. */
export async function clearDownloads(email: string): Promise<void> {
  if (!isDbEnabled()) return;
  const sql = getSql();
  await sql`
    delete from document_downloads where email = ${email.trim().toLowerCase()}
  `;
}
