import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withApiErrors, jsonError } from "@/lib/api-utils";
import { writeAuditLog } from "@/lib/audit";

const updateSchema = z.object({ status: z.enum(["PENDING", "PROCESSING", "PAID", "FAILED", "ON_HOLD"]) });

export const PATCH = withApiErrors(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const admin = await requireRole("ADMIN");
  const body = updateSchema.parse(await req.json());

  const payout = await prisma.payout.findUnique({ where: { id: params.id } });
  if (!payout) return jsonError("Payout not found", 404);

  const updated = await prisma.payout.update({
    where: { id: payout.id },
    data: { status: body.status, processedById: body.status === "PAID" ? admin.id : payout.processedById },
  });

  await writeAuditLog({
    actorId: admin.id,
    action: `PAYOUT_${body.status}`,
    entityType: "Payout",
    entityId: payout.id,
  });

  return NextResponse.json({ payout: updated });
});
