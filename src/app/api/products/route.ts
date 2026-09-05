import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withApiErrors } from "@/lib/api-utils";

export const GET = withApiErrors(async (req: NextRequest) => {
  const { searchParams } = req.nextUrl;
  const storeId = searchParams.get("storeId") || undefined;
  const categoryId = searchParams.get("categoryId") || undefined;
  const q = searchParams.get("q") || undefined;

  const products = await prisma.product.findMany({
    where: {
      isHidden: false,
      storeId,
      categoryId,
      name: q ? { contains: q, mode: "insensitive" } : undefined,
      store: storeId ? undefined : { status: "APPROVED" },
    },
    include: {
      images: { orderBy: { position: "asc" }, take: 1 },
      store: { select: { slug: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  return NextResponse.json({
    products: products.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      description: p.description,
      price: p.price,
      discountPrice: p.discountPrice,
      status: p.status,
      imageUrl: p.images[0]?.url ?? null,
      storeSlug: p.store.slug,
      storeName: p.store.name,
    })),
  });
});
