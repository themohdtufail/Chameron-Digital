import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withApiErrors, jsonError } from "@/lib/api-utils";
import { computeOutstandingBalance } from "@/lib/payout";
import type { OrderStatus } from "@prisma/client";

const REVENUE_STATUSES: OrderStatus[] = ["CONFIRMED", "PREPARING", "READY", "PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED"];

export const GET = withApiErrors(async () => {
  const user = await requireRole("SELLER");
  const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
  if (!store) return jsonError("Store not found", 404);

  const [orders, payouts] = await Promise.all([
    prisma.order.findMany({ where: { storeId: store.id, status: { in: REVENUE_STATUSES } }, select: { sellerEarning: true } }),
    prisma.payout.findMany({ where: { storeId: store.id }, orderBy: { createdAt: "desc" } }),
  ]);

  const totalEarned = orders.reduce((sum, o) => sum + o.sellerEarning, 0);
  const outstanding = computeOutstandingBalance(totalEarned, payouts);

  return NextResponse.json({ totalEarned, outstanding, payouts });
});
