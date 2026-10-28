// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Concurrent-save safety for the document store.
 *
 * The defect this locks down: two tabs with the same resume open both save, and
 * the second save silently destroys the first tab's edit. It is not caught by
 * comparing timestamps, because the second save genuinely IS newer - it was
 * just composed from content that predates the first edit. The guard has to
 * compare against the version the editor LOADED (`baseUpdatedAt`), not against
 * the version it is writing.
 *
 * Runs against the file backend (DATABASE_URL is unset in tests) with an
 * in-memory fs mock, so it never touches the real .data/ files.
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

import {
  upsertDocument,
  getUserDocuments,
} from "@/services/database/documents";

const USER = "alice@example.com";

const doc = (updatedAt: number, title: string) => ({
  id: "resume-1",
  title,
  updatedAt,
  data: { title },
});

/** The stored title for the single resume under test. */
async function storedTitle(): Promise<string | undefined> {
  const docs = await getUserDocuments(USER);
  return docs.resumes.find((r) => r.id === "resume-1")?.title;
}

beforeEach(() => files.clear());

describe("compare-and-swap writes (baseUpdatedAt supplied)", () => {
  it("reproduces the two-tab case: the stale write is refused, the first edit survives", async () => {
    // Both tabs load the same document at version 100.
    await upsertDocument(USER, "resumes", doc(100, "original"));

    // Tab A edits the summary and saves. Its write is based on v100.
    const a = await upsertDocument(USER, "resumes", doc(200, "tab-A-edit"), {
      baseUpdatedAt: 100,
    });
    expect(a.ok).toBe(true);

    // Tab B now saves. Its timestamp (300) is NEWER than A's, so a timestamp
    // comparison would accept it - but it is still based on v100, which is no
    // longer what is stored. This is the exact write that used to destroy A's
    // work with no warning.
    const b = await upsertDocument(USER, "resumes", doc(300, "tab-B-edit"), {
      baseUpdatedAt: 100,
    });

    expect(b.ok).toBe(false);
    if (!b.ok) {
      expect(b.reason).toBe("stale");
      expect(b.storedUpdatedAt).toBe(200);
    }
    // A's edit is intact. Before the fix this read "tab-B-edit".
    expect(await storedTitle()).toBe("tab-A-edit");
  });

  it("accepts a write whose base is still current", async () => {
    await upsertDocument(USER, "resumes", doc(100, "original"));
    const r = await upsertDocument(USER, "resumes", doc(200, "next"), {
      baseUpdatedAt: 100,
    });
    expect(r.ok).toBe(true);
    expect(await storedTitle()).toBe("next");
  });

  it("lets a tab save repeatedly as long as it tracks the new base each time", async () => {
    await upsertDocument(USER, "resumes", doc(100, "v1"));
    expect(
      (await upsertDocument(USER, "resumes", doc(200, "v2"), { baseUpdatedAt: 100 })).ok
    ).toBe(true);
    expect(
      (await upsertDocument(USER, "resumes", doc(300, "v3"), { baseUpdatedAt: 200 })).ok
    ).toBe(true);
    expect(await storedTitle()).toBe("v3");
  });

  it("creates a brand-new document even when a base is supplied", async () => {
    // Nothing stored yet, so there is no conflict to detect - a first save from
    // a client that always sends a base must not be refused.
    const r = await upsertDocument(USER, "resumes", doc(100, "first"), {
      baseUpdatedAt: 999,
    });
    expect(r.ok).toBe(true);
    expect(await storedTitle()).toBe("first");
  });
});

describe("monotonic guard (no baseUpdatedAt - older clients)", () => {
  it("rejects an out-of-order write, such as a delayed retry", async () => {
    await upsertDocument(USER, "resumes", doc(200, "newer"));
    const r = await upsertDocument(USER, "resumes", doc(100, "older-replay"));
    expect(r.ok).toBe(false);
    expect(await storedTitle()).toBe("newer");
  });

  it("accepts an idempotent retry carrying the same timestamp", async () => {
    await upsertDocument(USER, "resumes", doc(200, "v1"));
    const r = await upsertDocument(USER, "resumes", doc(200, "v1-retry"));
    expect(r.ok).toBe(true);
    expect(await storedTitle()).toBe("v1-retry");
  });

  it("accepts a newer write, preserving the previous default behaviour", async () => {
    await upsertDocument(USER, "resumes", doc(100, "v1"));
    const r = await upsertDocument(USER, "resumes", doc(200, "v2"));
    expect(r.ok).toBe(true);
    expect(await storedTitle()).toBe("v2");
  });

  it("cannot catch the two-tab case, which is why baseUpdatedAt exists", async () => {
    // Documenting the limitation deliberately: without a base, tab B's newer
    // timestamp is indistinguishable from a legitimate later edit.
    await upsertDocument(USER, "resumes", doc(100, "original"));
    await upsertDocument(USER, "resumes", doc(200, "tab-A-edit"));
    const b = await upsertDocument(USER, "resumes", doc(300, "tab-B-edit"));
    expect(b.ok).toBe(true);
    expect(await storedTitle()).toBe("tab-B-edit");
  });
});
