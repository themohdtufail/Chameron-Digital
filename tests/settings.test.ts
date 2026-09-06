import { describe, it, expect } from "vitest";
import { SETTINGS_CATALOG } from "@/lib/settings";
import { FEATURE_FLAG_CATALOG } from "@/lib/feature-flags";

describe("SETTINGS_CATALOG", () => {
  it("has a unique key per setting", () => {
    const keys = SETTINGS_CATALOG.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("gives every setting a non-empty default value", () => {
    for (const s of SETTINGS_CATALOG) {
      expect(s.default.length).toBeGreaterThan(0);
    }
  });
});

describe("FEATURE_FLAG_CATALOG", () => {
  it("has a unique key per flag", () => {
    const keys = FEATURE_FLAG_CATALOG.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
