import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withApiErrors } from "@/lib/api-utils";
import type { StoreStatus } from "@prisma/client";

export const GET = withApiErrors(async (req: NextRequest) => {
  await requireRole("ADMIN");
  const status = req.nextUrl.searchParams.get("status") as StoreStatus | null;

  const stores = await prisma.store.findMany({
    where: status ? { status } : undefined,
    include: { owner: { select: { name: true, phone: true } }, category: true, _count: { select: { products: true, orders: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ stores });
});
