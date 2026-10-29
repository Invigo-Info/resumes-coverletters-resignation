// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Account erasure must actually erase.
 *
 * The defect this locks down: deleting an account removed the `users` row and
 * nothing else, leaving documents, saved jobs, dismissed jobs and tailoring
 * sessions behind forever - while the API reported success. The code carried a
 * comment claiming an ON DELETE CASCADE handled documents; schema.sql
 * explicitly DROPS that constraint, so no cascade has ever existed.
 *
 * The worst case was an OAuth account: Google users have no `users` row at all,
 * so deletion touched nothing whatsoever and still returned ok.
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

import { deleteAccount } from "@/services/database/account";
import {
  upsertDocument,
  getUserDocuments,
} from "@/services/database/documents";
import { addSavedJob, getSavedJobs } from "@/features/jobs/lib/saved";
import {
  addDismissedJob,
  getDismissedJobs,
} from "@/features/jobs/lib/dismissed";
import {
  upsertTailoringSession,
  getTailoringSessions,
} from "@/features/jobs/tailoring/sessions";
import { createUser, findUserByEmail } from "@/services/database/users";

const VICTIM = "alice@example.com";
const BYSTANDER = "bob@example.com";

/** Populate every per-user store for one account. */
async function seed(email: string): Promise<void> {
  await upsertDocument(email, "resumes", {
    id: `${email}-r1`,
    title: "Resume",
    updatedAt: 1,
    data: { who: email },
  });
  await upsertDocument(email, "coverLetters", {
    id: `${email}-c1`,
    title: "Letter",
    updatedAt: 1,
    data: { who: email },
  });
  await addSavedJob(
    email,
    { id: `${email}-job`, title: "Dev" } as never,
    1
  );
  await addDismissedJob(email, `${email}-skip`, "too junior", 1);
  await upsertTailoringSession(email, {
    id: `tailor_${email}`,
    resumeId: "r1",
    jobId: "j1",
    updatedAt: 1,
  } as never);
}

/** Every store, reduced to a count, so "nothing remains" is one assertion. */
async function footprint(email: string): Promise<Record<string, number>> {
  const docs = await getUserDocuments(email);
  return {
    resumes: docs.resumes.length,
    coverLetters: docs.coverLetters.length,
    savedJobs: (await getSavedJobs(email)).length,
    dismissedJobs: (await getDismissedJobs(email)).length,
    tailoringSessions: (await getTailoringSessions(email)).length,
  };
}

beforeEach(() => files.clear());

describe("deleteAccount", () => {
  it("erases every per-user store, not just the users row", async () => {
    await createUser(VICTIM, "pw-long-enough", "Alice");
    await seed(VICTIM);

    // Precondition: the account really does have data everywhere.
    expect(await footprint(VICTIM)).toEqual({
      resumes: 1,
      coverLetters: 1,
      savedJobs: 1,
      dismissedJobs: 1,
      tailoringSessions: 1,
    });

    const result = await deleteAccount(VICTIM);
    expect(result.failed).toEqual([]);

    // Everything is gone. Before the fix only the users row went.
    expect(await footprint(VICTIM)).toEqual({
      resumes: 0,
      coverLetters: 0,
      savedJobs: 0,
      dismissedJobs: 0,
      tailoringSessions: 0,
    });
    expect(await findUserByEmail(VICTIM)).toBeUndefined();
  });

  it("erases an OAuth account that never had a users row", async () => {
    // A Google user authenticates without createUser() ever running, so there
    // is no users row to delete. Deletion used to touch nothing at all here and
    // still report success.
    await seed(VICTIM);
    expect(await findUserByEmail(VICTIM)).toBeUndefined(); // no users row

    const result = await deleteAccount(VICTIM);
    expect(result.failed).toEqual([]);

    expect(await footprint(VICTIM)).toEqual({
      resumes: 0,
      coverLetters: 0,
      savedJobs: 0,
      dismissedJobs: 0,
      tailoringSessions: 0,
    });
  });

  it("leaves other accounts completely untouched", async () => {
    await createUser(VICTIM, "pw-long-enough", "Alice");
    await createUser(BYSTANDER, "pw-long-enough", "Bob");
    await seed(VICTIM);
    await seed(BYSTANDER);

    await deleteAccount(VICTIM);

    expect(await footprint(BYSTANDER)).toEqual({
      resumes: 1,
      coverLetters: 1,
      savedJobs: 1,
      dismissedJobs: 1,
      tailoringSessions: 1,
    });
    expect(await findUserByEmail(BYSTANDER)).toBeDefined();
  });

  it("normalises the email, so case variants erase the same account", async () => {
    await createUser(VICTIM, "pw-long-enough", "Alice");
    await seed(VICTIM);

    await deleteAccount("ALICE@Example.COM  ");

    expect(await footprint(VICTIM)).toEqual({
      resumes: 0,
      coverLetters: 0,
      savedJobs: 0,
      dismissedJobs: 0,
      tailoringSessions: 0,
    });
  });

  it("is idempotent - erasing an account twice is not an error", async () => {
    await createUser(VICTIM, "pw-long-enough", "Alice");
    await seed(VICTIM);

    expect((await deleteAccount(VICTIM)).failed).toEqual([]);
    expect((await deleteAccount(VICTIM)).failed).toEqual([]);
  });

  it("erases an account that has no data at all", async () => {
    await createUser(VICTIM, "pw-long-enough", "Alice");
    const result = await deleteAccount(VICTIM);
    expect(result.failed).toEqual([]);
    expect(await findUserByEmail(VICTIM)).toBeUndefined();
  });

  it("reports which stores failed instead of claiming success", async () => {
    await createUser(VICTIM, "pw-long-enough", "Alice");
    await seed(VICTIM);

    // Make the documents file unwritable mid-erasure.
    const fsMod = (await import("fs")) as unknown as {
      promises: { writeFile: (p: string, d: string) => Promise<void> };
    };
    const realWrite = fsMod.promises.writeFile;
    fsMod.promises.writeFile = async (p: string, d: string) => {
      if (p.includes("documents.json")) throw new Error("disk full");
      return realWrite(p, d);
    };

    try {
      const result = await deleteAccount(VICTIM);
      expect(result.failed.map((f) => f.store)).toContain("documents");
      // The other stores still got purged - one failure must not strand them.
      expect(result.deleted).toContain("savedJobs");
      expect(result.deleted).toContain("user");
    } finally {
      fsMod.promises.writeFile = realWrite;
    }
  });
});
