import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withApiErrors, jsonError } from "@/lib/api-utils";
import { writeAuditLog } from "@/lib/audit";

const updateSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "SUSPENDED"]),
  rejectionReason: z.string().trim().max(300).optional(),
});

export const PATCH = withApiErrors(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const admin = await requireRole("ADMIN");
  const body = updateSchema.parse(await req.json());

  const partner = await prisma.deliveryPartner.findUnique({ where: { id: params.id } });
  if (!partner) return jsonError("Delivery partner not found", 404);

  const updated = await prisma.deliveryPartner.update({
    where: { id: partner.id },
    data: { status: body.status, rejectionReason: body.status === "REJECTED" ? body.rejectionReason : null },
  });

  await writeAuditLog({
    actorId: admin.id,
    action: `DELIVERY_PARTNER_${body.status}`,
    entityType: "DeliveryPartner",
    entityId: partner.id,
    metadata: body.rejectionReason ? { reason: body.rejectionReason } : undefined,
  });

  return NextResponse.json({ partner: updated });
});
