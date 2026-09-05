import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withApiErrors, jsonError } from "@/lib/api-utils";

export const GET = withApiErrors(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: {
      images: { orderBy: { position: "asc" } },
      variants: true,
      store: { select: { id: true, slug: true, name: true, logoUrl: true, deliveryFee: true } },
      category: true,
    },
  });

  if (!product || product.isHidden) return jsonError("Product not found", 404);

  return NextResponse.json({ product });
});
