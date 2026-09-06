import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withApiErrors, jsonError } from "@/lib/api-utils";
import { writeAuditLog } from "@/lib/audit";
import { getStorage } from "@/lib/storage";
import { canViewStoreDocuments } from "@/lib/documents";

export const GET = withApiErrors(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const admin = await requireRole("ADMIN");
  const store = await prisma.store.findUnique({
    where: { id: params.id },
    include: {
      owner: { select: { id: true, name: true, phone: true, email: true } },
      category: true,
      documents: { orderBy: { uploadedAt: "desc" } },
      _count: { select: { products: true, orders: true } },
    },
  });
  if (!store) return jsonError("Store not found", 404);

  // requireRole("ADMIN") above already gates this whole route, but the KYC
  // view rule is made explicit (and unit-tested — see lib/documents.ts)
  // rather than left implicit in "well, only admins can reach this route."
  if (!canViewStoreDocuments({ role: admin.role, requesterUserId: admin.id, storeOwnerId: store.owner.id })) {
    return jsonError("Forbidden", 403);
  }

  const documents = await Promise.all(
    store.documents.map(async (doc) => ({
      id: doc.id,
      type: doc.type,
      uploadedAt: doc.uploadedAt,
      url: await getStorage().getSignedUrl(doc.key, "documents"),
    }))
  );

  if (store.documents.length > 0) {
    await writeAuditLog({ actorId: admin.id, action: "KYC_DOCUMENTS_VIEWED", entityType: "Store", entityId: store.id });
  }

  return NextResponse.json({ store: { ...store, documents } });
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
