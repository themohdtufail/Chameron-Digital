import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withApiErrors } from "@/lib/api-utils";
import { computeSearchRank } from "@/lib/search";

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

  // A text search ranks by match quality (exact/starts-with/whole-word beats
  // a mere substring) — Array.sort is stable, so ties keep the createdAt-desc
  // order from the query above.
  const ranked = q ? [...products].sort((a, b) => computeSearchRank(a.name, q) - computeSearchRank(b.name, q)) : products;

  return NextResponse.json({
    products: ranked.map((p) => ({
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
