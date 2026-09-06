import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withApiErrors, jsonError } from "@/lib/api-utils";
import { validateCoupon, computeCouponDiscount } from "@/lib/coupon";

const schema = z.object({
  code: z.string().trim().toUpperCase(),
  storeId: z.string(),
  subtotal: z.number().positive(),
});

/** A preview-only check for the checkout UI — the order-creation route
 * re-validates independently and never trusts this response. */
export const POST = withApiErrors(async (req: NextRequest) => {
  const user = await requireRole("BUYER");
  const { code, storeId, subtotal } = schema.parse(await req.json());

  const coupon = await prisma.coupon.findUnique({ where: { storeId_code: { storeId, code } } });
  if (!coupon) return jsonError("Invalid coupon code", 404);

  const [usageCount, ownRedemption] = await Promise.all([
    prisma.couponRedemption.count({ where: { couponId: coupon.id } }),
    prisma.couponRedemption.findUnique({ where: { couponId_buyerId: { couponId: coupon.id, buyerId: user.id } } }),
  ]);

  const result = validateCoupon(coupon, {
    subtotal,
    now: new Date(),
    usageCount,
    alreadyRedeemedByBuyer: Boolean(ownRedemption),
  });
  if (!result.valid) return jsonError(result.reason ?? "This coupon cannot be applied", 400);

  const discountAmount = computeCouponDiscount(coupon, subtotal);
  return NextResponse.json({ valid: true, discountAmount, code: coupon.code });
});
