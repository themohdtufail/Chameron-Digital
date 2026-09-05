import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withApiErrors, jsonError } from "@/lib/api-utils";
import { isStoreOpen } from "@/lib/store-helpers";

export const GET = withApiErrors(async (_req: NextRequest, { params }: { params: { slug: string } }) => {
  const store = await prisma.store.findUnique({
    where: { slug: params.slug },
    include: {
      category: true,
      productCategories: { orderBy: { createdAt: "asc" } },
      products: {
        where: { isHidden: false },
        include: { images: { orderBy: { position: "asc" }, take: 1 } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!store || store.status !== "APPROVED") return jsonError("Store not found", 404);

  return NextResponse.json({
    store: {
      id: store.id,
      slug: store.slug,
      name: store.name,
      description: store.description,
      logoUrl: store.logoUrl,
      coverUrl: store.coverUrl,
      categoryName: store.category?.name ?? null,
      phone: store.phone,
      ratingAvg: store.ratingAvg,
      ratingCount: store.ratingCount,
      city: store.city,
      area: store.area,
      addressLine: store.addressLine,
      isOpenNow: isStoreOpen(store),
      deliveryAvailable: store.deliveryAvailable,
      deliveryFee: store.deliveryFee,
      openingTime: store.openingTime,
      closingTime: store.closingTime,
    },
    productCategories: store.productCategories,
    products: store.products.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      description: p.description,
      price: p.price,
      discountPrice: p.discountPrice,
      status: p.status,
      categoryId: p.categoryId,
      imageUrl: p.images[0]?.url ?? null,
    })),
  });
});
