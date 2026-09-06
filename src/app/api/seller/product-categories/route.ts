import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { productCategorySchema } from "@/lib/validation";
import { withApiErrors, jsonError } from "@/lib/api-utils";
import { slugify } from "@/lib/utils";

export const GET = withApiErrors(async () => {
  const user = await requireRole("SELLER");
  const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
  if (!store) return jsonError("Store not found", 404);
  const categories = await prisma.productCategory.findMany({
    where: { storeId: store.id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ categories });
});

export const POST = withApiErrors(async (req: NextRequest) => {
  const user = await requireRole("SELLER");
  const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
  if (!store) return jsonError("Store not found", 404);
  const body = productCategorySchema.parse(await req.json());

  const category = await prisma.productCategory.create({
    data: { storeId: store.id, name: body.name, slug: slugify(body.name) },
  });
  return NextResponse.json({ category });
});
