// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Per-user document isolation - the core authorization invariant for this app.
 * `/api/documents` derives the owner email from the verified session and passes
 * it straight to these functions, so isolation ultimately rests on the store
 * scoping every read/write strictly by email. This test locks that: user B's
 * email must never surface user A's documents, and a delete by one user must not
 * touch another's.
 *
 * Runs against the file backend (DATABASE_URL is unset in tests) with an
 * in-memory fs mock so it never touches the real .data/ files.
 */

const files = new Map<string, string>();

vi.mock("fs", () => ({
  promises: {
    readFile: async (p: string) => {
      if (!files.has(p)) {
        const err = new Error("ENOENT") as NodeJS.ErrnoException;
        err.code = "ENOENT";
        throw err;
      }
      return files.get(p) as string;
    },
    writeFile: async (p: string, data: string) => {
      files.set(p, data);
    },
    mkdir: async () => undefined,
  },
}));

import { upsertDocument, getUserDocuments, removeDocument } from "@/services/database/documents";

const A = "alice@example.com";
const B = "bob@example.com";

const doc = (id: string, title: string) => ({
  id,
  title,
  updatedAt: 1,
  data: { any: "shape" },
});

beforeEach(() => {
  files.clear();
});

describe("document store isolation", () => {
  it("does not return one user's documents to another", async () => {
    await upsertDocument(A, "resumes", doc("a1", "Alice resume"));
    await upsertDocument(B, "resumes", doc("b1", "Bob resume"));

    const aDocs = await getUserDocuments(A);
    const bDocs = await getUserDocuments(B);

    expect(aDocs.resumes.map((r) => r.id)).toEqual(["a1"]);
    expect(bDocs.resumes.map((r) => r.id)).toEqual(["b1"]);
    // Bob can never see Alice's document.
    expect(bDocs.resumes.some((r) => r.id === "a1")).toBe(false);
  });

  it("a delete by one user leaves another user's documents intact", async () => {
    await upsertDocument(A, "resumes", doc("a1", "Alice resume"));
    await upsertDocument(B, "resumes", doc("b1", "Bob resume"));

    // Bob tries to remove an id that belongs to Alice - must be a no-op for Alice.
    await removeDocument(B, "resumes", "a1");

    const aDocs = await getUserDocuments(A);
    expect(aDocs.resumes.map((r) => r.id)).toEqual(["a1"]);
  });

  it("returns empty buckets for a user with no documents", async () => {
    const docs = await getUserDocuments("nobody@example.com");
    expect(docs).toEqual({
      resumes: [],
      coverLetters: [],
      resignationLetters: [],
      interviewPrep: [],
    });
  });

  it("treats email case/whitespace as the same owner (no leak via casing)", async () => {
    await upsertDocument(A, "resumes", doc("a1", "Alice resume"));
    const docs = await getUserDocuments("  ALICE@example.com  ");
    expect(docs.resumes.map((r) => r.id)).toEqual(["a1"]);
  });
});
