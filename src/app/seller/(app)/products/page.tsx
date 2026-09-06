"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import { Plus, ImageOff, Pencil, Trash2, EyeOff, Eye, Package, CheckSquare, Square } from "lucide-react";
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
  const [bulkBusy, setBulkBusy] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  async function load() {
    const res = await fetch("/api/seller/products", { cache: "no-store" });
    const data = await res.json();
    setProducts(data.products ?? []);
    setSelected(new Set());
  }

  useEffect(() => {
    load();
  }, []);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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

  async function bulkHide(hide: boolean) {
    setBulkBusy(true);
    await Promise.all(
      Array.from(selected).map((id) =>
        fetch(`/api/seller/products/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isHidden: hide }),
        })
      )
    );
    setBulkBusy(false);
    toast.success(hide ? "Products hidden" : "Products made visible");
    load();
  }

  async function bulkDelete() {
    if (!window.confirm(`Delete ${selected.size} product(s)? This cannot be undone.`)) return;
    setBulkBusy(true);
    await Promise.all(Array.from(selected).map((id) => fetch(`/api/seller/products/${id}`, { method: "DELETE" })));
    setBulkBusy(false);
    toast.success("Products deleted");
    load();
  }

  return (
    <div className="animate-fade-in px-4 py-5 lg:px-10 lg:py-8">
      <div className="mx-auto max-w-6xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-extrabold text-zinc-900 lg:text-2xl">Products</h1>
        <Link href="/seller/products/new">
          <Button size="sm">
            <Plus className="h-4 w-4" /> Add
          </Button>
        </Link>
      </div>

      {products && products.length > 0 && selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3.5 py-2.5">
          <span className="text-xs font-semibold text-brand-700">{selected.size} selected</span>
          <button
            disabled={bulkBusy}
            onClick={() => bulkHide(true)}
            className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Hide
          </button>
          <button
            disabled={bulkBusy}
            onClick={() => bulkHide(false)}
            className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Unhide
          </button>
          <button
            disabled={bulkBusy}
            onClick={bulkDelete}
            className="rounded-lg border border-danger-200 bg-white px-2.5 py-1 text-xs font-semibold text-danger-600 hover:bg-danger-50"
          >
            Delete
          </button>
        </div>
      )}

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
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {products.map((p) => (
            <div key={p.id} className="flex gap-3 rounded-2xl border border-zinc-100 bg-white p-3 shadow-card">
              <button onClick={() => toggleSelect(p.id)} className="shrink-0 self-start pt-1 text-zinc-300 hover:text-brand-600">
                {selected.has(p.id) ? <CheckSquare className="h-5 w-5 text-brand-600" /> : <Square className="h-5 w-5" />}
              </button>
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
    </div>
  );
}
