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

  const store = await prisma.store.findUnique({ where: { id: params.id } });
  if (!store) return jsonError("Store not found", 404);

  const updated = await prisma.store.update({
    where: { id: store.id },
    data: { status: body.status, rejectionReason: body.status === "REJECTED" ? body.rejectionReason : null },
  });

  await writeAuditLog({
    actorId: admin.id,
    action: `STORE_${body.status}`,
    entityType: "Store",
    entityId: store.id,
    metadata: body.rejectionReason ? { reason: body.rejectionReason } : undefined,
  });

  return NextResponse.json({ store: updated });
});
