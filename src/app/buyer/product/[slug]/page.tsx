import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { ProductDetailClient } from "@/components/buyer/ProductDetailClient";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  const product = await prisma.product.findUnique({
    where: { slug: params.slug },
    include: {
      images: { orderBy: { position: "asc" } },
      variants: true,
      store: { select: { slug: true, name: true, status: true } },
    },
  });

  // Legacy id-based links (shared, bookmarked, indexed before the slug-based
  // URL migration — see section 12: no exposed DB ids in buyer-facing URLs)
  // still resolve: fall back to an id lookup and 301 to the canonical slug.
  if (!product) {
    const byId = await prisma.product.findUnique({ where: { id: params.slug }, select: { slug: true } });
    if (byId) permanentRedirect(`/buyer/product/${byId.slug}`);
  }

  if (!product || product.isHidden || product.store.status !== "APPROVED") notFound();

  return (
    <div className="app-shell relative min-h-dvh">
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-zinc-100 bg-white/95 px-4 py-3 backdrop-blur">
        <Link href={`/buyer/store/${product.store.slug}`}>
          <ArrowLeft className="h-5 w-5 text-zinc-700" />
        </Link>
        <p className="truncate text-sm font-semibold text-zinc-500">{product.store.name}</p>
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
    </div>
  );
}
