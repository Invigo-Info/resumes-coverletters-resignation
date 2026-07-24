import { describe, it, expect } from "vitest";
import { titleCase } from "./title-case";

describe("titleCase", () => {
  it("capitalizes each space-separated word", () => {
    expect(titleCase("sales manager")).toBe("Sales Manager");
    expect(titleCase("harvard university")).toBe("Harvard University");
  });
  it("treats hyphens and slashes as word boundaries", () => {
    expect(titleCase("new hampshire-main")).toBe("New Hampshire-Main");
    expect(titleCase("ui/ux")).toBe("Ui/Ux");
  });
  it("leaves already-capitalized letters alone", () => {
    expect(titleCase("UI/UX")).toBe("UI/UX");
  });
});
