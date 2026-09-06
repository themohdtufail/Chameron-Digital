import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { inventoryAdjustSchema } from "@/lib/validation";
import { withApiErrors, jsonError } from "@/lib/api-utils";

export const POST = withApiErrors(async (req: NextRequest) => {
  const user = await requireRole("SELLER");
  const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
  if (!store) return jsonError("Store not found", 404);

  const body = inventoryAdjustSchema.parse(await req.json());
  const product = await prisma.product.findFirst({ where: { id: body.productId, storeId: store.id } });
  if (!product) return jsonError("Product not found", 404);

  if (body.variantId) {
    const variant = await prisma.productVariant.findFirst({ where: { id: body.variantId, productId: product.id } });
    if (!variant) return jsonError("Variant not found", 404);
    if (variant.stockQuantity + body.delta < 0) return jsonError("Stock cannot go below zero", 400);
  } else if (product.stockQuantity + body.delta < 0) {
    return jsonError("Stock cannot go below zero", 400);
  }

  await prisma.$transaction(async (tx) => {
    if (body.variantId) {
      await tx.productVariant.update({
        where: { id: body.variantId },
        data: { stockQuantity: { increment: body.delta } },
      });
    } else {
      await tx.product.update({
        where: { id: product.id },
        data: { stockQuantity: { increment: body.delta } },
      });
    }

    await tx.inventoryLog.create({
      data: {
        productId: product.id,
        variantId: body.variantId || undefined,
        change: body.delta,
        reason: "MANUAL",
        actorId: user.id,
        note: body.note,
      },
    });
  });

  return NextResponse.json({ success: true });
});
