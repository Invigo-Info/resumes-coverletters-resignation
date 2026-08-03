import { describe, it, expect } from "vitest";
import {
  aiBodySchema,
  AI_TASKS,
  registerBodySchema,
  passwordSchema,
  savedJobBodySchema,
} from "@/validation/schemas";

describe("aiBodySchema", () => {
  it("accepts a known task with a payload object", () => {
    const r = aiBodySchema.safeParse({ task: "summary", payload: {} });
    expect(r.success).toBe(true);
  });

  it("accepts every declared task", () => {
    for (const task of AI_TASKS) {
      expect(aiBodySchema.safeParse({ task, payload: {} }).success).toBe(true);
    }
  });

  it("rejects an unknown task", () => {
    const r = aiBodySchema.safeParse({ task: "notARealTask", payload: {} });
    expect(r.success).toBe(false);
  });

  it("rejects a missing payload", () => {
    expect(aiBodySchema.safeParse({ task: "summary" }).success).toBe(false);
  });

  it("rejects a non-object body", () => {
    expect(aiBodySchema.safeParse("nope").success).toBe(false);
    expect(aiBodySchema.safeParse(null).success).toBe(false);
  });
});

describe("passwordSchema", () => {
  it("accepts a reasonable password", () => {
    expect(passwordSchema.safeParse("correcthorse").success).toBe(true);
  });

  it("rejects passwords under 8 characters", () => {
    expect(passwordSchema.safeParse("short7!").success).toBe(false);
  });

  it("rejects common weak passwords (case-insensitive)", () => {
    expect(passwordSchema.safeParse("password").success).toBe(false);
    expect(passwordSchema.safeParse("Password123").success).toBe(false);
    expect(passwordSchema.safeParse("12345678").success).toBe(false);
  });

  it("does not impose composition rules (password-manager friendly)", () => {
    // A long all-lowercase passphrase with no symbols must pass - no forced
    // mixed-case / symbol rule (WCAG 3.3.8).
    expect(passwordSchema.safeParse("thisisalongpassphrase").success).toBe(true);
  });
});

describe("registerBodySchema", () => {
  it("accepts a valid registration", () => {
    const r = registerBodySchema.safeParse({
      email: "person@example.com",
      password: "a-good-password",
      name: "Person",
    });
    expect(r.success).toBe(true);
  });

  it("trims and validates the email shape", () => {
    expect(
      registerBodySchema.safeParse({
        email: "  someone@example.com  ",
        password: "a-good-password",
      }).success
    ).toBe(true);
    expect(
      registerBodySchema.safeParse({
        email: "not-an-email",
        password: "a-good-password",
      }).success
    ).toBe(false);
  });

  it("rejects a password equal to the email or its local part", () => {
    expect(
      registerBodySchema.safeParse({
        email: "jordan@example.com",
        password: "jordan@example.com",
      }).success
    ).toBe(false);
    expect(
      registerBodySchema.safeParse({
        email: "jordan@example.com",
        password: "jordan",
      }).success
    ).toBe(false);
  });

  it("makes name optional", () => {
    expect(
      registerBodySchema.safeParse({
        email: "person@example.com",
        password: "a-good-password",
      }).success
    ).toBe(true);
  });
});

describe("savedJobBodySchema", () => {
  it("requires a job with a non-empty id and keeps extra fields", () => {
    const r = savedJobBodySchema.safeParse({
      job: { id: "j1", title: "Engineer", company: "Acme", extra: "kept" },
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect((r.data.job as Record<string, unknown>).extra).toBe("kept");
    }
  });

  it("rejects a job with an empty id", () => {
    expect(
      savedJobBodySchema.safeParse({ job: { id: "", title: "x", company: "y" } })
        .success
    ).toBe(false);
  });
});
