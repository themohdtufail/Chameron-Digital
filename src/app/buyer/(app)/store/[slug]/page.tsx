import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Store as StoreIcon } from "lucide-react";
import { prisma } from "@/lib/db";
import { RatingStars } from "@/components/ui/RatingStars";
import { Badge } from "@/components/ui/Badge";
import { StoreActions } from "@/components/buyer/StoreActions";
import { StoreProductBrowser } from "@/components/buyer/StoreProductBrowser";
import { isStoreOpen } from "@/lib/store-helpers";

export const dynamic = "force-dynamic";

export default async function StorePage({ params }: { params: { slug: string } }) {
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

  if (!store || store.status !== "APPROVED") notFound();

  const openNow = isStoreOpen(store);

  return (
    <div className="animate-fade-in pb-6">
      <div className="relative h-44 w-full bg-zinc-100 lg:h-64">
        {store.coverUrl ? (
          <Image src={store.coverUrl} alt={store.name} fill className="object-cover" priority />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-100 to-brand-50">
            <StoreIcon className="h-10 w-10 text-brand-300" />
          </div>
        )}
        <Link
          href="/buyer/home"
          className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-card lg:hidden"
        >
          <ArrowLeft className="h-[18px] w-[18px] text-zinc-700" />
        </Link>
      </div>

      <div className="page-container">
        <div className="px-4 lg:px-8">
          <div className="-mt-8 flex items-end gap-3 lg:-mt-10">
            <div className="h-16 w-16 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-elevated lg:h-20 lg:w-20">
              {store.logoUrl ? (
                <Image src={store.logoUrl} alt="" width={80} height={80} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-brand-50">
                  <StoreIcon className="h-6 w-6 text-brand-300" />
                </div>
              )}
            </div>
            <Badge tone={openNow ? "success" : "danger"} className="mb-1">
              {openNow ? "Open now" : "Closed"}
            </Badge>
          </div>

          <h1 className="mt-3 text-xl font-extrabold text-zinc-900 lg:text-3xl">{store.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-500">
            <RatingStars rating={store.ratingAvg} count={store.ratingCount} size="md" />
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {store.area ? `${store.area}, ` : ""}
              {store.city}
            </span>
            {store.category && <span>{store.category.name}</span>}
          </div>
          {store.description && (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600">{store.description}</p>
          )}

          <div className="mt-4 lg:max-w-xs">
            <StoreActions phone={store.phone} storeName={store.name} />
          </div>
        </div>

        <div className="mt-5">
          <StoreProductBrowser
            productCategories={store.productCategories.map((c) => ({ id: c.id, name: c.name }))}
            products={store.products.map((p) => ({
              id: p.id,
              slug: p.slug,
              name: p.name,
              description: p.description,
              price: p.price,
              discountPrice: p.discountPrice,
              status: p.status,
              imageUrl: p.images[0]?.url ?? null,
              categoryId: p.categoryId,
            }))}
          />
        </div>
      </div>
    </div>
  );
}
