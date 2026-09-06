import { describe, it, expect } from "vitest";
import {
  computeUnitPrice,
  computeLineTotal,
  computeCartTotals,
  resolveCommissionPercentage,
  computeCommission,
  DEFAULT_COMMISSION_PERCENTAGE,
  type CommissionRuleLike,
} from "@/lib/pricing";

describe("computeUnitPrice", () => {
  it("uses the base price when there is no discount", () => {
    expect(computeUnitPrice({ price: 500, discountPrice: null })).toBe(500);
  });

  it("prefers the discount price over the base price", () => {
    expect(computeUnitPrice({ price: 500, discountPrice: 399 })).toBe(399);
  });

  it("adds a variant's price delta on top of the base/discount price", () => {
    expect(computeUnitPrice({ price: 500, discountPrice: 399 }, { priceDelta: 50 })).toBe(449);
  });

  it("treats a missing variant the same as no delta", () => {
    expect(computeUnitPrice({ price: 500, discountPrice: null }, null)).toBe(500);
    expect(computeUnitPrice({ price: 500, discountPrice: null }, undefined)).toBe(500);
  });

  it("supports a negative price delta (a cheaper variant)", () => {
    expect(computeUnitPrice({ price: 500, discountPrice: null }, { priceDelta: -50 })).toBe(450);
  });
});

describe("computeLineTotal", () => {
  it("multiplies the unit price by quantity", () => {
    expect(computeLineTotal({ price: 200, discountPrice: null }, null, 3)).toBe(600);
  });

  it("applies the variant delta before multiplying", () => {
    expect(computeLineTotal({ price: 200, discountPrice: 150 }, { priceDelta: 10 }, 2)).toBe(320);
  });
});

describe("computeCartTotals", () => {
  it("sums line totals and adds delivery fee", () => {
    const result = computeCartTotals([{ lineTotal: 100 }, { lineTotal: 250 }], 30);
    expect(result).toEqual({ subtotal: 350, deliveryFee: 30, total: 380 });
  });

  it("handles a free-delivery store", () => {
    const result = computeCartTotals([{ lineTotal: 100 }], 0);
    expect(result.total).toBe(100);
  });

  it("returns zero subtotal for an empty cart", () => {
    const result = computeCartTotals([], 30);
    expect(result).toEqual({ subtotal: 0, deliveryFee: 30, total: 30 });
  });
});

describe("resolveCommissionPercentage", () => {
  const rules: CommissionRuleLike[] = [
    { scope: "GLOBAL", storeId: null, categoryId: null, percentage: 10 },
    { scope: "CATEGORY", storeId: null, categoryId: "cat-fashion", percentage: 15 },
    { scope: "STORE", storeId: "store-1", categoryId: null, percentage: 5 },
  ];

  it("prefers a store-specific rule over category and global", () => {
    expect(resolveCommissionPercentage(rules, { storeId: "store-1", categoryId: "cat-fashion" })).toBe(5);
  });

  it("falls back to the category rule when no store rule matches", () => {
    expect(resolveCommissionPercentage(rules, { storeId: "store-2", categoryId: "cat-fashion" })).toBe(15);
  });

  it("falls back to the global rule when neither store nor category matches", () => {
    expect(resolveCommissionPercentage(rules, { storeId: "store-2", categoryId: "cat-electronics" })).toBe(10);
  });

  it("falls back to the hardcoded default when no rules exist at all", () => {
    expect(resolveCommissionPercentage([], { storeId: "store-2", categoryId: null })).toBe(DEFAULT_COMMISSION_PERCENTAGE);
  });

  it("skips the category check entirely when the target has no category", () => {
    expect(resolveCommissionPercentage(rules, { storeId: "store-2", categoryId: null })).toBe(10);
  });

  it("uses an admin-configured default percentage instead of the hardcoded one when no rule matches", () => {
    expect(resolveCommissionPercentage([], { storeId: "store-2", categoryId: null }, 7.5)).toBe(7.5);
  });
});

describe("computeCommission", () => {
  it("splits the subtotal into platform fee and seller earning", () => {
    expect(computeCommission(1000, 10)).toEqual({ platformFee: 100, sellerEarning: 900 });
  });

  it("reconciles exactly against the subtotal for a fractional percentage", () => {
    const { platformFee, sellerEarning } = computeCommission(999, 12.5);
    expect(Math.round((platformFee + sellerEarning) * 100) / 100).toBe(999);
  });

  it("takes zero commission when the percentage is zero", () => {
    expect(computeCommission(500, 0)).toEqual({ platformFee: 0, sellerEarning: 500 });
  });
});
