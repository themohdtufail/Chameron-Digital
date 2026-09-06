import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { productCategoryUpdateSchema } from "@/lib/validation";
import { withApiErrors, jsonError } from "@/lib/api-utils";
import { slugify } from "@/lib/utils";

export const PATCH = withApiErrors(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const user = await requireRole("SELLER");
  const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
  if (!store) return jsonError("Store not found", 404);

  const category = await prisma.productCategory.findFirst({ where: { id: params.id, storeId: store.id } });
  if (!category) return jsonError("Category not found", 404);

  const body = productCategoryUpdateSchema.parse(await req.json());
  const updated = await prisma.productCategory.update({
    where: { id: category.id },
    data: {
      name: body.name,
      slug: body.name ? slugify(body.name) : undefined,
      isHidden: body.isHidden,
      position: body.position,
    },
  });

  return NextResponse.json({ category: updated });
});

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
