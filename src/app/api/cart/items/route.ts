import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { getOrCreateCart, getCartDetails } from "@/lib/cart";
import { withApiErrors, jsonError } from "@/lib/api-utils";

const addItemSchema = z.object({
  productId: z.string(),
  variantId: z.string().optional(),
  quantity: z.number().int().min(1).max(99).default(1),
  replaceCart: z.boolean().optional(),
});

export const POST = withApiErrors(async (req: NextRequest) => {
  const user = await requireRole("BUYER");
  const body = addItemSchema.parse(await req.json());

  const product = await prisma.product.findUnique({
    where: { id: body.productId },
    include: { store: true, variants: true },
  });
  if (!product || product.isHidden) return jsonError("Product not found", 404);
  if (product.status !== "AVAILABLE") return jsonError("This product is currently unavailable", 400);

  const variant = body.variantId ? product.variants.find((v) => v.id === body.variantId) : undefined;
  if (body.variantId && !variant) return jsonError("Selected variant not found", 400);

  const availableStock = variant ? variant.stockQuantity : product.stockQuantity;
  if (availableStock < body.quantity) return jsonError("Not enough stock available", 400);

  const cart = await getOrCreateCart(user.id);

  const existingItems = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    include: { product: true },
  });
  const existingStoreId = existingItems[0]?.product.storeId;

  if (existingStoreId && existingStoreId !== product.storeId) {
    if (!body.replaceCart) {
      return NextResponse.json(
        {
          error: "different_store",
          message: "Your cart has items from another store. Replace cart to continue?",
        },
        { status: 409 }
      );
    }
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  }

  const existingItem = await prisma.cartItem.findFirst({
    where: { cartId: cart.id, productId: product.id, variantId: body.variantId ?? null },
  });

  if (existingItem) {
    await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: { increment: body.quantity } },
    });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: product.id,
        variantId: body.variantId,
        quantity: body.quantity,
      },
    });
  }

  const details = await getCartDetails(user.id);
  return NextResponse.json(details);
});
