// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { PersistedTailoringSession } from "@/features/jobs/tailoring/sessions";

/**
 * Per-user tailoring-session isolation - the same authorization invariant proven
 * for documents and saved jobs. `/api/tailoring/sessions` derives the owner email
 * from the verified session and passes it straight to these functions, so
 * isolation rests on the store scoping every read/write strictly by email: user B
 * must never read user A's sessions, and a remove by one user must not touch
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

import {
  upsertTailoringSession,
  getTailoringSessions,
  getTailoringSession,
  removeTailoringSession,
} from "@/features/jobs/tailoring/sessions";

const A = "alice@example.com";
const B = "bob@example.com";

const session = (
  id: string,
  updatedAt: number
): PersistedTailoringSession => ({
  id,
  resumeId: "r1",
  jobId: id.replace("tailor_", ""),
  updatedAt,
  currentScore: 42,
});

beforeEach(() => {
  files.clear();
});

describe("tailoring-session store isolation", () => {
  it("does not return one user's sessions to another", async () => {
    await upsertTailoringSession(A, session("tailor_a1", 1));
    await upsertTailoringSession(B, session("tailor_b1", 1));

    const a = await getTailoringSessions(A);
    const b = await getTailoringSessions(B);

    expect(a.map((s) => s.id)).toEqual(["tailor_a1"]);
    expect(b.map((s) => s.id)).toEqual(["tailor_b1"]);
    expect(b.some((s) => s.id === "tailor_a1")).toBe(false);
  });

  it("getTailoringSession does not leak another user's session by id", async () => {
    await upsertTailoringSession(A, session("tailor_a1", 1));
    // Bob asks for Alice's session id - must be null for Bob.
    expect(await getTailoringSession(B, "tailor_a1")).toBeNull();
    expect(await getTailoringSession(A, "tailor_a1")).not.toBeNull();
  });

  it("a remove by one user leaves another user's sessions intact", async () => {
    await upsertTailoringSession(A, session("tailor_a1", 1));
    await upsertTailoringSession(B, session("tailor_b1", 1));

    await removeTailoringSession(B, "tailor_a1"); // no-op for Alice

    const a = await getTailoringSessions(A);
    expect(a.map((s) => s.id)).toEqual(["tailor_a1"]);
  });

  it("upserts by id (newest snapshot wins, no duplicates) and orders newest-first", async () => {
    await upsertTailoringSession(A, session("tailor_a1", 1));
    await upsertTailoringSession(A, session("tailor_a2", 2));
    await upsertTailoringSession(A, { ...session("tailor_a1", 3), currentScore: 90 });

    const a = await getTailoringSessions(A);
    expect(a.map((s) => s.id)).toEqual(["tailor_a1", "tailor_a2"]);
    expect(a[0].currentScore).toBe(90);
  });

  it("treats email case/whitespace as the same owner (no leak via casing)", async () => {
    await upsertTailoringSession(A, session("tailor_a1", 1));
    const a = await getTailoringSessions("  ALICE@example.com  ");
    expect(a.map((s) => s.id)).toEqual(["tailor_a1"]);
  });
});
