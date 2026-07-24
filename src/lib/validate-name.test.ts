import { describe, it, expect } from "vitest";
import { nameError, sanitizeName } from "./validate-name";

describe("nameError", () => {
  it("requires a value", () => {
    expect(nameError("", "First name")).toBe("First name is required.");
    expect(nameError("   ", "Last name")).toBe("Last name is required.");
  });
  it("accepts real names with joiners", () => {
    expect(nameError("O'Brien", "Last name")).toBe("");
    expect(nameError("Jean-Luc", "First name")).toBe("");
    expect(nameError("Ana Maria", "First name")).toBe("");
    expect(nameError("Zoe", "First name")).toBe("");
  });
  it("rejects digits and symbols with the character message", () => {
    expect(nameError("John3", "First name")).toBe(
      "First name can only contain letters, spaces, hyphens, and apostrophes."
    );
    expect(nameError("A@B", "Last name")).toBe(
      "Last name can only contain letters, spaces, hyphens, and apostrophes."
    );
  });
});

describe("sanitizeName", () => {
  it("strips characters a name can never contain", () => {
    expect(sanitizeName("John3!")).toBe("John");
    expect(sanitizeName("O'Brien-Smith")).toBe("O'Brien-Smith");
    expect(sanitizeName("Ana Maria")).toBe("Ana Maria");
  });
});
