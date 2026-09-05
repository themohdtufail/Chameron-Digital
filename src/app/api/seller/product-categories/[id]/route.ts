import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withApiErrors, jsonError } from "@/lib/api-utils";

export const DELETE = withApiErrors(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const user = await requireRole("SELLER");
  const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
  if (!store) return jsonError("Store not found", 404);

  const category = await prisma.productCategory.findFirst({ where: { id: params.id, storeId: store.id } });
  if (!category) return jsonError("Category not found", 404);

  await prisma.product.updateMany({ where: { categoryId: category.id }, data: { categoryId: null } });
  await prisma.productCategory.delete({ where: { id: category.id } });

  return NextResponse.json({ success: true });
});
