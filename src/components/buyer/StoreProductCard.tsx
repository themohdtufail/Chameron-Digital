"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImageOff } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { AddToCartButton } from "@/components/buyer/AddToCartButton";
import { formatCurrency } from "@/lib/utils";
import type { ProductSummary } from "@/types";

export function StoreProductCard({ product }: { product: ProductSummary }) {
  const router = useRouter();
  const discountPct =
    product.discountPrice && product.discountPrice < product.price
      ? Math.round(100 - (product.discountPrice / product.price) * 100)
      : null;
  const href = `/buyer/product/${product.slug}`;

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => router.push(href)}
      onKeyDown={(e) => e.key === "Enter" && router.push(href)}
      className="cursor-pointer overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-card transition active:scale-[0.98]"
    >
      <div className="relative aspect-square w-full bg-zinc-50">
        {product.imageUrl ? (
          <Image src={product.imageUrl} alt={product.name} fill className="object-cover" sizes="200px" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageOff className="h-6 w-6 text-zinc-300" />
          </div>
        )}
        {discountPct && (
          <span className="absolute left-2 top-2 rounded-md bg-accent-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {discountPct}% OFF
          </span>
        )}
        {product.status !== "AVAILABLE" && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <Badge tone="danger">Out of stock</Badge>
          </div>
        )}
      </div>
      <div className="p-2.5">
        <p className="line-clamp-1 text-sm font-semibold text-zinc-900">{product.name}</p>
        {product.description && (
          <p className="line-clamp-1 text-xs text-zinc-500">{product.description}</p>
        )}
        <div className="mt-1 flex items-center gap-1.5">
          <span className="text-sm font-bold text-zinc-900">
            {formatCurrency(product.discountPrice ?? product.price)}
          </span>
          {product.discountPrice && (
            <span className="text-xs text-zinc-400 line-through">{formatCurrency(product.price)}</span>
          )}
        </div>
        <div className="mt-2">
          <AddToCartButton productId={product.id} size="sm" fullWidth disabled={product.status !== "AVAILABLE"} />
        </div>
      </div>
    </div>
  );
}
