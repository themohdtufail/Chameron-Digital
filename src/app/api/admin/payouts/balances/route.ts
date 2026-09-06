import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withApiErrors } from "@/lib/api-utils";
import { computeOutstandingBalance } from "@/lib/payout";
import type { OrderStatus } from "@prisma/client";

const REVENUE_STATUSES: OrderStatus[] = ["CONFIRMED", "PREPARING", "READY", "PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED"];

/** Every approved store's lifetime seller earnings vs. what's already been
 * paid out — the admin's at-a-glance "who's owed money" view. */
export const GET = withApiErrors(async () => {
  await requireRole("ADMIN");

  const stores = await prisma.store.findMany({
    where: { status: "APPROVED" },
    select: {
      id: true,
      name: true,
      slug: true,
      orders: { where: { status: { in: REVENUE_STATUSES } }, select: { sellerEarning: true } },
      payouts: { select: { amount: true, status: true } },
    },
  });

  const balances = stores
    .map((s) => {
      const totalEarned = s.orders.reduce((sum, o) => sum + o.sellerEarning, 0);
      const outstanding = computeOutstandingBalance(totalEarned, s.payouts);
      return { storeId: s.id, storeName: s.name, storeSlug: s.slug, totalEarned, outstanding };
    })
    .filter((b) => b.outstanding > 0)
    .sort((a, b) => b.outstanding - a.outstanding);

  return NextResponse.json({ balances });
});
