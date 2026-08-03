import { describe, it, expect } from "vitest";
import {
  emailError,
  emailHint,
  detectCountry,
  sanitizePhone,
  formatPhone,
  phoneError,
  isLinkedInProfile,
} from "@/validation/contact-validate";

describe("emailError", () => {
  it("accepts empty (email is optional)", () => {
    expect(emailError("")).toBe("");
    expect(emailError("   ")).toBe("");
  });
  it("flags a missing @", () => {
    expect(emailError("johndoe")).toBe("Email must include an @ sign.");
  });
  it("flags a domain with no TLD", () => {
    expect(emailError("john@gmail")).toBe("Enter a valid email, like john.doe@gmail.com.");
  });
  it("rejects a 1-letter TLD", () => {
    expect(emailError("a@b.c")).not.toBe("");
  });
  it("accepts a normal address", () => {
    expect(emailError("john.doe@gmail.com")).toBe("");
    expect(emailError("a@b.co")).toBe("");
  });
});

describe("emailHint", () => {
  it("nudges on casual domains (case-insensitive)", () => {
    expect(emailHint("john@yahoo.com")).not.toBe("");
    expect(emailHint("john@HOTMAIL.COM")).not.toBe("");
  });
  it("stays quiet for professional / unknown domains", () => {
    expect(emailHint("john@company.com")).toBe("");
    expect(emailHint("john@gmail.com")).toBe("");
    expect(emailHint("john")).toBe("");
  });
});

describe("detectCountry", () => {
  it("detects US/Canada", () => {
    expect(detectCountry("+13052062368")).toEqual({ code: "+1", name: "US / Canada" });
  });
  it("does not let +1 shadow +91", () => {
    expect(detectCountry("+919876543210")).toEqual({ code: "+91", name: "India" });
  });
  it("returns null for an unknown code", () => {
    expect(detectCountry("+9991234567")).toBeNull();
  });
});

describe("sanitizePhone", () => {
  it("keeps a single leading + and strips the rest", () => {
    expect(sanitizePhone(" +1 (305) 206-2368 ")).toBe("+13052062368");
    expect(sanitizePhone("305.206.2368")).toBe("3052062368");
  });
});

describe("formatPhone", () => {
  it("groups a known country code", () => {
    expect(formatPhone("+13052062368")).toBe("+1 305 206 2368");
    expect(formatPhone("+919876543210")).toBe("+91 98765 43210");
  });
  it("leaves a number with no + untouched", () => {
    expect(formatPhone("3052062368")).toBe("3052062368");
  });
});

describe("phoneError", () => {
  it("accepts empty", () => {
    expect(phoneError("")).toBe("");
  });
  it("rejects too-short (< 7 digits)", () => {
    expect(phoneError("12345")).toBe("That number looks too short. Include the area code.");
  });
  it("rejects too-long (> 15 digits)", () => {
    expect(phoneError("+1234567890123456")).toBe(
      "That number is too long. Phone numbers hold at most 15 digits."
    );
  });
  it("rejects an unrecognised country code", () => {
    expect(phoneError("+9991234567")).toBe(
      "We don't recognise that country code. Check the digits after the plus sign."
    );
  });
  it("accepts a valid international and a valid local number", () => {
    expect(phoneError("+13052062368")).toBe("");
    expect(phoneError("3052062368")).toBe("");
  });
});

describe("isLinkedInProfile", () => {
  it("matches full and bare profile URLs", () => {
    expect(isLinkedInProfile("linkedin.com/in/john")).toBe(true);
    expect(isLinkedInProfile("https://www.linkedin.com/in/john-doe")).toBe(true);
    expect(isLinkedInProfile("linkedin.com/pub/jane")).toBe(true);
  });
  it("rejects non-profile and empty values", () => {
    expect(isLinkedInProfile("linkedin.com/company/foo")).toBe(false);
    expect(isLinkedInProfile("google.com")).toBe(false);
    expect(isLinkedInProfile("")).toBe(false);
  });
});
