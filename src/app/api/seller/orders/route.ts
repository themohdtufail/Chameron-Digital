import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withApiErrors, jsonError } from "@/lib/api-utils";
import type { OrderStatus } from "@prisma/client";

const GROUPS: Record<string, OrderStatus[]> = {
  new: ["PENDING"],
  accepted: ["CONFIRMED", "PREPARING", "READY", "PICKED_UP", "OUT_FOR_DELIVERY"],
  completed: ["DELIVERED"],
  cancelled: ["CANCELLED", "REJECTED"],
};

export const GET = withApiErrors(async (req: NextRequest) => {
  const user = await requireRole("SELLER");
  const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
  if (!store) return jsonError("Store not found", 404);

  const group = req.nextUrl.searchParams.get("group") || undefined;
  const statuses = group ? GROUPS[group] : undefined;

  const orders = await prisma.order.findMany({
    where: { storeId: store.id, status: statuses ? { in: statuses } : undefined },
    include: { items: true, buyer: { select: { name: true, phone: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ orders });
});
