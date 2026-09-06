import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withApiErrors } from "@/lib/api-utils";
import { haversineDistanceKm } from "@/lib/utils";
import { isStoreOpen } from "@/lib/store-helpers";
import type { StoreSummary } from "@/types";

export const GET = withApiErrors(async (req: NextRequest) => {
  const { searchParams } = req.nextUrl;
  const city = searchParams.get("city") || undefined;
  const category = searchParams.get("category") || undefined;
  const q = searchParams.get("q") || undefined;
  const lat = searchParams.get("lat") ? Number(searchParams.get("lat")) : undefined;
  const lng = searchParams.get("lng") ? Number(searchParams.get("lng")) : undefined;
  const sort = searchParams.get("sort") || "nearby";

  const stores = await prisma.store.findMany({
    where: {
      status: "APPROVED",
      city: city ? { equals: city, mode: "insensitive" } : undefined,
      category: category ? { slug: category } : undefined,
      name: q ? { contains: q, mode: "insensitive" } : undefined,
    },
    include: { category: true, hours: true },
    take: 60,
  });

  let summaries: StoreSummary[] = stores.map((store) => {
    const distanceKm =
      lat !== undefined && lng !== undefined && store.latitude !== null && store.longitude !== null
        ? haversineDistanceKm({ latitude: lat, longitude: lng }, { latitude: store.latitude, longitude: store.longitude })
        : null;

    return {
      id: store.id,
      slug: store.slug,
      name: store.name,
      logoUrl: store.logoUrl,
      coverUrl: store.coverUrl,
      categoryName: store.category?.name ?? null,
      ratingAvg: store.ratingAvg,
      ratingCount: store.ratingCount,
      city: store.city,
      area: store.area,
      distanceKm,
      isOpenNow: isStoreOpen(store),
      deliveryAvailable: store.deliveryAvailable,
    };
  });

  if (sort === "popular") {
    summaries = summaries.sort((a, b) => b.ratingCount - a.ratingCount || b.ratingAvg - a.ratingAvg);
  } else if (lat !== undefined && lng !== undefined) {
    summaries = summaries.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  }

  return NextResponse.json({ stores: summaries });
});
