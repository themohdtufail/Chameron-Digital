import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { productSchema } from "@/lib/validation";
import { withApiErrors, jsonError } from "@/lib/api-utils";
import { slugify } from "@/lib/utils";

export const GET = withApiErrors(async () => {
  const user = await requireRole("SELLER");
  const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
  if (!store) return jsonError("Store not found", 404);

  const products = await prisma.product.findMany({
    where: { storeId: store.id },
    include: { images: { orderBy: { position: "asc" }, take: 1 }, category: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ products });
});

async function uniqueProductSlug(base: string) {
  const slug = slugify(base) || "product";
  let candidate = slug;
  let n = 1;
  while (await prisma.product.findUnique({ where: { slug: candidate } })) {
    candidate = `${slug}-${++n}`;
  }
  return candidate;
}

export const POST = withApiErrors(async (req: NextRequest) => {
  const user = await requireRole("SELLER");
  const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
  if (!store) return jsonError("Store not found", 404);
  if (store.status !== "APPROVED") return jsonError("Your store must be approved before adding products", 403);

  const body = productSchema.parse(await req.json());
  const slug = await uniqueProductSlug(body.name);

  const product = await prisma.product.create({
    data: {
      storeId: store.id,
      categoryId: body.categoryId || undefined,
      name: body.name,
      slug,
      description: body.description,
      sku: body.sku || undefined,
      price: body.price,
      discountPrice: body.discountPrice ?? undefined,
      stockQuantity: body.stockQuantity,
      lowStockThreshold: body.lowStockThreshold,
      trackInventory: body.trackInventory,
      status: body.status,
      videoUrl: body.videoUrl ?? undefined,
      specifications: body.specifications,
      images: { create: body.images.map((url, position) => ({ url, position })) },
      variants: { create: body.variants },
    },
    include: { images: true, variants: true },
  });

  return NextResponse.json({ product });
});
