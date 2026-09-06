import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { TopBar } from "@/components/buyer/TopBar";
import { StoreCard } from "@/components/buyer/StoreCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { haversineDistanceKm } from "@/lib/utils";
import { isStoreOpen } from "@/lib/store-helpers";
import type { StoreSummary } from "@/types";

export const dynamic = "force-dynamic";

const CATEGORY_EMOJI: Record<string, string> = {
  fashion: "👗",
  food: "🍔",
  electronics: "💻",
  beauty: "💄",
  furniture: "🛋️",
  grocery: "🛒",
};

export default async function BuyerHomePage() {
  const user = await getCurrentUser();

  const location = await prisma.location.findFirst({
    where: { userId: user!.id },
    orderBy: [{ isCurrent: "desc" }, { createdAt: "desc" }],
  });

  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    take: 8,
  });

  const stores = await prisma.store.findMany({
    where: { status: "APPROVED", city: location ? { equals: location.city, mode: "insensitive" } : undefined },
    include: { category: true, hours: true },
    take: 20,
  });

  const summaries: StoreSummary[] = stores.map((store) => ({
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

  const nearby = [...summaries].sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  const popular = [...summaries].sort((a, b) => b.ratingCount - a.ratingCount || b.ratingAvg - a.ratingAvg);

  return (
    <div className="animate-fade-in">
      <TopBar locationLabel={location ? `${location.area ? `${location.area}, ` : ""}${location.city}` : "Set your location"} />

      <div className="page-container space-y-7 px-4 py-5 lg:space-y-10 lg:py-8">
        <section>
          <SectionHeader title="Nearby Stores" href="/buyer/categories" />
          {nearby.length === 0 ? (
            <EmptyState
              icon={Compass}
              title="No stores here yet"
              description="We're still onboarding sellers in your area. Check back soon!"
            />
          ) : (
            <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-5 lg:overflow-visible lg:px-0 xl:grid-cols-5">
              {nearby.map((store) => (
                <div key={store.id} className="w-[220px] shrink-0 lg:w-auto lg:shrink">
                  <StoreCard store={store} />
                </div>
              ))}
            </div>
          )}
        </section>

        {popular.length > 0 && (
          <section>
            <SectionHeader title="Popular Stores" href="/buyer/categories?sort=popular" />
            <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-5 lg:overflow-visible lg:px-0 xl:grid-cols-5">
              {popular.map((store) => (
                <div key={store.id} className="w-[220px] shrink-0 lg:w-auto lg:shrink">
                  <StoreCard store={store} />
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <SectionHeader title="Categories" href="/buyer/categories" />
          <div className="grid grid-cols-4 gap-3 lg:grid-cols-8 lg:gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/buyer/categories?slug=${cat.slug}`}
                className="flex flex-col items-center gap-1.5 rounded-2xl border border-zinc-100 bg-white py-3 shadow-card transition hover:-translate-y-0.5 hover:shadow-elevated active:scale-95 lg:py-5"
              >
                <span className="text-2xl lg:text-3xl">{CATEGORY_EMOJI[cat.slug] ?? "🏬"}</span>
                <span className="text-[11px] font-semibold text-zinc-700 lg:text-sm">{cat.name}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function SectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-base font-bold text-zinc-900">{title}</h2>
      <Link href={href} className="flex items-center gap-0.5 text-xs font-semibold text-brand-600">
        See all <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
