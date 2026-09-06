import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withApiErrors, jsonError } from "@/lib/api-utils";

export const GET = withApiErrors(async (_req: Request, { params }: { params: { productId: string } }) => {
  const user = await requireRole("SELLER");
  const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
  if (!store) return jsonError("Store not found", 404);

  const product = await prisma.product.findFirst({ where: { id: params.productId, storeId: store.id } });
  if (!product) return jsonError("Product not found", 404);

  const logs = await prisma.inventoryLog.findMany({
    where: { productId: product.id },
    include: { actor: { select: { name: true } }, variant: { select: { type: true, value: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ logs });
});
