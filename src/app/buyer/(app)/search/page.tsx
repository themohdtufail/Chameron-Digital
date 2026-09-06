import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { SearchBar } from "@/components/buyer/SearchBar";
import { StoreCard } from "@/components/buyer/StoreCard";
import { ProductCard } from "@/components/buyer/ProductCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { isStoreOpen } from "@/lib/store-helpers";
import type { StoreSummary } from "@/types";

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = searchParams.q?.trim() || "";
  const user = await getCurrentUser();

  const [stores, products] = q
    ? await Promise.all([
        prisma.store.findMany({
          where: { status: "APPROVED", name: { contains: q, mode: "insensitive" } },
          include: { category: true, hours: true },
          take: 10,
        }),
        prisma.product.findMany({
          where: { isHidden: false, name: { contains: q, mode: "insensitive" }, store: { status: "APPROVED" } },
          include: { images: { take: 1, orderBy: { position: "asc" } }, store: true },
          take: 20,
        }),
      ])
    : [[], []];

  const wishlistIds = user
    ? new Set(
        (
          await prisma.wishlist.findMany({
            where: { buyerId: user.id, productId: { in: products.map((p) => p.id) } },
            select: { productId: true },
          })
        ).map((w) => w.productId)
      )
    : new Set<string>();

  const storeSummaries: StoreSummary[] = stores.map((store) => ({
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
    distanceKm: null,
    isOpenNow: isStoreOpen(store),
    deliveryAvailable: store.deliveryAvailable,
  }));

  return (
    <div className="animate-fade-in">
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-zinc-100 bg-white/95 px-4 pb-3 pt-4 backdrop-blur lg:hidden">
        <Link href="/buyer/home">
          <ArrowLeft className="h-5 w-5 text-zinc-600" />
        </Link>
        <div className="flex-1">
          <SearchBar defaultValue={q} />
        </div>
      </div>

      <div className="page-container space-y-6 px-4 py-5 lg:px-8 lg:py-8">
        {!q && (
          <p className="pt-10 text-center text-sm text-zinc-400">Search for stores or products to get started.</p>
        )}

        {q && storeSummaries.length === 0 && products.length === 0 && (
          <EmptyState icon={SearchX} title="No results" description={`We couldn't find anything for "${q}".`} />
        )}

        {storeSummaries.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-bold text-zinc-900">Stores</h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5 xl:grid-cols-5">
              {storeSummaries.map((s) => (
                <StoreCard key={s.id} store={s} />
              ))}
            </div>
          </section>
        )}

        {products.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-bold text-zinc-900">Products</h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5 xl:grid-cols-5">
              {products.map((p) => (
                <ProductCard
                  key={p.id}
                  product={{
                    id: p.id,
                    slug: p.slug,
                    name: p.name,
                    description: p.description,
                    price: p.price,
                    discountPrice: p.discountPrice,
                    status: p.status,
                    imageUrl: p.images[0]?.url ?? null,
                    isWishlisted: wishlistIds.has(p.id),
                  }}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
