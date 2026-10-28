"use client";

/**
 * Client helpers that sync the localStorage-backed document stores with the
 * server (/api/documents), so a signed-in user's resumes, cover letters and
 * resignation letters follow their account across browsers/devices instead of
 * living only in one browser.
 *
 * Writes are best-effort and fire-and-forget - the local store stays the source
 * of truth for instant UI; the server is the durable, cross-device backup that
 * the dashboards pull from on load.
 */

export type ServerDocType =
  | "resumes"
  | "coverLetters"
  | "resignationLetters"
  | "interviewPrep";

export interface ServerDocument {
  id: string;
  title: string;
  updatedAt: number;
  templateId?: string;
  data: unknown;
}

interface ServerDocuments {
  resumes: ServerDocument[];
  coverLetters: ServerDocument[];
  resignationLetters: ServerDocument[];
  interviewPrep: ServerDocument[];
}

/* ------------------------- conflict detection ------------------------ */

/**
 * Per-document record of the version we last know the SERVER held, keyed
 * `type:id`. Sent as `baseUpdatedAt` so a write becomes a compare-and-swap:
 * the server applies it only if nothing else changed the document meanwhile.
 *
 * Without this, two tabs editing one resume silently destroy each other's work
 * - the second save carries a newer timestamp but older content, so the server
 * accepts it and the first edit is gone with no warning anywhere.
 */
const baselines = new Map<string, number>();

/** Documents whose last push was refused because the server moved on. */
const conflicted = new Set<string>();

type ConflictListener = (
  type: ServerDocType,
  id: string,
  storedUpdatedAt: number
) => void;
const listeners = new Set<ConflictListener>();

const keyOf = (type: ServerDocType, id: string) => `${type}:${id}`;

/**
 * Subscribe to save conflicts. Returns an unsubscribe function. Intended for a
 * "this document changed in another tab" prompt; nothing listens yet, so a
 * conflict is currently recorded and surfaced via `isConflicted` only.
 */
export function onDocumentConflict(fn: ConflictListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** True when this document's last push was refused as conflicting. */
export function isConflicted(type: ServerDocType, id: string): boolean {
  return conflicted.has(keyOf(type, id));
}

/**
 * Clear a conflict, declaring `updatedAt` the version to build the next write
 * on. Call this from a conflict UI once the user has chosen what to keep -
 * never automatically, because adopting the server's version unconditionally is
 * precisely the silent overwrite this mechanism exists to prevent.
 */
export function resolveConflict(
  type: ServerDocType,
  id: string,
  updatedAt: number
): void {
  const k = keyOf(type, id);
  conflicted.delete(k);
  baselines.set(k, updatedAt);
}

/** Fetch the signed-in user's documents. Returns null when logged out/offline. */
export async function fetchServerDocuments(): Promise<ServerDocuments | null> {
  try {
    const res = await fetch("/api/documents", { cache: "no-store" });
    if (!res.ok) return null; // 401 when not signed in
    const docs = (await res.json()) as ServerDocuments;
    // A fresh read is the authoritative baseline for every document it carries,
    // which is also how a tab stuck in conflict recovers: reloading re-reads the
    // server, and the dashboards' existing union-merge then decides what wins.
    for (const type of Object.keys(docs) as ServerDocType[]) {
      for (const rec of docs[type] ?? []) {
        const k = keyOf(type, rec.id);
        baselines.set(k, rec.updatedAt);
        conflicted.delete(k);
      }
    }
    return docs;
  } catch {
    return null;
  }
}

/** What happened to a push. Callers may ignore this - most do. */
export type PushResult = "saved" | "conflict" | "failed";

/**
 * Persist one document to the server (best-effort).
 *
 * Still safe to call fire-and-forget: the returned promise never rejects, and
 * the local store remains the source of truth for the UI. The return value
 * exists so a caller that cares can tell a real save from a refused one.
 */
export function pushServerDocument(
  type: ServerDocType,
  record: ServerDocument
): Promise<PushResult> {
  const k = keyOf(type, record.id);

  // Already conflicting: stop pushing rather than resolving it by force. The
  // user's work is safe in the local store; a reload re-reads the server and
  // clears the conflict through the merge path.
  if (conflicted.has(k)) return Promise.resolve("conflict");

  return fetch("/api/documents", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, record, baseUpdatedAt: baselines.get(k) }),
  })
    .then(async (res) => {
      if (res.ok) {
        baselines.set(k, record.updatedAt);
        return "saved" as const;
      }
      if (res.status === 409) {
        const body = (await res.json().catch(() => ({}))) as {
          storedUpdatedAt?: number;
        };
        const stored = body.storedUpdatedAt ?? 0;
        // Deliberately do NOT advance the baseline here - doing so would make
        // the next push succeed and clobber the other edit.
        conflicted.add(k);
        for (const fn of listeners) {
          try {
            fn(type, record.id, stored);
          } catch {
            /* a bad listener must not break the save path */
          }
        }
        return "conflict" as const;
      }
      return "failed" as const; // 401 signed out, 413 too large, 5xx
    })
    .catch(() => "failed" as const); // offline - local store already has it
}

/** Remove one document from the server (best-effort). */
export function deleteServerDocument(type: ServerDocType, id: string): void {
  try {
    void fetch(
      `/api/documents?type=${type}&id=${encodeURIComponent(id)}`,
      { method: "DELETE" }
    ).catch(() => {});
  } catch {
    /* ignore */
  }
}
