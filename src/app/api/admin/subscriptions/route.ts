import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withApiErrors } from "@/lib/api-utils";
import type { SubscriptionStatus } from "@prisma/client";

export const GET = withApiErrors(async (req: NextRequest) => {
  await requireRole("ADMIN");
  const status = req.nextUrl.searchParams.get("status") as SubscriptionStatus | null;

  const subscriptions = await prisma.sellerSubscription.findMany({
    where: status ? { status } : undefined,
    include: { store: { select: { name: true, slug: true } }, plan: true },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ subscriptions });
});
