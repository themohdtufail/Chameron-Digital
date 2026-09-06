import { prisma } from "@/lib/db";

/** ₹100 spent = 1 point. Hardcoded until PlatformSetting exists
 * (Milestone 10) — same seam pattern as commission's default rate. */
export const RUPEES_PER_POINT_EARNED = 100;
/** 1 point redeemed = ₹1 off. */
export const RUPEES_PER_POINT_REDEEMED = 1;

/** Pure — floor division, so partial points never accrue. */
export function computeEarnedPoints(orderTotal: number): number {
  return Math.floor(orderTotal / RUPEES_PER_POINT_EARNED);
}

/** Pure — the discount a given point redemption is worth, capped so it
 * can never exceed the order subtotal (no free negative-cost orders). */
export function computeRedemptionDiscount(pointsToRedeem: number, subtotal: number): number {
  return Math.min(pointsToRedeem * RUPEES_PER_POINT_REDEEMED, subtotal);
}

async function getOrCreateAccount(userId: string) {
  return prisma.loyaltyAccount.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

export async function earnLoyaltyPoints(userId: string, orderId: string, orderTotal: number) {
  const points = computeEarnedPoints(orderTotal);
  if (points <= 0) return;

  const account = await getOrCreateAccount(userId);
  await prisma.$transaction([
    prisma.loyaltyAccount.update({ where: { id: account.id }, data: { pointsBalance: { increment: points } } }),
    prisma.loyaltyTransaction.create({
      data: { accountId: account.id, type: "EARNED", points, orderId },
    }),
  ]);
}

export async function redeemLoyaltyPoints(userId: string, orderId: string, points: number) {
  if (points <= 0) return;
  const account = await getOrCreateAccount(userId);

  await prisma.$transaction(async (tx) => {
    // Conditional decrement — the same concurrency guard used for stock,
    // so a double-submit can never redeem more points than the balance.
    const result = await tx.loyaltyAccount.updateMany({
      where: { id: account.id, pointsBalance: { gte: points } },
      data: { pointsBalance: { decrement: points } },
    });
    if (result.count === 0) throw new Error("Insufficient loyalty points");

    await tx.loyaltyTransaction.create({
      data: { accountId: account.id, type: "REDEEMED", points: -points, orderId },
    });
  });
}

/** Refunds previously redeemed points when their order is cancelled/rejected. */
export async function refundLoyaltyPoints(userId: string, orderId: string, points: number) {
  if (points <= 0) return;
  const account = await getOrCreateAccount(userId);
  await prisma.$transaction([
    prisma.loyaltyAccount.update({ where: { id: account.id }, data: { pointsBalance: { increment: points } } }),
    prisma.loyaltyTransaction.create({
      data: { accountId: account.id, type: "REFUNDED", points, orderId, note: "Order cancelled/rejected" },
    }),
  ]);
}
