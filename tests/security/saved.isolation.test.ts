// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { JobPosting } from "@/features/jobs/lib/job-search";

/**
 * Per-user saved-jobs isolation - the same authorization invariant proven for
 * documents. `/api/jobs/saved` derives the owner email from the verified session
 * and passes it straight to these functions, so isolation rests on the store
 * scoping every read/write strictly by email. This test locks that: user B must
 * never see user A's saved jobs, and a remove by one user must not touch
 * another's.
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

import { addSavedJob, getSavedJobs, removeSavedJob } from "@/features/jobs/lib/saved";

const A = "alice@example.com";
const B = "bob@example.com";

const job = (id: string, title: string): JobPosting =>
  ({ id, title, company: "Acme" }) as JobPosting;

beforeEach(() => {
  files.clear();
});

describe("saved-jobs store isolation", () => {
  it("does not return one user's saved jobs to another", async () => {
    await addSavedJob(A, job("a1", "Alice job"), 1);
    await addSavedJob(B, job("b1", "Bob job"), 1);

    const a = await getSavedJobs(A);
    const b = await getSavedJobs(B);

    expect(a.map((s) => s.job.id)).toEqual(["a1"]);
    expect(b.map((s) => s.job.id)).toEqual(["b1"]);
    expect(b.some((s) => s.job.id === "a1")).toBe(false);
  });

  it("a remove by one user leaves another user's saved jobs intact", async () => {
    await addSavedJob(A, job("a1", "Alice job"), 1);
    await addSavedJob(B, job("b1", "Bob job"), 1);

    // Bob removes an id that belongs to Alice - must be a no-op for Alice.
    await removeSavedJob(B, "a1");

    const a = await getSavedJobs(A);
    expect(a.map((s) => s.job.id)).toEqual(["a1"]);
  });

  it("returns newest-first and upserts by job id", async () => {
    await addSavedJob(A, job("a1", "Older"), 1);
    await addSavedJob(A, job("a2", "Newer"), 2);
    // Re-saving a1 updates it in place (no duplicate) with a newer timestamp.
    await addSavedJob(A, job("a1", "Older, re-saved"), 3);

    const a = await getSavedJobs(A);
    expect(a.map((s) => s.job.id)).toEqual(["a1", "a2"]);
    expect(a[0].job.title).toBe("Older, re-saved");
  });

  it("returns an empty list for a user with no saved jobs", async () => {
    expect(await getSavedJobs("nobody@example.com")).toEqual([]);
  });

  it("treats email case/whitespace as the same owner (no leak via casing)", async () => {
    await addSavedJob(A, job("a1", "Alice job"), 1);
    const a = await getSavedJobs("  ALICE@example.com  ");
    expect(a.map((s) => s.job.id)).toEqual(["a1"]);
  });
});
