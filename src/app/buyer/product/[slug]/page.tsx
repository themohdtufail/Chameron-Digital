import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ProductDetailClient } from "@/components/buyer/ProductDetailClient";
import { ProductCard } from "@/components/buyer/ProductCard";
import { WishlistButton } from "@/components/buyer/WishlistButton";
import { ShareButton } from "@/components/buyer/ShareButton";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  const user = await getCurrentUser();

  // Legacy id-based links (shared, bookmarked, indexed before the slug-based
  // URL migration — see section 12: no exposed DB ids in buyer-facing URLs)
  // still resolve: fall back to an id lookup and 301 to the canonical slug.
  const product = await prisma.product.findUnique({
    where: { slug: params.slug },
    include: {
      images: { orderBy: { position: "asc" } },
      variants: true,
      store: { select: { slug: true, name: true, status: true } },
    },
  });

  if (!product) {
    const byId = await prisma.product.findUnique({ where: { id: params.slug }, select: { slug: true } });
    if (byId) permanentRedirect(`/buyer/product/${byId.slug}`);
  }

  if (!product || product.isHidden || product.store.status !== "APPROVED") notFound();

  if (user) {
    // Fire-and-forget: powers the "Recently viewed" row on the buyer home page.
    prisma.analyticsEvent
      .create({ data: { type: "product_view", userId: user.id, storeId: product.storeId, productId: product.id } })
      .catch(() => {});
  }

  const [isWishlisted, moreFromStore, relatedProducts] = await Promise.all([
    user
      ? prisma.wishlist
          .findUnique({ where: { buyerId_productId: { buyerId: user.id, productId: product.id } } })
          .then(Boolean)
      : Promise.resolve(false),
    prisma.product.findMany({
      where: { storeId: product.storeId, id: { not: product.id }, isHidden: false },
      include: { images: { orderBy: { position: "asc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    product.categoryId
      ? prisma.product.findMany({
          where: {
            categoryId: product.categoryId,
            storeId: { not: product.storeId },
            id: { not: product.id },
            isHidden: false,
            store: { status: "APPROVED" },
          },
          include: { images: { orderBy: { position: "asc" }, take: 1 }, store: { select: { slug: true, name: true } } },
          orderBy: { createdAt: "desc" },
          take: 8,
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="app-shell relative min-h-dvh">
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-zinc-100 bg-white/95 px-4 py-3 backdrop-blur">
        <Link href={`/buyer/store/${product.store.slug}`}>
          <ArrowLeft className="h-5 w-5 text-zinc-700" />
        </Link>
        <p className="flex-1 truncate text-sm font-semibold text-zinc-500">{product.store.name}</p>
        <WishlistButton
          productId={product.id}
          initialWishlisted={isWishlisted}
          className="static h-9 w-9 bg-transparent shadow-none hover:bg-zinc-100"
        />
        <ShareButton title={product.name} />
      </div>

      <ProductDetailClient
        product={{
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          discountPrice: product.discountPrice,
          stockQuantity: product.stockQuantity,
          status: product.status,
          videoUrl: product.videoUrl,
          specifications: (product.specifications as Record<string, string> | null) ?? null,
          images: product.images,
          variants: product.variants,
        }}
      />

      {moreFromStore.length > 0 && (
        <section className="px-4 pb-6 lg:mx-auto lg:max-w-6xl lg:px-8">
          <h2 className="mb-3 text-sm font-bold text-zinc-900">More from {product.store.name}</h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5 xl:grid-cols-6">
            {moreFromStore.map((p) => (
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
                }}
              />
            ))}
          </div>
        </section>
      )}

      {relatedProducts.length > 0 && (
        <section className="px-4 pb-8 lg:mx-auto lg:max-w-6xl lg:px-8">
          <h2 className="mb-3 text-sm font-bold text-zinc-900">You may also like</h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5 xl:grid-cols-6">
            {relatedProducts.map((p) => (
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
                  storeSlug: p.store.slug,
                  storeName: p.store.name,
                }}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
