import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { getOrCreateCart, getCartDetails } from "@/lib/cart";
import { withApiErrors, jsonError } from "@/lib/api-utils";

const updateSchema = z.object({ quantity: z.number().int().min(0).max(99) });

export const PATCH = withApiErrors(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const user = await requireRole("BUYER");
  const { quantity } = updateSchema.parse(await req.json());
  const cart = await getOrCreateCart(user.id);

  const item = await prisma.cartItem.findFirst({ where: { id: params.id, cartId: cart.id } });
  if (!item) return jsonError("Cart item not found", 404);

  if (quantity === 0) {
    await prisma.cartItem.delete({ where: { id: item.id } });
  } else {
    await prisma.cartItem.update({ where: { id: item.id }, data: { quantity } });
  }

  const details = await getCartDetails(user.id);
  return NextResponse.json(details);
});

export const DELETE = withApiErrors(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const user = await requireRole("BUYER");
  const cart = await getOrCreateCart(user.id);
  await prisma.cartItem.deleteMany({ where: { id: params.id, cartId: cart.id } });
  const details = await getCartDetails(user.id);
  return NextResponse.json(details);
});
