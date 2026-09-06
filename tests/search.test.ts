import { describe, it, expect } from "vitest";
import { computeSearchRank } from "@/lib/search";

describe("computeSearchRank", () => {
  it("ranks an exact match best", () => {
    expect(computeSearchRank("Jafson Jammu", "Jafson Jammu")).toBe(0);
    expect(computeSearchRank("jafson jammu", "JAFSON JAMMU")).toBe(0);
  });

  it("ranks a starts-with match second", () => {
    expect(computeSearchRank("Jafson Jammu Store", "Jafson")).toBe(1);
  });

  it("ranks a whole-word match third", () => {
    expect(computeSearchRank("Spice Junction Jammu", "Jammu")).toBe(2);
  });

  it("ranks a mere substring match last", () => {
    expect(computeSearchRank("Chameron Digital", "meron")).toBe(3);
  });

  it("treats an empty query as the worst rank", () => {
    expect(computeSearchRank("Anything", "")).toBe(3);
  });

  it("doesn't choke on regex special characters in the query", () => {
    expect(() => computeSearchRank("Store (New)", "(New)")).not.toThrow();
    expect(computeSearchRank("Store (New)", "(New)")).toBeGreaterThanOrEqual(0);
  });
});
