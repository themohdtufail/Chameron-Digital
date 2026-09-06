import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { StoreCard } from "@/components/buyer/StoreCard";
import { SearchBar } from "@/components/buyer/SearchBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { haversineDistanceKm, cn } from "@/lib/utils";
import { isStoreOpen } from "@/lib/store-helpers";
import { Store as StoreIcon } from "lucide-react";
import type { StoreSummary } from "@/types";

export const dynamic = "force-dynamic";

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: { slug?: string; sort?: string };
}) {
  const user = await getCurrentUser();
  const [location, categories] = await Promise.all([
    prisma.location.findFirst({
      where: { userId: user!.id },
      orderBy: [{ isCurrent: "desc" }, { createdAt: "desc" }],
    }),
    prisma.category.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  const stores = await prisma.store.findMany({
    where: {
      status: "APPROVED",
      category: searchParams.slug ? { slug: searchParams.slug } : undefined,
    },
    include: { category: true, hours: true },
  });

  let summaries: StoreSummary[] = stores.map((store) => ({
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
    distanceKm:
      location?.latitude && location.longitude && store.latitude && store.longitude
        ? haversineDistanceKm(
            { latitude: location.latitude, longitude: location.longitude },
            { latitude: store.latitude, longitude: store.longitude }
          )
        : null,
    isOpenNow: isStoreOpen(store),
    deliveryAvailable: store.deliveryAvailable,
  }));

  summaries =
    searchParams.sort === "popular"
      ? summaries.sort((a, b) => b.ratingCount - a.ratingCount || b.ratingAvg - a.ratingAvg)
      : summaries.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));

  return (
    <div className="animate-fade-in">
      <div className="sticky top-0 z-30 space-y-3 border-b border-zinc-100 bg-white/95 px-4 pb-3 pt-4 backdrop-blur lg:hidden">
        <h1 className="text-lg font-extrabold text-zinc-900">Categories</h1>
        <SearchBar />
      </div>

      <div className="page-container">
        <h1 className="hidden px-8 pt-8 text-2xl font-extrabold text-zinc-900 lg:block">Categories</h1>

        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3 lg:px-8 lg:pt-5">
          <Chip href="/buyer/categories" active={!searchParams.slug}>
            All
          </Chip>
          {categories.map((cat) => (
            <Chip key={cat.id} href={`/buyer/categories?slug=${cat.slug}`} active={searchParams.slug === cat.slug}>
              {cat.name}
            </Chip>
          ))}
        </div>

        <div className="px-4 pb-6 lg:px-8 lg:pb-12">
          {summaries.length === 0 ? (
            <EmptyState icon={StoreIcon} title="No stores found" description="Try a different category." />
          ) : (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5 xl:grid-cols-5">
              {summaries.map((store) => (
                <StoreCard key={store.id} store={store} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition",
        active ? "border-brand-600 bg-brand-600 text-white" : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
      )}
    >
      {children}
    </Link>
  );
}
