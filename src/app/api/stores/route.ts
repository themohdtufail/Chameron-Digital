import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withApiErrors } from "@/lib/api-utils";
import { haversineDistanceKm } from "@/lib/utils";
import { isStoreOpen } from "@/lib/store-helpers";
import type { StoreSummary } from "@/types";

const PAGE_SIZE = 12;

export const GET = withApiErrors(async (req: NextRequest) => {
  const { searchParams } = req.nextUrl;
  const city = searchParams.get("city") || undefined;
  const category = searchParams.get("category") || undefined;
  const q = searchParams.get("q") || undefined;
  const lat = searchParams.get("lat") ? Number(searchParams.get("lat")) : undefined;
  const lng = searchParams.get("lng") ? Number(searchParams.get("lng")) : undefined;
  const sort = searchParams.get("sort") || "recommended";
  const openNow = searchParams.get("openNow") === "true";
  const minRating = searchParams.get("minRating") ? Number(searchParams.get("minRating")) : undefined;
  const maxDistanceKm = searchParams.get("maxDistanceKm") ? Number(searchParams.get("maxDistanceKm")) : undefined;
  const page = Math.max(1, Number(searchParams.get("page") || "1"));

  const stores = await prisma.store.findMany({
    where: {
      status: "APPROVED",
      city: city ? { equals: city, mode: "insensitive" } : undefined,
      category: category ? { slug: category } : undefined,
      name: q ? { contains: q, mode: "insensitive" } : undefined,
    },
    include: { category: true, hours: true },
    take: 300,
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

  if (openNow) summaries = summaries.filter((s) => s.isOpenNow);
  if (minRating) summaries = summaries.filter((s) => s.ratingAvg >= minRating);
  if (maxDistanceKm !== undefined) summaries = summaries.filter((s) => s.distanceKm === null || s.distanceKm <= maxDistanceKm);

  if (sort === "top-rated") {
    summaries.sort((a, b) => b.ratingAvg - a.ratingAvg || b.ratingCount - a.ratingCount);
  } else if (sort === "nearest") {
    summaries.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  } else {
    // recommended: a blend of rating and how many reviews back it up
    summaries.sort((a, b) => b.ratingAvg * Math.log(b.ratingCount + 2) - a.ratingAvg * Math.log(a.ratingCount + 2));
  }

  const total = summaries.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const paged = summaries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return NextResponse.json({ stores: paged, total, page, totalPages, pageSize: PAGE_SIZE });
});
