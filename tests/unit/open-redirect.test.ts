// @vitest-environment node
import { describe, it, expect } from "vitest";
import { safeInternalPath } from "@/validation/url";

/**
 * `?next=` is carried through the payment flow and used as a redirect target
 * after checkout. It was validated with `value.startsWith("/")`, which accepts
 * several values a browser happily follows OFF-SITE.
 *
 * Why this one matters more than a typical open redirect: the landing point is
 * the moment immediately after someone has entered card details and is
 * expecting a confirmation page. A lookalike page there is about as good a
 * phishing position as exists.
 */
describe("safeInternalPath", () => {
  it("accepts ordinary internal paths", () => {
    expect(safeInternalPath("/")).toBe("/");
    expect(safeInternalPath("/dashboard")).toBe("/dashboard");
    expect(safeInternalPath("/resumes/123?tab=edit")).toBe(
      "/resumes/123?tab=edit"
    );
  });

  it("rejects a protocol-relative URL", () => {
    // The headline bug: this passes startsWith("/") and leaves the origin.
    expect(safeInternalPath("//evil.com")).toBe("");
    expect(safeInternalPath("//evil.com/pay")).toBe("");
  });

  it("rejects a backslash second separator", () => {
    // Browsers normalise backslashes to forward slashes, so these are
    // protocol-relative too - and they slip past a naive "//" check.
    expect(safeInternalPath("/\\evil.com")).toBe("");
    expect(safeInternalPath("/\\/evil.com")).toBe("");
  });

  it("rejects absolute URLs", () => {
    expect(safeInternalPath("https://evil.com")).toBe("");
    expect(safeInternalPath("javascript:alert(1)")).toBe("");
  });

  it("rejects values containing whitespace or control characters", () => {
    // A raw newline in a redirect target can split a response header. Built
    // with fromCharCode so no literal control byte sits in this source file.
    const NL = String.fromCharCode(10);
    const CR = String.fromCharCode(13);
    const TAB = String.fromCharCode(9);
    const NUL = String.fromCharCode(0);
    expect(safeInternalPath("/ok" + NL + "Location: https://evil.com")).toBe("");
    expect(safeInternalPath("/ok" + CR + NL + "Set-Cookie: a=b")).toBe("");
    expect(safeInternalPath("/path with space")).toBe("");
    expect(safeInternalPath("/a" + TAB + "b")).toBe("");
    expect(safeInternalPath("/a" + NUL + "b")).toBe("");
  });

  it("rejects non-strings and empty input", () => {
    expect(safeInternalPath(undefined)).toBe("");
    expect(safeInternalPath(null)).toBe("");
    expect(safeInternalPath(42)).toBe("");
    expect(safeInternalPath("")).toBe("");
  });

  it("still rejects a leading-whitespace bypass attempt", () => {
    // Trimmed first, so the check cannot be sidestepped with padding.
    expect(safeInternalPath("  //evil.com")).toBe("");
  });
});
