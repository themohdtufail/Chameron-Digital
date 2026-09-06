"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ImageOff, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency, cn } from "@/lib/utils";
import { addToCart } from "@/components/buyer/AddToCartButton";

interface Variant {
  id: string;
  type: "SIZE" | "COLOR" | "MATERIAL";
  value: string;
  priceDelta: number;
  stockQuantity: number;
}

interface ProductDetail {
  id: string;
  name: string;
  description: string | null;
  price: number;
  discountPrice: number | null;
  stockQuantity: number;
  status: "AVAILABLE" | "OUT_OF_STOCK" | "HIDDEN";
  videoUrl: string | null;
  specifications: Record<string, string> | null;
  images: { id: string; url: string }[];
  variants: Variant[];
}

const TYPE_LABEL: Record<Variant["type"], string> = { SIZE: "Size", COLOR: "Color", MATERIAL: "Material" };

export function ProductDetailClient({ product }: { product: ProductDetail }) {
  const router = useRouter();
  const [activeImage, setActiveImage] = useState(0);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState<"cart" | "buy" | null>(null);

  const groups = useMemo(() => {
    const map = new Map<Variant["type"], Variant[]>();
    for (const v of product.variants) {
      if (!map.has(v.type)) map.set(v.type, []);
      map.get(v.type)!.push(v);
    }
    return Array.from(map.entries());
  }, [product.variants]);

  const selectedVariant = useMemo(() => {
    const chosenId = Object.values(selected).at(-1);
    return product.variants.find((v) => v.id === chosenId);
  }, [selected, product.variants]);

  const basePrice = product.discountPrice ?? product.price;
  const unitPrice = basePrice + (selectedVariant?.priceDelta ?? 0);
  const maxStock = selectedVariant ? selectedVariant.stockQuantity : product.stockQuantity;
  const outOfStock = product.status !== "AVAILABLE" || maxStock <= 0;

  async function handleBuyNow() {
    setLoading("buy");
    const ok = await addToCart(product.id, { variantId: selectedVariant?.id, quantity });
    setLoading(null);
    if (!ok) return;
    router.push("/buyer/checkout");
  }

  return (
    <div className="pb-28 lg:pb-16">
      <div className="lg:mx-auto lg:grid lg:max-w-6xl lg:grid-cols-2 lg:gap-12 lg:px-8 lg:pt-8">
        <div className="lg:sticky lg:top-24 lg:h-fit">
          <div className="relative aspect-square w-full bg-zinc-50 lg:rounded-2xl">
            {product.images.length > 0 ? (
              <Image src={product.images[activeImage].url} alt={product.name} fill className="object-cover lg:rounded-2xl" priority />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <ImageOff className="h-10 w-10 text-zinc-300" />
              </div>
            )}
          </div>

          {product.images.length > 1 && (
            <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3 lg:px-0">
              {product.images.map((img, idx) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImage(idx)}
                  className={cn(
                    "relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2",
                    idx === activeImage ? "border-brand-600" : "border-transparent"
                  )}
                >
                  <Image src={img.url} alt="" fill className="object-cover" />
                </button>
              ))}
            </div>
          )}

          {product.videoUrl && (
            <div className="px-4 pb-2 lg:px-0">
              <video src={product.videoUrl} controls className="w-full rounded-xl bg-black" />
            </div>
          )}
        </div>

      <div className="px-4 pt-2 lg:px-0 lg:pt-0">
        <h1 className="text-xl font-extrabold text-zinc-900 lg:text-2xl">{product.name}</h1>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-2xl font-extrabold text-zinc-900">{formatCurrency(unitPrice)}</span>
          {product.discountPrice && (
            <>
              <span className="text-sm text-zinc-400 line-through">{formatCurrency(product.price)}</span>
              <Badge tone="accent">
                {Math.round(100 - (product.discountPrice / product.price) * 100)}% OFF
              </Badge>
            </>
          )}
        </div>
        {outOfStock && (
          <p className="mt-2">
            <Badge tone="danger">Out of stock</Badge>
          </p>
        )}

        {product.description && (
          <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-zinc-600">{product.description}</p>
        )}

        {groups.map(([type, options]) => (
          <div key={type} className="mt-5">
            <p className="mb-2 text-sm font-semibold text-zinc-800">{TYPE_LABEL[type]}</p>
            <div className="flex flex-wrap gap-2">
              {options.map((opt) => (
                <button
                  key={opt.id}
                  disabled={opt.stockQuantity <= 0}
                  onClick={() => setSelected((s) => ({ ...s, [type]: opt.id }))}
                  className={cn(
                    "rounded-xl border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40",
                    selected[type] === opt.id
                      ? "border-brand-600 bg-brand-50 text-brand-700"
                      : "border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                  )}
                >
                  {opt.value}
                </button>
              ))}
            </div>
          </div>
        ))}

        {product.specifications && Object.keys(product.specifications).length > 0 && (
          <div className="mt-5">
            <p className="mb-2 text-sm font-semibold text-zinc-800">Specifications</p>
            <dl className="divide-y divide-zinc-100 rounded-xl border border-zinc-100">
              {Object.entries(product.specifications).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 px-3.5 py-2.5 text-sm">
                  <dt className="text-zinc-500">{k}</dt>
                  <dd className="text-right font-medium text-zinc-800">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        <div className="mt-5 flex items-center gap-3">
          <p className="text-sm font-semibold text-zinc-800">Quantity</p>
          <div className="flex items-center gap-3 rounded-xl border border-zinc-200 px-2 py-1">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="w-5 text-center text-sm font-bold">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => Math.min(maxStock || 1, q + 1))}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="hidden gap-3 lg:mt-8 lg:flex">
          <Button
            variant="outline"
            size="lg"
            className="flex-1"
            disabled={outOfStock}
            loading={loading === "cart"}
            onClick={async () => {
              setLoading("cart");
              const ok = await addToCart(product.id, { variantId: selectedVariant?.id, quantity });
              setLoading(null);
              if (ok) {
                toast.success("Added to cart");
                router.refresh();
              }
            }}
          >
            Add to cart
          </Button>
          <Button size="lg" className="flex-1" disabled={outOfStock} loading={loading === "buy"} onClick={handleBuyNow}>
            Buy now
          </Button>
        </div>
      </div>
      </div>

      <div className="action-bar fixed inset-x-0 bottom-0 z-40 flex gap-3 border-t border-zinc-100 p-4 lg:hidden">
        <Button
          variant="outline"
          size="lg"
          className="flex-1"
          disabled={outOfStock}
          loading={loading === "cart"}
          onClick={async () => {
            setLoading("cart");
            const ok = await addToCart(product.id, { variantId: selectedVariant?.id, quantity });
            setLoading(null);
            if (ok) {
              toast.success("Added to cart");
              router.refresh();
            }
          }}
        >
          Add to cart
        </Button>
        <Button
          size="lg"
          className="flex-1"
          disabled={outOfStock}
          loading={loading === "buy"}
          onClick={handleBuyNow}
        >
          Buy now
        </Button>
      </div>
    </div>
  );
}
