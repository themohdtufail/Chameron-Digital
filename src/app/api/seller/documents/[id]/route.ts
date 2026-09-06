import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withApiErrors, jsonError } from "@/lib/api-utils";
import { getStorage } from "@/lib/storage";

export const DELETE = withApiErrors(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const user = await requireRole("SELLER");
  const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
  if (!store) return jsonError("Store not found", 404);

  const document = await prisma.storeDocument.findFirst({ where: { id: params.id, storeId: store.id } });
  if (!document) return jsonError("Document not found", 404);

  // Delete the underlying object before the database row: if storage
  // deletion fails, this throws (withApiErrors -> 500) and the row is left
  // in place rather than reporting success while the real file remains
  // stored — an orphaned DB row pointing at a live object is recoverable
  // (retry the delete), a "deleted" response that lied is not.
  await getStorage().delete(document.key, "documents");
  await prisma.storeDocument.delete({ where: { id: document.id } });

  return NextResponse.json({ success: true });
});
