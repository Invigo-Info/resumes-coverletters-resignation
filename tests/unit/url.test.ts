import { describe, it, expect } from "vitest";
import { normalizeUrl, displayUrl, urlError } from "@/validation/url";

describe("normalizeUrl", () => {
  it("returns empty for empty input", () => {
    expect(normalizeUrl("")).toBe("");
    expect(normalizeUrl("   ")).toBe("");
  });
  it("prefixes https:// on a bare host", () => {
    expect(normalizeUrl("linkedin.com/in/jhon")).toBe("https://linkedin.com/in/jhon");
  });
  it("leaves an explicit protocol untouched", () => {
    expect(normalizeUrl("http://x.com")).toBe("http://x.com");
    expect(normalizeUrl("https://x.com")).toBe("https://x.com");
  });
});

describe("displayUrl", () => {
  it("strips protocol, www., and trailing slash", () => {
    expect(displayUrl("https://www.linkedin.com")).toBe("linkedin.com");
    expect(displayUrl("https://linkedin.com/in/jhon/")).toBe("linkedin.com/in/jhon");
  });
});

describe("urlError", () => {
  it("accepts empty (links are optional)", () => {
    expect(urlError("")).toBe("");
  });
  it("rejects spaces", () => {
    expect(urlError("has space.com")).toBe("A link can't contain spaces.");
  });
  it("requires a dotted host", () => {
    expect(urlError("nodot")).toBe("Enter a full link, like linkedin.com/in/you.");
  });
  it("accepts a well-formed link", () => {
    expect(urlError("linkedin.com/in/you")).toBe("");
  });
});
