export interface CouponLike {
  type: "PERCENTAGE" | "FIXED";
  value: number;
  minOrderAmount: number;
  startDate: Date;
  endDate: Date;
  usageLimit: number | null;
  isActive: boolean;
}

export interface CouponValidationContext {
  subtotal: number;
  now: Date;
  /** How many times this coupon has been redeemed across all buyers. */
  usageCount: number;
  /** Whether this specific buyer has already redeemed it once. */
  alreadyRedeemedByBuyer: boolean;
}

export interface CouponValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Pure validation — dates/usage-limit/min-order/one-per-buyer, no I/O —
 * so the whole rule set is unit-testable without a database. The route
 * handler fetches usageCount/alreadyRedeemedByBuyer (cheap counts) and
 * hands them in; it never trusts a client-supplied validity flag.
 */
export function validateCoupon(coupon: CouponLike, ctx: CouponValidationContext): CouponValidationResult {
  if (!coupon.isActive) return { valid: false, reason: "This coupon is no longer active" };
  if (ctx.now < coupon.startDate) return { valid: false, reason: "This coupon is not active yet" };
  if (ctx.now > coupon.endDate) return { valid: false, reason: "This coupon has expired" };
  if (ctx.subtotal < coupon.minOrderAmount) {
    return { valid: false, reason: `Minimum order amount for this coupon is ₹${coupon.minOrderAmount}` };
  }
  if (coupon.usageLimit !== null && ctx.usageCount >= coupon.usageLimit) {
    return { valid: false, reason: "This coupon has reached its usage limit" };
  }
  if (ctx.alreadyRedeemedByBuyer) return { valid: false, reason: "You've already used this coupon" };
  return { valid: true };
}

/** Pure — the discount a valid coupon is worth, capped so it can never
 * exceed the subtotal (no free negative-cost orders). */
export function computeCouponDiscount(coupon: { type: "PERCENTAGE" | "FIXED"; value: number }, subtotal: number): number {
  const raw = coupon.type === "PERCENTAGE" ? subtotal * (coupon.value / 100) : coupon.value;
  return Math.min(Math.round(raw * 100) / 100, subtotal);
}
