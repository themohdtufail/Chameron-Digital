import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withApiErrors } from "@/lib/api-utils";

export const GET = withApiErrors(async () => {
  await requireRole("ADMIN");

  const [totalStores, pendingStores, totalBuyers, totalOrders, salesAgg] = await Promise.all([
    prisma.store.count(),
    prisma.store.count({ where: { status: "PENDING" } }),
    prisma.user.count({ where: { role: "BUYER" } }),
    prisma.order.count(),
    prisma.order.aggregate({ where: { status: { in: ["CONFIRMED", "PREPARING", "COMPLETED"] } }, _sum: { total: true } }),
  ]);

  return NextResponse.json({
    totalStores,
    pendingStores,
    totalBuyers,
    totalOrders,
    totalSales: salesAgg._sum.total ?? 0,
  });
});
