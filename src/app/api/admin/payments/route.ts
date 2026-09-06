import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withApiErrors } from "@/lib/api-utils";
import type { PaymentStatus } from "@prisma/client";

export const GET = withApiErrors(async (req: NextRequest) => {
  await requireRole("ADMIN");
  const status = req.nextUrl.searchParams.get("status") as PaymentStatus | null;

  const payments = await prisma.payment.findMany({
    where: status ? { status } : undefined,
    include: {
      order: {
        select: {
          orderNumber: true,
          total: true,
          store: { select: { name: true } },
          buyer: { select: { name: true, phone: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ payments });
});
