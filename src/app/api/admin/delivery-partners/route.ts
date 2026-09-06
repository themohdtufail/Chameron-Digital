import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withApiErrors } from "@/lib/api-utils";
import type { DeliveryPartnerStatus } from "@prisma/client";

export const GET = withApiErrors(async (req: NextRequest) => {
  await requireRole("ADMIN");
  const status = req.nextUrl.searchParams.get("status") as DeliveryPartnerStatus | null;

  const partners = await prisma.deliveryPartner.findMany({
    where: status ? { status } : undefined,
    include: { user: { select: { name: true, phone: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ partners });
});
