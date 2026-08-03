import { describe, it, expect } from "vitest";
import type { ResumeState } from "@/features/resume-builder/store/resume-store";
import {
  getProgress,
  getProgressItems,
  getImproveSuggestions,
  BASE_PROGRESS,
} from "@/features/resume-builder/store/resume-store";

/**
 * The progress functions read only a subset of ResumeState (personal, contact,
 * employment, skills, education, summary), so fixtures set just those and cast.
 */
type ProgressInput = {
  personal: { firstName: string; lastName: string; jobTitle: string };
  contact: { email: string };
  employment: { jobTitle: string; company: string; description: string }[];
  skills: { name: string }[];
  education: { institution: string; degree: string }[];
  summary: string;
};

const empty: ProgressInput = {
  personal: { firstName: "", lastName: "", jobTitle: "" },
  contact: { email: "" },
  employment: [],
  skills: [],
  education: [],
  summary: "",
};

const complete: ProgressInput = {
  personal: { firstName: "Ada", lastName: "Lovelace", jobTitle: "Engineer" },
  contact: { email: "ada@example.com" },
  employment: [{ jobTitle: "Dev", company: "Acme", description: "<p>Shipped things</p>" }],
  skills: [{ name: "TypeScript" }, { name: "React" }, { name: "SQL" }],
  education: [{ institution: "MIT", degree: "BSc" }],
  summary: "<p>Seasoned engineer.</p>",
};

const state = (o: ProgressInput) => o as unknown as ResumeState;

describe("getProgressItems", () => {
  it("has 12 items whose earnable weights sum to 88", () => {
    const items = getProgressItems(state(empty));
    expect(items).toHaveLength(12);
    const total = items.reduce((acc, i) => acc + i.weight, 0);
    expect(total).toBe(88);
  });
  it("treats an HTML-only summary as not done", () => {
    const items = getProgressItems(state({ ...empty, summary: "<p></p>" }));
    expect(items.find((i) => i.key === "summary")?.done).toBe(false);
  });
});

describe("getProgress", () => {
  it("is the base 12 for an empty resume", () => {
    expect(getProgress(state(empty))).toBe(BASE_PROGRESS);
    expect(getProgress(state(empty))).toBe(12);
  });
  it("is exactly 100 for a fully completed resume", () => {
    expect(getProgress(state(complete))).toBe(100);
  });
  it("drops the summary's 12 points when the summary is removed", () => {
    const withoutSummary = getProgress(state({ ...complete, summary: "" }));
    expect(withoutSummary).toBe(88);
  });
  it("counts the first skill more than the third", () => {
    const one = getProgress(state({ ...empty, skills: [{ name: "A" }] }));
    const three = getProgress(
      state({ ...empty, skills: [{ name: "A" }, { name: "B" }, { name: "C" }] })
    );
    expect(one).toBe(12 + 6); // skill1 weight
    expect(three).toBe(12 + 6 + 4 + 2); // skill1 + skill2 + skill3
  });
});

describe("getImproveSuggestions", () => {
  it("suggests the core empty fields with their weights", () => {
    const s = getImproveSuggestions(state(empty));
    expect(s.find((x) => x.key === "firstName")).toMatchObject({ weight: 8, target: "personal" });
    expect(s.find((x) => x.key === "email")).toMatchObject({ weight: 12, target: "contact" });
    // No employment at all -> the full 12-point "add work experience".
    expect(s.find((x) => x.key === "employment")).toMatchObject({ weight: 12 });
  });
  it("stages employment down to 8 once title+company exist but no description", () => {
    const s = getImproveSuggestions(
      state({
        ...empty,
        employment: [{ jobTitle: "Dev", company: "Acme", description: "" }],
      })
    );
    expect(s.find((x) => x.key === "employment")).toMatchObject({ weight: 8 });
  });
});
