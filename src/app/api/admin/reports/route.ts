import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withApiErrors } from "@/lib/api-utils";
import type { OrderStatus } from "@prisma/client";

const REVENUE_STATUSES: OrderStatus[] = ["CONFIRMED", "PREPARING", "READY", "PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED"];
const DAYS = 30;

export const GET = withApiErrors(async () => {
  await requireRole("ADMIN");

  const now = new Date();
  const periodStart = new Date(now.getTime() - DAYS * 86400000);

  const [
    periodOrders,
    activeSellerCount,
    totalBuyerCount,
    activePartnerCount,
    subscriptionCounts,
    openTicketCount,
    topStores,
  ] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: periodStart, lt: now }, status: { in: REVENUE_STATUSES } },
      select: { createdAt: true, total: true, platformFee: true, sellerEarning: true },
    }),
    prisma.store.count({ where: { status: "APPROVED" } }),
    prisma.user.count({ where: { role: "BUYER" } }),
    prisma.deliveryPartner.count({ where: { status: "APPROVED" } }),
    prisma.sellerSubscription.groupBy({ by: ["planId"], where: { status: { in: ["ACTIVE", "TRIAL"] } }, _count: true }),
    prisma.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.order.groupBy({
      by: ["storeId"],
      where: { createdAt: { gte: periodStart, lt: now }, status: { in: REVENUE_STATUSES } },
      _sum: { total: true },
      orderBy: { _sum: { total: "desc" } },
      take: 5,
    }),
  ]);

  const plans = await prisma.subscriptionPlan.findMany({ select: { id: true, name: true } });
  const planNameById = new Map(plans.map((p) => [p.id, p.name]));
  const subscriptionBreakdown = subscriptionCounts.map((row) => ({
    planName: planNameById.get(row.planId) ?? "Unknown",
    count: row._count,
  }));

  const storeIds = topStores.map((s) => s.storeId);
  const stores = await prisma.store.findMany({ where: { id: { in: storeIds } }, select: { id: true, name: true } });
  const storeNameById = new Map(stores.map((s) => [s.id, s.name]));
  const topStoresByRevenue = topStores.map((s) => ({
    storeName: storeNameById.get(s.storeId) ?? "Unknown",
    revenue: s._sum.total ?? 0,
  }));

  const series: { date: string; revenue: number; orders: number }[] = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const dayStart = new Date(now.getTime() - i * 86400000);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 86400000);
    const dayOrders = periodOrders.filter((o) => o.createdAt >= dayStart && o.createdAt < dayEnd);
    series.push({
      date: dayStart.toISOString().slice(0, 10),
      revenue: dayOrders.reduce((sum, o) => sum + o.total, 0),
      orders: dayOrders.length,
    });
  }

  const totalRevenue = periodOrders.reduce((sum, o) => sum + o.total, 0);
  const totalCommission = periodOrders.reduce((sum, o) => sum + (o.platformFee ?? 0), 0);
  const totalSellerEarnings = periodOrders.reduce((sum, o) => sum + (o.sellerEarning ?? 0), 0);

  return NextResponse.json({
    period: { days: DAYS },
    totals: {
      revenue: totalRevenue,
      commission: totalCommission,
      sellerEarnings: totalSellerEarnings,
      orders: periodOrders.length,
      activeSellers: activeSellerCount,
      buyers: totalBuyerCount,
      deliveryPartners: activePartnerCount,
      openTickets: openTicketCount,
    },
    series,
    subscriptionBreakdown,
    topStoresByRevenue,
  });
});
