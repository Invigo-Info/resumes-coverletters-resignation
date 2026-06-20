"use client";

/**
 * Client helpers that sync the localStorage-backed document stores with the
 * server (/api/documents), so a signed-in user's resumes, cover letters and
 * resignation letters follow their account across browsers/devices instead of
 * living only in one browser.
 *
 * Writes are best-effort and fire-and-forget — the local store stays the source
 * of truth for instant UI; the server is the durable, cross-device backup that
 * the dashboards pull from on load.
 */

export type ServerDocType = "resumes" | "coverLetters" | "resignationLetters";

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
}

/** Fetch the signed-in user's documents. Returns null when logged out/offline. */
export async function fetchServerDocuments(): Promise<ServerDocuments | null> {
  try {
    const res = await fetch("/api/documents", { cache: "no-store" });
    if (!res.ok) return null; // 401 when not signed in
    return (await res.json()) as ServerDocuments;
  } catch {
    return null;
  }
}

/** Persist one document to the server (best-effort). */
export function pushServerDocument(
  type: ServerDocType,
  record: ServerDocument
): void {
  try {
    void fetch("/api/documents", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, record }),
    }).catch(() => {});
  } catch {
    /* ignore — local store already has it */
  }
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
