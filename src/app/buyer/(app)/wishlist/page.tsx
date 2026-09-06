import Link from "next/link";
import { ArrowLeft, Heart } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ProductCard } from "@/components/buyer/ProductCard";
import { EmptyState } from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const user = await getCurrentUser();
  const items = await prisma.wishlist.findMany({
    where: { buyerId: user!.id },
    include: {
      product: {
        include: { images: { orderBy: { position: "asc" }, take: 1 }, store: { select: { slug: true, name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const products = items
    .filter((w) => !w.product.isHidden)
    .map((w) => ({
      id: w.product.id,
      slug: w.product.slug,
      name: w.product.name,
      description: w.product.description,
      price: w.product.price,
      discountPrice: w.product.discountPrice,
      status: w.product.status,
      imageUrl: w.product.images[0]?.url ?? null,
      storeSlug: w.product.store.slug,
      storeName: w.product.store.name,
      isWishlisted: true,
    }));

  return (
    <div className="animate-fade-in pb-10">
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-zinc-100 bg-white/95 px-4 py-4 backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:backdrop-blur-none">
        <div className="page-container flex items-center gap-3 lg:px-8">
          <Link href="/buyer/home" className="lg:hidden">
            <ArrowLeft className="h-5 w-5 text-zinc-700" />
          </Link>
          <h1 className="text-lg font-extrabold text-zinc-900 lg:text-2xl">Wishlist</h1>
        </div>
      </div>

      <div className="page-container px-4 py-4 lg:px-8 lg:py-6">
        {products.length === 0 ? (
          <EmptyState
            icon={Heart}
            title="Your wishlist is empty"
            description="Tap the heart on any product to save it here for later."
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5 xl:grid-cols-5">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
