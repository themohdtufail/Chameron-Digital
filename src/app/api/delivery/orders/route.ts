import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withApiErrors } from "@/lib/api-utils";
import type { OrderStatus } from "@prisma/client";

const GROUPS: Record<string, OrderStatus[]> = {
  active: ["PICKED_UP", "OUT_FOR_DELIVERY"],
  completed: ["DELIVERED"],
};

export const GET = withApiErrors(async (req: NextRequest) => {
  const user = await requireRole("DELIVERY_PARTNER");

  const group = req.nextUrl.searchParams.get("group") || undefined;
  const statuses = group ? GROUPS[group] : undefined;

  const orders = await prisma.order.findMany({
    where: { deliveryPartnerId: user.id, status: statuses ? { in: statuses } : undefined },
    include: {
      items: true,
      store: { select: { name: true, phone: true, addressLine: true, area: true, city: true } },
    },
    orderBy: { deliveryAssignedAt: "desc" },
  });

  return NextResponse.json({ orders });
});
