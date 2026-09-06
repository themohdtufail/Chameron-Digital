import { describe, it, expect } from "vitest";
import { slugify, formatCurrency, haversineDistanceKm, formatDistance, isWithinBusinessHours, generateOrderNumber } from "@/lib/utils";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Jafson Jammu")).toBe("jafson-jammu");
  });

  it("strips punctuation and collapses whitespace runs", () => {
    expect(slugify("Men's  Winter Wear!!")).toBe("men-s-winter-wear");
  });

  it("trims leading/trailing hyphens", () => {
    expect(slugify("  -Hello World-  ")).toBe("hello-world");
  });
});

describe("formatCurrency", () => {
  it("formats as INR with no decimal places", () => {
    expect(formatCurrency(1999)).toBe("₹1,999");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("₹0");
  });
});

describe("haversineDistanceKm", () => {
  it("returns ~0 for the same point", () => {
    const point = { latitude: 32.7266, longitude: 74.857 };
    expect(haversineDistanceKm(point, point)).toBeCloseTo(0, 5);
  });

  it("returns a plausible distance between two Jammu-area points", () => {
    const a = { latitude: 32.7266, longitude: 74.857 };
    const b = { latitude: 32.719, longitude: 74.864 };
    const km = haversineDistanceKm(a, b);
    expect(km).toBeGreaterThan(0);
    expect(km).toBeLessThan(5);
  });
});

describe("formatDistance", () => {
  it("shows meters under 1km", () => {
    expect(formatDistance(0.35)).toBe("350 m away");
  });

  it("shows one decimal of km at or above 1km", () => {
    expect(formatDistance(2.456)).toBe("2.5 km away");
  });
});

describe("isWithinBusinessHours", () => {
  it("is true for a time inside a normal same-day window", () => {
    const now = new Date("2026-01-01T14:00:00");
    expect(isWithinBusinessHours("09:00", "21:00", now)).toBe(true);
  });

  it("is false for a time before opening", () => {
    const now = new Date("2026-01-01T07:00:00");
    expect(isWithinBusinessHours("09:00", "21:00", now)).toBe(false);
  });

  it("is false for a time at or after closing", () => {
    const now = new Date("2026-01-01T21:00:00");
    expect(isWithinBusinessHours("09:00", "21:00", now)).toBe(false);
  });

  it("handles an overnight window that wraps past midnight", () => {
    expect(isWithinBusinessHours("20:00", "02:00", new Date("2026-01-01T23:00:00"))).toBe(true);
    expect(isWithinBusinessHours("20:00", "02:00", new Date("2026-01-01T01:00:00"))).toBe(true);
    expect(isWithinBusinessHours("20:00", "02:00", new Date("2026-01-01T12:00:00"))).toBe(false);
  });
});

describe("generateOrderNumber", () => {
  it("always starts with the CD- prefix", () => {
    expect(generateOrderNumber()).toMatch(/^CD-\d+$/);
  });

  it("produces different values across calls", () => {
    const seen = new Set(Array.from({ length: 20 }, () => generateOrderNumber()));
    expect(seen.size).toBeGreaterThan(1);
  });
});
