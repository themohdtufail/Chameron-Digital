import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withApiErrors, jsonError } from "@/lib/api-utils";
import { writeAuditLog } from "@/lib/audit";

export const GET = withApiErrors(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  await requireRole("ADMIN");
  const store = await prisma.store.findUnique({
    where: { id: params.id },
    include: {
      owner: { select: { name: true, phone: true, email: true } },
      category: true,
      documents: { orderBy: { uploadedAt: "desc" } },
      _count: { select: { products: true, orders: true } },
    },
  });
  if (!store) return jsonError("Store not found", 404);
  return NextResponse.json({ store });
});

const updateSchema = z.object({
  status: z.enum(["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED", "SUSPENDED"]).optional(),
  rejectionReason: z.string().trim().max(300).optional(),
  isVerified: z.boolean().optional(),
});

export const PATCH = withApiErrors(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const admin = await requireRole("ADMIN");
  const body = updateSchema.parse(await req.json());

  const store = await prisma.store.findUnique({ where: { id: params.id } });
  if (!store) return jsonError("Store not found", 404);

  const updated = await prisma.store.update({
    where: { id: store.id },
    data: {
      status: body.status,
      rejectionReason: body.status === "REJECTED" ? body.rejectionReason : body.status ? null : undefined,
      isVerified: body.isVerified,
    },
  });

  if (body.status) {
    await writeAuditLog({
      actorId: admin.id,
      action: `STORE_${body.status}`,
      entityType: "Store",
      entityId: store.id,
      metadata: body.rejectionReason ? { reason: body.rejectionReason } : undefined,
    });
  }
  if (body.isVerified !== undefined) {
    await writeAuditLog({
      actorId: admin.id,
      action: body.isVerified ? "STORE_VERIFIED" : "STORE_UNVERIFIED",
      entityType: "Store",
      entityId: store.id,
    });
  }

  return NextResponse.json({ store: updated });
});
