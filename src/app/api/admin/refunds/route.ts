import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withApiErrors, jsonError } from "@/lib/api-utils";
import { writeAuditLog } from "@/lib/audit";
import { computeRefundableBalance } from "@/lib/refund";

export const GET = withApiErrors(async (req: NextRequest) => {
  await requireRole("ADMIN");
  const paymentId = req.nextUrl.searchParams.get("paymentId") || undefined;

  const refunds = await prisma.refund.findMany({
    where: paymentId ? { paymentId } : undefined,
    include: {
      payment: { select: { id: true, amount: true, orderId: true, order: { select: { orderNumber: true } } } },
      requestedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ refunds });
});

const createSchema = z.object({
  paymentId: z.string().min(1),
  amount: z.number().positive(),
  reason: z.string().trim().max(300).optional(),
});

export const POST = withApiErrors(async (req: NextRequest) => {
  const admin = await requireRole("ADMIN");
  const body = createSchema.parse(await req.json());

  const payment = await prisma.payment.findUnique({ where: { id: body.paymentId }, include: { refunds: true } });
  if (!payment) return jsonError("Payment not found", 404);
  if (payment.status !== "PAID" && payment.status !== "PARTIALLY_REFUNDED") {
    return jsonError("Only a paid payment can be refunded", 400);
  }

  const refundable = computeRefundableBalance(payment.amount, payment.refunds);
  if (body.amount > refundable) {
    return jsonError(`Refund amount exceeds the refundable balance of ${refundable}`, 400);
  }

  const refund = await prisma.refund.create({
    data: {
      paymentId: payment.id,
      amount: body.amount,
      reason: body.reason,
      requestedById: admin.id,
    },
  });

  await writeAuditLog({
    actorId: admin.id,
    action: "REFUND_REQUESTED",
    entityType: "Refund",
    entityId: refund.id,
    metadata: { paymentId: payment.id, amount: body.amount },
  });

  return NextResponse.json({ refund });
});
