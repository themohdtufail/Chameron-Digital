import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withApiErrors, jsonError } from "@/lib/api-utils";
import { hasFeature } from "@/lib/subscription";

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

  // Per-product and top-customer breakdowns are a PREMIUM-tier depth gate
  // (decision #8) — basic totals and new/returning counts stay free.
  const advancedAnalytics = await hasFeature(store.id, "advancedAnalytics");

  // ---- Product analytics: views/cart-adds (AnalyticsEvent) + purchases
  // (OrderItem, excluding cancelled/rejected orders) joined per product.
  let productAnalytics: {
    productId: string;
    name: string;
    views: number;
    cartAdds: number;
    purchases: number;
    conversion: number;
  }[] = [];

  if (advancedAnalytics) {
    const [viewEvents, cartAddEvents, orderItems, products] = await Promise.all([
      prisma.analyticsEvent.groupBy({
        by: ["productId"],
        where: { storeId: store.id, type: "product_view", createdAt: { gte: from, lt: to }, productId: { not: null } },
        _count: { _all: true },
      }),
      prisma.analyticsEvent.groupBy({
        by: ["productId"],
        where: { storeId: store.id, type: "add_to_cart", createdAt: { gte: from, lt: to }, productId: { not: null } },
        _count: { _all: true },
      }),
      prisma.orderItem.findMany({
        where: {
          order: { storeId: store.id, createdAt: { gte: from, lt: to }, status: { notIn: ["CANCELLED", "REJECTED"] } },
        },
        select: { productId: true, quantity: true },
      }),
      prisma.product.findMany({ where: { storeId: store.id }, select: { id: true, name: true } }),
    ]);

    const viewsByProduct = new Map(viewEvents.map((e) => [e.productId, e._count._all]));
    const cartAddsByProduct = new Map(cartAddEvents.map((e) => [e.productId, e._count._all]));
    const purchasesByProduct = new Map<string, number>();
    for (const item of orderItems) {
      purchasesByProduct.set(item.productId, (purchasesByProduct.get(item.productId) ?? 0) + item.quantity);
    }

    productAnalytics = products
      .map((p) => {
        const views = viewsByProduct.get(p.id) ?? 0;
        const cartAdds = cartAddsByProduct.get(p.id) ?? 0;
        const purchases = purchasesByProduct.get(p.id) ?? 0;
        return {
          productId: p.id,
          name: p.name,
          views,
          cartAdds,
          purchases,
          conversion: views > 0 ? Math.round((purchases / views) * 1000) / 10 : 0,
        };
      })
      .filter((p) => p.views > 0 || p.cartAdds > 0 || p.purchases > 0)
      .sort((a, b) => b.purchases - a.purchases || b.views - a.views)
      .slice(0, 20);
  }

  // ---- Customer analytics: new (first-ever order falls in range) vs
  // returning (has an order before the range too), plus top spenders.
  const buyersInRange = await prisma.order.findMany({
    where: { storeId: store.id, createdAt: { gte: from, lt: to } },
    select: { buyerId: true },
    distinct: ["buyerId"],
  });
  const buyerIds = buyersInRange.map((b) => b.buyerId);

  let newCustomers = 0;
  let returningCustomers = 0;
  if (buyerIds.length > 0) {
    const firstOrderPerBuyer = await prisma.order.groupBy({
      by: ["buyerId"],
      where: { storeId: store.id, buyerId: { in: buyerIds } },
      _min: { createdAt: true },
    });
    for (const b of firstOrderPerBuyer) {
      if (b._min.createdAt && b._min.createdAt >= from) newCustomers += 1;
      else returningCustomers += 1;
    }
  }

  let topCustomers: { name: string; orders: number; totalSpent: number }[] = [];
  if (advancedAnalytics) {
    const topCustomersRaw = await prisma.order.groupBy({
      by: ["buyerId"],
      where: { storeId: store.id, status: { notIn: ["CANCELLED", "REJECTED"] } },
      _sum: { total: true },
      _count: { _all: true },
      orderBy: { _sum: { total: "desc" } },
      take: 5,
    });
    const topBuyers = await prisma.user.findMany({
      where: { id: { in: topCustomersRaw.map((c) => c.buyerId) } },
      select: { id: true, name: true, phone: true },
    });
    topCustomers = topCustomersRaw.map((c) => {
      const buyer = topBuyers.find((b) => b.id === c.buyerId);
      return {
        name: buyer?.name ?? buyer?.phone ?? "Buyer",
        orders: c._count._all,
        totalSpent: c._sum.total ?? 0,
      };
    });
  }

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
    advancedAnalytics,
    productAnalytics,
    customerAnalytics: { newCustomers, returningCustomers, topCustomers },
  });
});
