"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import { Plus, ImageOff, Pencil, Trash2, EyeOff, Eye, Package } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatCurrency } from "@/lib/utils";

interface ProductRow {
  id: string;
  name: string;
  price: number;
  discountPrice: number | null;
  status: "AVAILABLE" | "OUT_OF_STOCK" | "HIDDEN";
  isHidden: boolean;
  stockQuantity: number;
  images: { url: string }[];
  category: { name: string } | null;
}

export default function SellerProductsPage() {
  const [products, setProducts] = useState<ProductRow[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/seller/products", { cache: "no-store" });
    const data = await res.json();
    setProducts(data.products ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleHidden(product: ProductRow) {
    setBusyId(product.id);
    const res = await fetch(`/api/seller/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isHidden: !product.isHidden }),
    });
    setBusyId(null);
    if (!res.ok) {
      toast.error("Could not update product");
      return;
    }
    toast.success(product.isHidden ? "Product is now visible" : "Product hidden");
    load();
  }

  async function remove(product: ProductRow) {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    setBusyId(product.id);
    const res = await fetch(`/api/seller/products/${product.id}`, { method: "DELETE" });
    setBusyId(null);
    if (!res.ok) {
      toast.error("Could not delete product");
      return;
    }
    toast.success("Product deleted");
    load();
  }

  return (
    <div className="animate-fade-in px-4 py-5">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-extrabold text-zinc-900">Products</h1>
        <Link href="/seller/products/new">
          <Button size="sm">
            <Plus className="h-4 w-4" /> Add
          </Button>
        </Link>
      </div>

      {!products && (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}

      {products && products.length === 0 && (
        <EmptyState
          icon={Package}
          title="No products yet"
          description="Add your first product to start selling."
          action={
            <Link href="/seller/products/new">
              <Button>Add product</Button>
            </Link>
          }
        />
      )}

      {products && products.length > 0 && (
        <div className="space-y-3">
          {products.map((p) => (
            <div key={p.id} className="flex gap-3 rounded-2xl border border-zinc-100 bg-white p-3 shadow-card">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-zinc-50">
                {p.images[0] ? (
                  <Image src={p.images[0].url} alt="" fill className="object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ImageOff className="h-5 w-5 text-zinc-300" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-zinc-900">{p.name}</p>
                <p className="text-xs text-zinc-500">{p.category?.name ?? "Uncategorized"} · Stock: {p.stockQuantity}</p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="text-sm font-bold text-zinc-900">{formatCurrency(p.discountPrice ?? p.price)}</span>
                  {p.discountPrice && <span className="text-xs text-zinc-400 line-through">{formatCurrency(p.price)}</span>}
                </div>
                <div className="mt-1 flex gap-1.5">
                  <Badge tone={p.status === "AVAILABLE" ? "success" : "danger"}>{p.status.replace("_", " ")}</Badge>
                  {p.isHidden && <Badge tone="neutral">Hidden</Badge>}
                </div>
              </div>
              <div className="flex flex-col items-center justify-center gap-2">
                <Link href={`/seller/products/${p.id}/edit`} className="text-zinc-400 hover:text-brand-600">
                  <Pencil className="h-4 w-4" />
                </Link>
                <button disabled={busyId === p.id} onClick={() => toggleHidden(p)} className="text-zinc-400 hover:text-brand-600">
                  {p.isHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button disabled={busyId === p.id} onClick={() => remove(p)} className="text-zinc-400 hover:text-danger-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
