import { describe, it, expect } from "vitest";
import { hidesPhoto } from "@/validation/photo-policy";

describe("hidesPhoto", () => {
  it("hides for the US, UK, and Ireland", () => {
    expect(hidesPhoto("Dublin, Ireland")).toBe(true);
    expect(hidesPhoto("London, United Kingdom")).toBe(true);
    expect(hidesPhoto("New York, USA")).toBe(true);
    expect(hidesPhoto("Edinburgh, Scotland")).toBe(true);
    expect(hidesPhoto("england")).toBe(true);
  });
  it("does not false-match on substrings (whole-word only)", () => {
    expect(hidesPhoto("Irelandia")).toBe(false);
    expect(hidesPhoto("Ohio")).toBe(false);
    expect(hidesPhoto("Latin America")).toBe(false);
    expect(hidesPhoto("South America")).toBe(false);
  });
  it("shows the field for other regions and empty input", () => {
    expect(hidesPhoto("Berlin, Germany")).toBe(false);
    expect(hidesPhoto("Toronto, Canada")).toBe(false);
    expect(hidesPhoto("")).toBe(false);
  });
});
