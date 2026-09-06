import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { getCartDetails, getOrCreateCart } from "@/lib/cart";
import { withApiErrors } from "@/lib/api-utils";

export const GET = withApiErrors(async () => {
  const user = await requireRole("BUYER");
  const details = await getCartDetails(user.id);
  return NextResponse.json(details);
});

export const DELETE = withApiErrors(async () => {
  const user = await requireRole("BUYER");
  const cart = await getOrCreateCart(user.id);
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  return NextResponse.json({ success: true });
});
