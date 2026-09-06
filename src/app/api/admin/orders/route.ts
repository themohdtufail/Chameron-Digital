import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withApiErrors } from "@/lib/api-utils";

export const GET = withApiErrors(async () => {
  await requireRole("ADMIN");
  const orders = await prisma.order.findMany({
    include: {
      store: { select: { name: true } },
      buyer: { select: { name: true, phone: true } },
      items: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ orders });
});
