import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { withApiErrors, jsonError } from "@/lib/api-utils";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getPaymentGateway, type GatewayOutcome } from "@/lib/payment-gateway";
import { createNotification } from "@/lib/notify";
import { formatCurrency } from "@/lib/utils";
import type { PaymentStatus } from "@prisma/client";

// Dev/test-only hint telling the mock gateway which outcome to simulate —
// a real gateway ignores this and resolves the outcome from its own state,
// so no client field ever sets Payment.status directly.
const confirmSchema = z.object({
  simulate: z.enum(["SUCCESS", "FAILED", "CANCELLED", "TIMEOUT"]).optional(),
});

const RESOLVED_STATUSES: PaymentStatus[] = ["PAID", "FAILED", "REFUNDED"];

function outcomeToStatus(outcome: GatewayOutcome): PaymentStatus {
  return outcome === "SUCCESS" ? "PAID" : "FAILED";
}

export const POST = withApiErrors(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const user = await requireUser();
  const { simulate } = confirmSchema.parse(await req.json().catch(() => ({})));

  await enforceRateLimit(user.id, "payment_confirm", { windowSeconds: 60, max: 20 });

  const payment = await prisma.payment.findUnique({
    where: { id: params.id },
    include: { order: { select: { id: true, buyerId: true, orderNumber: true, storeId: true, store: { select: { ownerId: true, name: true } } } } },
  });
  if (!payment) return jsonError("Payment not found", 404);

  const isBuyerOwner = payment.order.buyerId === user.id;
  if (!isBuyerOwner && user.role !== "ADMIN") return jsonError("Forbidden", 403);

  // Idempotent: a payment already resolved (by an earlier request, or a
  // concurrent duplicate submit) is returned as-is rather than re-processed.
  if (RESOLVED_STATUSES.includes(payment.status)) {
    return NextResponse.json({ payment });
  }
  if (payment.method !== "ONLINE" || !payment.gatewayRef) {
    return jsonError("This payment does not require confirmation", 400);
  }

  const { outcome, failureReason } = await getPaymentGateway().verify(payment.gatewayRef, simulate);
  const nextStatus = outcomeToStatus(outcome);

  const result = await prisma.$transaction(async (tx) => {
    // Conditional guard: only transition if still PENDING/PROCESSING, closing
    // the double-submit/duplicate-callback race the same way order creation
    // closes the stock race.
    const updated = await tx.payment.updateMany({
      where: { id: payment.id, status: { in: ["PENDING", "PROCESSING"] } },
      data: {
        status: nextStatus,
        failureReason: nextStatus === "FAILED" ? failureReason : null,
        paidAt: nextStatus === "PAID" ? new Date() : null,
      },
    });
    if (updated.count === 0) {
      return tx.payment.findUniqueOrThrow({ where: { id: payment.id } });
    }

    await tx.order.updateMany({
      where: { id: payment.order.id, paymentStatus: { in: ["PENDING", "PROCESSING"] } },
      data: { paymentStatus: nextStatus },
    });

    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: nextStatus,
        entityType: "Payment",
        entityId: payment.id,
        metadata: { outcome, orderId: payment.order.id },
      },
    });

    return tx.payment.findUniqueOrThrow({ where: { id: payment.id } });
  });

  if (result.status === "PAID") {
    await createNotification({
      userId: payment.order.store.ownerId,
      type: "NEW_ORDER",
      title: "Payment received",
      body: `Payment of ${formatCurrency(payment.amount)} received for order ${payment.order.orderNumber}.`,
      relatedOrderId: payment.order.id,
      templateKey: "payment_received",
      vars: { orderNumber: payment.order.orderNumber, amount: formatCurrency(payment.amount) },
    });
  }

  return NextResponse.json({ payment: result });
});
