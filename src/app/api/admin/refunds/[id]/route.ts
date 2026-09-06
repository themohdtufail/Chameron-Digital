import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withApiErrors, jsonError } from "@/lib/api-utils";
import { writeAuditLog } from "@/lib/audit";
import { resolvePaymentStatusAfterRefund } from "@/lib/refund";

const updateSchema = z.object({ status: z.enum(["PROCESSING", "COMPLETED", "FAILED"]) });

export const PATCH = withApiErrors(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const admin = await requireRole("ADMIN");
  const body = updateSchema.parse(await req.json());

  const refund = await prisma.refund.findUnique({
    where: { id: params.id },
    include: { payment: { include: { refunds: true } } },
  });
  if (!refund) return jsonError("Refund not found", 404);
  if (refund.status === "COMPLETED" || refund.status === "FAILED") {
    return jsonError("This refund has already reached a final state", 400);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const saved = await tx.refund.update({ where: { id: refund.id }, data: { status: body.status } });

    if (body.status === "COMPLETED") {
      // Recompute against every refund on this payment (this one now
      // COMPLETED), never trusting just the single row being updated.
      const siblingRefunds = refund.payment.refunds.map((r) => (r.id === refund.id ? { ...r, status: "COMPLETED" as const } : r));
      const nextPaymentStatus = resolvePaymentStatusAfterRefund(refund.payment.amount, siblingRefunds);
      await tx.payment.update({
        where: { id: refund.paymentId },
        data: { status: nextPaymentStatus, refundedAt: new Date() },
      });
    }

    return saved;
  });

  await writeAuditLog({
    actorId: admin.id,
    action: `REFUND_${body.status}`,
    entityType: "Refund",
    entityId: refund.id,
  });

  return NextResponse.json({ refund: updated });
});
