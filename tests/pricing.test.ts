import { describe, it, expect } from "vitest";
import { computeUnitPrice, computeLineTotal, computeCartTotals } from "@/lib/pricing";

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
