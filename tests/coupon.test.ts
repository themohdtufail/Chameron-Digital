import { describe, it, expect } from "vitest";
import { validateCoupon, computeCouponDiscount, type CouponLike } from "@/lib/coupon";

const baseCoupon: CouponLike = {
  type: "PERCENTAGE",
  value: 10,
  minOrderAmount: 500,
  startDate: new Date("2026-01-01"),
  endDate: new Date("2026-01-31"),
  usageLimit: 100,
  isActive: true,
};

const baseContext = { subtotal: 1000, now: new Date("2026-01-15"), usageCount: 0, alreadyRedeemedByBuyer: false };

describe("validateCoupon", () => {
  it("accepts a coupon that satisfies every rule", () => {
    expect(validateCoupon(baseCoupon, baseContext)).toEqual({ valid: true });
  });

  it("rejects an inactive coupon", () => {
    const result = validateCoupon({ ...baseCoupon, isActive: false }, baseContext);
    expect(result.valid).toBe(false);
  });

  it("rejects before the start date", () => {
    const result = validateCoupon(baseCoupon, { ...baseContext, now: new Date("2025-12-31") });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/not active yet/i);
  });

  it("rejects after the end date", () => {
    const result = validateCoupon(baseCoupon, { ...baseContext, now: new Date("2026-02-01") });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/expired/i);
  });

  it("rejects when the subtotal is below the minimum order amount", () => {
    const result = validateCoupon(baseCoupon, { ...baseContext, subtotal: 100 });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/minimum order/i);
  });

  it("rejects once the usage limit is reached", () => {
    const result = validateCoupon(baseCoupon, { ...baseContext, usageCount: 100 });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/usage limit/i);
  });

  it("allows unlimited usage when usageLimit is null", () => {
    const result = validateCoupon({ ...baseCoupon, usageLimit: null }, { ...baseContext, usageCount: 100000 });
    expect(result.valid).toBe(true);
  });

  it("rejects a buyer who already redeemed this coupon once", () => {
    const result = validateCoupon(baseCoupon, { ...baseContext, alreadyRedeemedByBuyer: true });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/already used/i);
  });
});

describe("computeCouponDiscount", () => {
  it("computes a percentage discount", () => {
    expect(computeCouponDiscount({ type: "PERCENTAGE", value: 10 }, 1000)).toBe(100);
  });

  it("computes a fixed discount", () => {
    expect(computeCouponDiscount({ type: "FIXED", value: 150 }, 1000)).toBe(150);
  });

  it("caps a fixed discount at the subtotal", () => {
    expect(computeCouponDiscount({ type: "FIXED", value: 500 }, 300)).toBe(300);
  });

  it("caps a percentage discount that would exceed the subtotal (over-100%) at the subtotal", () => {
    expect(computeCouponDiscount({ type: "PERCENTAGE", value: 150 }, 200)).toBe(200);
  });
});
