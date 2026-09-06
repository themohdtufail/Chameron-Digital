import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withApiErrors, jsonError } from "@/lib/api-utils";
import { writeAuditLog } from "@/lib/audit";
import { computeOutstandingBalance } from "@/lib/payout";
import type { OrderStatus } from "@prisma/client";

const REVENUE_STATUSES: OrderStatus[] = ["CONFIRMED", "PREPARING", "READY", "PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED"];

export const GET = withApiErrors(async (req: NextRequest) => {
  await requireRole("ADMIN");
  const storeId = req.nextUrl.searchParams.get("storeId") || undefined;

  const payouts = await prisma.payout.findMany({
    where: storeId ? { storeId } : undefined,
    include: { store: { select: { name: true, slug: true } }, processedBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ payouts });
});

const createSchema = z.object({
  storeId: z.string().min(1),
  amount: z.number().positive(),
  periodStart: z.string(),
  periodEnd: z.string(),
  notes: z.string().trim().max(300).optional(),
});

export const POST = withApiErrors(async (req: NextRequest) => {
  const admin = await requireRole("ADMIN");
  const body = createSchema.parse(await req.json());

  const store = await prisma.store.findUnique({ where: { id: body.storeId } });
  if (!store) return jsonError("Store not found", 404);

  const [orders, existingPayouts] = await Promise.all([
    prisma.order.findMany({ where: { storeId: store.id, status: { in: REVENUE_STATUSES } }, select: { sellerEarning: true } }),
    prisma.payout.findMany({ where: { storeId: store.id }, select: { amount: true, status: true } }),
  ]);
  const totalEarned = orders.reduce((sum, o) => sum + o.sellerEarning, 0);
  const outstanding = computeOutstandingBalance(totalEarned, existingPayouts);
  if (body.amount > outstanding) {
    return jsonError(`Payout amount exceeds the outstanding balance of ${outstanding}`, 400);
  }

  const payout = await prisma.payout.create({
    data: {
      storeId: store.id,
      amount: body.amount,
      periodStart: new Date(body.periodStart),
      periodEnd: new Date(body.periodEnd),
      notes: body.notes,
    },
  });

  await writeAuditLog({
    actorId: admin.id,
    action: "PAYOUT_CREATED",
    entityType: "Payout",
    entityId: payout.id,
    metadata: { storeId: store.id, amount: body.amount },
  });

  return NextResponse.json({ payout });
});
