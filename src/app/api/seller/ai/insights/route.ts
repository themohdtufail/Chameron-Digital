import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withApiErrors, jsonError } from "@/lib/api-utils";
import { hasFeature } from "@/lib/subscription";
import { getAIProvider } from "@/lib/ai";
import type { OrderStatus } from "@prisma/client";

const REVENUE_STATUSES: OrderStatus[] = ["CONFIRMED", "PREPARING", "READY", "PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED"];

export const GET = withApiErrors(async () => {
  const user = await requireRole("SELLER");
  const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
  if (!store) return jsonError("Store not found", 404);
  if (!(await hasFeature(store.id, "ai"))) {
    return jsonError("AI assistant is available on the Growth plan and above. Upgrade to unlock it.", 403);
  }

  const now = new Date();
  const periodStart = new Date(now.getTime() - 30 * 86400000);
  const previousPeriodStart = new Date(now.getTime() - 60 * 86400000);

  const [currentOrders, previousOrders, topItem, trackedStock] = await Promise.all([
    prisma.order.findMany({
      where: { storeId: store.id, createdAt: { gte: periodStart, lt: now }, status: { in: REVENUE_STATUSES } },
      select: { total: true },
    }),
    prisma.order.findMany({
      where: { storeId: store.id, createdAt: { gte: previousPeriodStart, lt: periodStart }, status: { in: REVENUE_STATUSES } },
      select: { total: true },
    }),
    prisma.orderItem.groupBy({
      by: ["productName"],
      where: { order: { storeId: store.id, createdAt: { gte: periodStart, lt: now }, status: { in: REVENUE_STATUSES } } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 1,
    }),
    prisma.product.findMany({
      where: { storeId: store.id, trackInventory: true },
      select: { stockQuantity: true, lowStockThreshold: true },
    }),
  ]);

  const revenue = currentOrders.reduce((sum, o) => sum + o.total, 0);
  const previousRevenue = previousOrders.reduce((sum, o) => sum + o.total, 0);
  const lowStockCount = trackedStock.filter((p) => p.stockQuantity > 0 && p.stockQuantity <= p.lowStockThreshold).length;

  const text = await getAIProvider().generate({
    kind: "business_insights",
    metrics: {
      revenue,
      orders: currentOrders.length,
      previousRevenue,
      topProductName: topItem[0]?.productName,
      lowStockCount,
    },
  });

  return NextResponse.json({ text });
});
