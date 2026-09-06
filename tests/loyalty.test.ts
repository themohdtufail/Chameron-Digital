import { describe, it, expect } from "vitest";
import { computeEarnedPoints, computeRedemptionDiscount, RUPEES_PER_POINT_EARNED } from "@/lib/loyalty";

describe("computeEarnedPoints", () => {
  it("earns 1 point per configured rupee threshold", () => {
    expect(computeEarnedPoints(RUPEES_PER_POINT_EARNED)).toBe(1);
    expect(computeEarnedPoints(RUPEES_PER_POINT_EARNED * 5)).toBe(5);
  });

  it("floors partial points rather than rounding up", () => {
    expect(computeEarnedPoints(RUPEES_PER_POINT_EARNED * 1.9)).toBe(1);
  });

  it("earns zero points below the threshold", () => {
    expect(computeEarnedPoints(RUPEES_PER_POINT_EARNED - 1)).toBe(0);
  });

  it("earns zero points for a zero-value order", () => {
    expect(computeEarnedPoints(0)).toBe(0);
  });
});

describe("computeRedemptionDiscount", () => {
  it("converts points to rupees at the configured rate", () => {
    expect(computeRedemptionDiscount(50, 1000)).toBe(50);
  });

  it("caps the discount at the order subtotal — never a free order plus cash back", () => {
    expect(computeRedemptionDiscount(500, 100)).toBe(100);
  });

  it("returns zero when redeeming zero points", () => {
    expect(computeRedemptionDiscount(0, 1000)).toBe(0);
  });
});
