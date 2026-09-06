import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withApiErrors } from "@/lib/api-utils";

export const DELETE = withApiErrors(async (_req: Request, { params }: { params: { productId: string } }) => {
  const user = await requireRole("BUYER");
  await prisma.wishlist.deleteMany({ where: { buyerId: user.id, productId: params.productId } });
  return NextResponse.json({ success: true });
});
