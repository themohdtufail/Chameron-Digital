"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProductForm, type ProductFormValue } from "@/components/seller/ProductForm";

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [initial, setInitial] = useState<ProductFormValue | null>(null);

  useEffect(() => {
    (async () => {
      const [catRes, productRes] = await Promise.all([
        fetch("/api/seller/product-categories"),
        fetch(`/api/seller/products/${params.id}`),
      ]);
      const cats = await catRes.json();
      const { product } = await productRes.json();
      setCategories(cats.categories ?? []);
      setInitial({
        name: product.name,
        categoryId: product.categoryId ?? "",
        description: product.description ?? "",
        price: String(product.price),
        discountPrice: product.discountPrice ? String(product.discountPrice) : "",
        stockQuantity: String(product.stockQuantity),
        status: product.status,
        images: product.images.map((i: { url: string }) => i.url),
        videoUrl: product.videoUrl,
        variants: product.variants.map((v: { type: string; value: string; priceDelta: number; stockQuantity: number }) => ({
          type: v.type,
          value: v.value,
          priceDelta: v.priceDelta,
          stockQuantity: v.stockQuantity,
        })),
        specs: Object.entries((product.specifications as Record<string, string>) ?? {}).map(([key, value]) => ({
          key,
          value,
        })),
      });
    })();
  }, [params.id]);

  return (
    <div className="animate-fade-in px-4 py-5">
      <div className="mb-4 flex items-center gap-3">
        <Link href="/seller/products">
          <ArrowLeft className="h-5 w-5 text-zinc-700" />
        </Link>
        <h1 className="text-lg font-extrabold text-zinc-900">Edit product</h1>
      </div>
      {initial ? (
        <ProductForm categories={categories} initial={initial} productId={params.id} />
      ) : (
        <p className="text-center text-sm text-zinc-400">Loading…</p>
      )}
    </div>
  );
}
