// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Per-user dismissed-jobs isolation - the same authorization invariant proven for
 * saved jobs. `/api/jobs/dismissed` derives the owner email from the verified
 * session, so isolation rests on the store scoping every read/write by email:
 * user B must never see user A's dismissed list, and a clear by one user must not
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

import {
  addDismissedJob,
  getDismissedJobs,
  removeDismissedJob,
  clearDismissedJobs,
} from "@/features/jobs/lib/dismissed";

const A = "alice@example.com";
const B = "bob@example.com";

beforeEach(() => {
  files.clear();
});

describe("dismissed-jobs store isolation", () => {
  it("does not return one user's dismissed jobs to another", async () => {
    await addDismissedJob(A, "a1", "not relevant", 1);
    await addDismissedJob(B, "b1", null, 1);

    const a = await getDismissedJobs(A);
    const b = await getDismissedJobs(B);

    expect(a.map((d) => d.jobId)).toEqual(["a1"]);
    expect(b.map((d) => d.jobId)).toEqual(["b1"]);
    expect(b.some((d) => d.jobId === "a1")).toBe(false);
  });

  it("stores and returns the reason (or null)", async () => {
    await addDismissedJob(A, "a1", "too senior", 1);
    await addDismissedJob(A, "a2", null, 1);
    const a = await getDismissedJobs(A);
    expect(a.find((d) => d.jobId === "a1")?.reason).toBe("too senior");
    expect(a.find((d) => d.jobId === "a2")?.reason).toBeNull();
  });

  it("clearing one user's dismissed jobs leaves another's intact", async () => {
    await addDismissedJob(A, "a1", null, 1);
    await addDismissedJob(B, "b1", null, 1);

    await clearDismissedJobs(B);

    expect((await getDismissedJobs(A)).map((d) => d.jobId)).toEqual(["a1"]);
    expect(await getDismissedJobs(B)).toEqual([]);
  });

  it("a remove by one user does not touch another's list", async () => {
    await addDismissedJob(A, "a1", null, 1);
    await addDismissedJob(B, "b1", null, 1);

    await removeDismissedJob(B, "a1"); // no-op for Alice

    expect((await getDismissedJobs(A)).map((d) => d.jobId)).toEqual(["a1"]);
  });

  it("treats email case/whitespace as the same owner (no leak via casing)", async () => {
    await addDismissedJob(A, "a1", null, 1);
    const a = await getDismissedJobs("  ALICE@example.com  ");
    expect(a.map((d) => d.jobId)).toEqual(["a1"]);
  });
});
