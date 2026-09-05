import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withApiErrors, jsonError } from "@/lib/api-utils";

export const GET = withApiErrors(async () => {
  const user = await requireRole("SELLER");
  const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
  if (!store) return jsonError("Store not found", 404);

  const orders = await prisma.order.findMany({
    where: { storeId: store.id },
    include: { buyer: { select: { id: true, name: true, phone: true } } },
    orderBy: { createdAt: "desc" },
  });

  const map = new Map<string, { id: string; name: string | null; phone: string; orders: number; totalSpent: number; lastOrderAt: Date }>();
  for (const order of orders) {
    const existing = map.get(order.buyerId);
    if (existing) {
      existing.orders += 1;
      existing.totalSpent += order.total;
    } else {
      map.set(order.buyerId, {
        id: order.buyer.id,
        name: order.buyer.name,
        phone: order.buyer.phone,
        orders: 1,
        totalSpent: order.total,
        lastOrderAt: order.createdAt,
      });
    }
  }

  return NextResponse.json({ customers: Array.from(map.values()) });
});
