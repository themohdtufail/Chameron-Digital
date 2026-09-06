import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withApiErrors, jsonError } from "@/lib/api-utils";

function startOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export const GET = withApiErrors(async (req: NextRequest) => {
  const user = await requireRole("SELLER");
  const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
  if (!store) return jsonError("Store not found", 404);

  const range = req.nextUrl.searchParams.get("range") || "7d";
  const now = new Date();
  let from: Date;
  if (range === "today") from = startOfDay(now);
  else if (range === "30d") from = startOfDay(new Date(now.getTime() - 29 * 86400000));
  else if (range === "custom") {
    const fromParam = req.nextUrl.searchParams.get("from");
    from = fromParam ? startOfDay(new Date(fromParam)) : startOfDay(new Date(now.getTime() - 6 * 86400000));
  } else from = startOfDay(new Date(now.getTime() - 6 * 86400000));

  const toParam = req.nextUrl.searchParams.get("to");
  const to = range === "custom" && toParam ? new Date(new Date(toParam).getTime() + 86400000) : new Date(now.getTime() + 1);

  const REVENUE_STATUSES = ["CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED"];

  const orders = await prisma.order.findMany({
    where: { storeId: store.id, createdAt: { gte: from, lt: to } },
    select: { createdAt: true, total: true, status: true },
  });

  const dayCount = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86400000));
  const series: { date: string; orders: number; revenue: number }[] = [];
  for (let i = 0; i < dayCount; i++) {
    const day = new Date(from.getTime() + i * 86400000);
    const key = day.toISOString().slice(0, 10);
    series.push({ date: key, orders: 0, revenue: 0 });
  }
  const seriesByDate = new Map(series.map((s) => [s.date, s]));

  let totalOrders = 0;
  let totalRevenue = 0;
  let cancelledCount = 0;

  for (const o of orders) {
    const key = o.createdAt.toISOString().slice(0, 10);
    const bucket = seriesByDate.get(key);
    totalOrders += 1;
    if (o.status === "CANCELLED" || o.status === "REJECTED") cancelledCount += 1;
    if (REVENUE_STATUSES.includes(o.status)) {
      totalRevenue += o.total;
      if (bucket) {
        bucket.orders += 1;
        bucket.revenue += o.total;
      }
    } else if (bucket) {
      bucket.orders += 1;
    }
  }

  // Prisma can't compare two columns of the same row in a `where` filter, so
  // the stock-vs-threshold comparison is done in JS after a narrow select.
  const [trackedStock, pendingRequests] = await Promise.all([
    prisma.product.findMany({
      where: { storeId: store.id, trackInventory: true },
      select: { stockQuantity: true, lowStockThreshold: true },
    }),
    prisma.productRequest.count({ where: { storeId: store.id, status: "PENDING" } }),
  ]);
  const lowStockCount = trackedStock.filter((r) => r.stockQuantity > 0 && r.stockQuantity <= r.lowStockThreshold).length;

  return NextResponse.json({
    range,
    from: from.toISOString(),
    to: to.toISOString(),
    series,
    totals: {
      orders: totalOrders,
      revenue: totalRevenue,
      cancelled: cancelledCount,
      avgOrderValue: totalOrders ? Math.round(totalRevenue / totalOrders) : 0,
    },
    lowStockCount,
    pendingRequests,
  });
});
