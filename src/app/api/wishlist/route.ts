import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withApiErrors, jsonError } from "@/lib/api-utils";

const addSchema = z.object({ productId: z.string() });

export const GET = withApiErrors(async () => {
  const user = await requireRole("BUYER");
  const items = await prisma.wishlist.findMany({
    where: { buyerId: user.id },
    include: {
      product: {
        include: { images: { orderBy: { position: "asc" }, take: 1 }, store: { select: { slug: true, name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    products: items
      .filter((w) => !w.product.isHidden)
      .map((w) => ({
        id: w.product.id,
        slug: w.product.slug,
        name: w.product.name,
        description: w.product.description,
        price: w.product.price,
        discountPrice: w.product.discountPrice,
        status: w.product.status,
        imageUrl: w.product.images[0]?.url ?? null,
        storeSlug: w.product.store.slug,
        storeName: w.product.store.name,
        isWishlisted: true,
      })),
  });
});

export const POST = withApiErrors(async (req: NextRequest) => {
  const user = await requireRole("BUYER");
  const { productId } = addSchema.parse(await req.json());

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return jsonError("Product not found", 404);

  await prisma.wishlist.upsert({
    where: { buyerId_productId: { buyerId: user.id, productId } },
    update: {},
    create: { buyerId: user.id, productId },
  });

  return NextResponse.json({ success: true });
});
