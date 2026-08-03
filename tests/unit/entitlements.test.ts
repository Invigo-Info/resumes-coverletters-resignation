import { describe, it, expect } from "vitest";
import { isPremiumStatus } from "@/permissions/entitlements";

describe("isPremiumStatus", () => {
  it("grants access for active and trialing", () => {
    expect(isPremiumStatus("active")).toBe(true);
    expect(isPremiumStatus("trialing")).toBe(true);
  });

  it("denies access for non-premium statuses", () => {
    for (const s of ["past_due", "canceled", "inactive", "unpaid", "incomplete"]) {
      expect(isPremiumStatus(s)).toBe(false);
    }
  });

  it("denies access for null/undefined/empty", () => {
    expect(isPremiumStatus(null)).toBe(false);
    expect(isPremiumStatus(undefined)).toBe(false);
    expect(isPremiumStatus("")).toBe(false);
  });
});
