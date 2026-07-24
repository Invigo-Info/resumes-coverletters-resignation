import { describe, it, expect } from "vitest";
import {
  validateUploadFile,
  base64ExceedsLimit,
  MAX_UPLOAD_BYTES,
  FILE_TOO_LARGE_MESSAGE,
  NO_FILE_MESSAGE,
} from "./upload-validation";

/** Minimal File-shaped stub - the validator only reads `.size`. */
const fileOfSize = (size: number) => ({ size } as File);

describe("validateUploadFile", () => {
  it("rejects a missing file", () => {
    expect(validateUploadFile(null)).toEqual({ valid: false, message: NO_FILE_MESSAGE });
    expect(validateUploadFile(undefined)).toEqual({ valid: false, message: NO_FILE_MESSAGE });
  });
  it("accepts a file exactly at the decimal 10,000,000-byte cap", () => {
    expect(validateUploadFile(fileOfSize(MAX_UPLOAD_BYTES))).toEqual({ valid: true, message: "" });
  });
  it("rejects one byte over the cap", () => {
    expect(validateUploadFile(fileOfSize(MAX_UPLOAD_BYTES + 1))).toEqual({
      valid: false,
      message: FILE_TOO_LARGE_MESSAGE,
    });
  });
});

describe("base64ExceedsLimit", () => {
  it("is false for empty input", () => {
    expect(base64ExceedsLimit("")).toBe(false);
  });
  it("accounts for padding when decoding the byte length", () => {
    // "AAAA==" -> floor(6*3/4) - 2 = 2 bytes, well under the cap.
    expect(base64ExceedsLimit("AAAA==")).toBe(false);
  });
  it("is false at the 10,000,000-byte boundary and true just above", () => {
    // No padding, so bytes = floor(len * 3 / 4).
    const under = "A".repeat(13_333_332); // -> 9,999,999 bytes
    const over = "A".repeat(13_333_336); // -> 10,000,002 bytes
    expect(base64ExceedsLimit(under)).toBe(false);
    expect(base64ExceedsLimit(over)).toBe(true);
  });
});
