import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withApiErrors, jsonError } from "@/lib/api-utils";

export const GET = withApiErrors(async () => {
  const user = await requireRole("SELLER");
  const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
  if (!store) return jsonError("Store not found", 404);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [todaysOrders, salesAgg, productCount, distinctCustomers, recentOrders] = await Promise.all([
    prisma.order.count({ where: { storeId: store.id, createdAt: { gte: startOfDay } } }),
    prisma.order.aggregate({
      where: { storeId: store.id, status: { in: ["CONFIRMED", "PREPARING", "COMPLETED"] } },
      _sum: { total: true },
    }),
    prisma.product.count({ where: { storeId: store.id } }),
    prisma.order.findMany({ where: { storeId: store.id }, distinct: ["buyerId"], select: { buyerId: true } }),
    prisma.order.findMany({
      where: { storeId: store.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { items: true },
    }),
  ]);

  return NextResponse.json({
    store: { name: store.name, status: store.status },
    stats: {
      todaysOrders,
      totalSales: salesAgg._sum.total ?? 0,
      products: productCount,
      customers: distinctCustomers.length,
    },
    recentOrders,
  });
});
