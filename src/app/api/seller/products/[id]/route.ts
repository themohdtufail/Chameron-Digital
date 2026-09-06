import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { productSchema } from "@/lib/validation";
import { withApiErrors, jsonError } from "@/lib/api-utils";
import { writeAuditLog } from "@/lib/audit";
import { notifyWishlistersOnPriceDrop } from "@/lib/wishlist-notify";

async function loadOwnedProduct(userId: string, productId: string) {
  const store = await prisma.store.findUnique({ where: { ownerId: userId } });
  if (!store) return { store: null, product: null };
  const product = await prisma.product.findFirst({ where: { id: productId, storeId: store.id } });
  return { store, product };
}

export const GET = withApiErrors(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const user = await requireRole("SELLER");
  const { product } = await loadOwnedProduct(user.id, params.id);
  if (!product) return jsonError("Product not found", 404);

  const full = await prisma.product.findUnique({
    where: { id: product.id },
    include: { images: { orderBy: { position: "asc" } }, variants: true },
  });
  return NextResponse.json({ product: full });
});

const patchSchema = productSchema.partial().extend({ isHidden: z.boolean().optional() });

export const PATCH = withApiErrors(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const user = await requireRole("SELLER");
  const { store, product } = await loadOwnedProduct(user.id, params.id);
  if (!product || !store) return jsonError("Product not found", 404);

  const body = patchSchema.parse(await req.json());

  const updated = await prisma.$transaction(async (tx) => {
    if (body.images) {
      await tx.productImage.deleteMany({ where: { productId: product.id } });
      await tx.productImage.createMany({
        data: body.images.map((url, position) => ({ productId: product.id, url, position })),
      });
    }
    if (body.variants) {
      await tx.productVariant.deleteMany({ where: { productId: product.id } });
      await tx.productVariant.createMany({
        data: body.variants.map((v) => ({ ...v, productId: product.id })),
      });
    }

    return tx.product.update({
      where: { id: product.id },
      data: {
        name: body.name,
        categoryId: body.categoryId,
        description: body.description,
        sku: body.sku,
        price: body.price,
        discountPrice: body.discountPrice,
        stockQuantity: body.stockQuantity,
        lowStockThreshold: body.lowStockThreshold,
        trackInventory: body.trackInventory,
        status: body.status,
        videoUrl: body.videoUrl,
        specifications: body.specifications,
        isHidden: body.isHidden,
      },
      include: { images: { orderBy: { position: "asc" } }, variants: true },
    });
  });

  if (body.price !== undefined && body.price !== product.price) {
    await writeAuditLog({
      actorId: user.id,
      action: "PRODUCT_PRICE_CHANGED",
      entityType: "Product",
      entityId: product.id,
      metadata: { from: product.price, to: body.price },
    });
  }

  const previousEffectivePrice = product.discountPrice ?? product.price;
  const newEffectivePrice = updated.discountPrice ?? updated.price;
  if (newEffectivePrice < previousEffectivePrice) {
    await notifyWishlistersOnPriceDrop({
      productId: product.id,
      productName: updated.name,
      storeId: store.id,
      previousPrice: previousEffectivePrice,
      newPrice: newEffectivePrice,
    });
  }

  return NextResponse.json({ product: updated });
});

export const DELETE = withApiErrors(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const user = await requireRole("SELLER");
  const { product } = await loadOwnedProduct(user.id, params.id);
  if (!product) return jsonError("Product not found", 404);

  await prisma.product.delete({ where: { id: product.id } });
  await writeAuditLog({
    actorId: user.id,
    action: "PRODUCT_DELETED",
    entityType: "Product",
    entityId: product.id,
    metadata: { name: product.name },
  });

  return NextResponse.json({ success: true });
});
