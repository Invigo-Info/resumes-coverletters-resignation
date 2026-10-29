"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { safeLocalStorage } from "@/utilities/safe-storage";
import { FREE_RESUME_LIMIT } from "@/permissions/limits";
import type { DownloadKind } from "@/permissions/download-ledger";

export { FREE_RESUME_LIMIT };
export type { DownloadKind };

/**
 * Client side of the export allowance.
 *
 * The DECISION is no longer here. It used to be: `canDownload` compared a
 * localStorage list against the limit, and `recordDownload` appended to that
 * same list. Clearing site data reset the counter, so the free tier was in
 * practice unlimited. Both now live on the server - see
 * `permissions/download-ledger.ts` and `POST /api/export/authorize`.
 *
 * What remains here is a CACHE, used only to paint "downloaded" badges without
 * waiting for a round trip. It is hydrated from the server on load, so a
 * tampered value is corrected rather than trusted, and it never gates anything.
 */

const emptyMap = (): Record<DownloadKind, string[]> => ({
  resume: [],
  coverLetter: [],
  resignationLetter: [],
});

interface DownloadGateState {
  downloadedIds: Record<DownloadKind, string[]>;
  /** Local-only note that a document was exported, for immediate UI feedback. */
  noteDownloaded: (kind: DownloadKind, id: string) => void;
  /** Replace the cache with the server's record. */
  hydrate: (ids: Record<DownloadKind, string[]>) => void;
}

export const useDownloadGate = create<DownloadGateState>()(
  persist(
    (set, get) => ({
      downloadedIds: emptyMap(),
      noteDownloaded: (kind, id) => {
        if (!id) return;
        const ids = get().downloadedIds[kind] ?? [];
        if (ids.includes(id)) return;
        set((s) => ({
          downloadedIds: {
            ...s.downloadedIds,
            [kind]: [...(s.downloadedIds[kind] ?? []), id],
          },
        }));
      },
      hydrate: (ids) => set({ downloadedIds: { ...emptyMap(), ...ids } }),
    }),
    {
      name: "resume-co:downloads",
      storage: createJSONStorage(() => safeLocalStorage),
      // Fill any missing kind so an older/partial persisted blob can't break reads.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<DownloadGateState>;
        return {
          ...current,
          ...p,
          downloadedIds: { ...emptyMap(), ...(p.downloadedIds ?? {}) },
        };
      },
    }
  )
);

/** Why an export was refused, or how it was permitted. */
export type AuthorizeReason =
  | "premium"
  | "within_allowance"
  | "already_downloaded"
  | "limit_reached"
  | "unconfigured"
  | "unauthenticated"
  | "rate_limited"
  | "bad_request"
  /** The server could not be reached or did not answer usefully. */
  | "unavailable";

export interface AuthorizeDownload {
  ok: boolean;
  reason: AuthorizeReason;
  used: number;
  limit: number;
  /**
   * Whether a refusal should send the user to the subscribe funnel.
   *
   * False for infrastructure failures: a paying customer who hits a dropped
   * connection must not be shown an upgrade page, which would read as "your
   * subscription is gone". Those get a retry message instead.
   */
  shouldUpsell: boolean;
}

/**
 * Ask the server whether this document may be exported, and let it record the
 * export at the same time.
 *
 * Call this and check `ok` BEFORE generating the file. Note the ordering
 * consequence: the slot is spent when permission is granted, not when the file
 * finishes. If the PDF generation then fails, the document is already in the
 * ledger - which means retrying that same document is free, because repeats
 * never cost a slot. So a failed export costs nothing to retry; it only
 * matters if the user abandons that document entirely.
 *
 * Fails CLOSED. An unreachable endpoint is a refusal, not an approval: failing
 * open would mean one ad-blocker rule against `/api/export/authorize` restores
 * exactly the unlimited free tier this replaces - no developer tools, no
 * patching, just a blocked request. The cost is that a genuine outage blocks
 * downloads, which is why the message says to retry rather than to subscribe.
 *
 * The legitimate "no server to ask" case is handled by the SERVER, which
 * answers `allowed: true, reason: "unconfigured"` when no database is
 * configured. That keeps local file-store development working without leaving
 * a bypass in the client.
 */
export async function authorizeDownload(
  kind: DownloadKind,
  id: string
): Promise<AuthorizeDownload> {
  const unavailable: AuthorizeDownload = {
    ok: false,
    reason: "unavailable",
    used: 0,
    limit: FREE_RESUME_LIMIT,
    shouldUpsell: false,
  };

  let data:
    | (Partial<AuthorizeDownload> & {
        allowed?: boolean;
        reason?: AuthorizeReason;
      })
    | null = null;
  try {
    const res = await fetch("/api/export/authorize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, documentId: id }),
    });
    data = await res.json().catch(() => null);
    // A 5xx is an outage, not a verdict - keep the retry wording.
    if (!data || (!res.ok && res.status >= 500)) return unavailable;
  } catch {
    return unavailable;
  }

  const ok = Boolean(data.allowed);
  if (ok) useDownloadGate.getState().noteDownloaded(kind, id);

  const reason = data.reason ?? "unavailable";
  return {
    ok,
    reason,
    used: data.used ?? 0,
    limit: data.limit ?? FREE_RESUME_LIMIT,
    // Only a real verdict about entitlement sends the user to /payment.
    shouldUpsell:
      !ok && (reason === "limit_reached" || reason === "unauthenticated"),
  };
}

/**
 * Message for a refusal that is NOT about entitlement - a blocked, failed or
 * erroring authorize call. Shared so every download button says the same thing,
 * and so it reads as "try again" rather than "you need to pay", which would be
 * both wrong and alarming for a subscriber.
 */
export const EXPORT_UNAVAILABLE =
  "Couldn't verify your subscription just now. Please try again.";

/* Kind-specific wrappers used by the download buttons. */
export const authorizeResumeDownload = (id: string) =>
  authorizeDownload("resume", id);
export const authorizeCoverLetterDownload = (id: string) =>
  authorizeDownload("coverLetter", id);
export const authorizeResignationLetterDownload = (id: string) =>
  authorizeDownload("resignationLetter", id);

/**
 * Pull the server's export record into the cache once per page load, so the
 * "downloaded" badges reflect the account rather than this browser.
 */
if (typeof window !== "undefined") {
  void fetch("/api/export/authorize")
    .then((r) => (r.ok ? r.json() : null))
    .then(
      (
        d:
          | {
              source?: string;
              downloaded?: Record<DownloadKind, string[]>;
            }
          | null
      ) => {
        if (d?.source === "server" && d.downloaded) {
          useDownloadGate.getState().hydrate(d.downloaded);
        }
      }
    )
    .catch(() => {
      /* offline or signed out - keep the cached badges */
    });
}
