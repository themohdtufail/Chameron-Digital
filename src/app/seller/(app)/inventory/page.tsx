"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import toast from "react-hot-toast";
import { Boxes, ImageOff, Minus, Plus, History, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

interface VariantRow {
  id: string;
  type: string;
  value: string;
  stockQuantity: number;
  sku: string | null;
}

interface ProductRow {
  id: string;
  name: string;
  sku: string | null;
  imageUrl: string | null;
  stockQuantity: number;
  lowStockThreshold: number;
  trackInventory: boolean;
  totalStock: number;
  isLow: boolean;
  isOut: boolean;
  variants: VariantRow[];
}

interface LogRow {
  id: string;
  change: number;
  reason: string;
  note: string | null;
  createdAt: string;
  actor: { name: string | null } | null;
  variant: { type: string; value: string } | null;
}

const FILTERS = [
  { value: "all", label: "All" },
  { value: "low", label: "Low stock" },
  { value: "out", label: "Out of stock" },
];

export default function InventoryPage() {
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState(searchParams.get("filter") || "all");
  const [products, setProducts] = useState<ProductRow[] | null>(null);
  const [counts, setCounts] = useState({ total: 0, low: 0, out: 0 });
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [historyFor, setHistoryFor] = useState<ProductRow | null>(null);
  const [history, setHistory] = useState<LogRow[] | null>(null);

  async function load() {
    const res = await fetch(`/api/seller/inventory?filter=${filter}`, { cache: "no-store" });
    const data = await res.json();
    setProducts(data.products ?? []);
    setCounts(data.counts ?? { total: 0, low: 0, out: 0 });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function adjust(productId: string, variantId: string | null, delta: number) {
    const key = variantId ?? productId;
    setBusyKey(key);
    const res = await fetch("/api/seller/inventory/adjust", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, variantId, delta }),
    });
    setBusyKey(null);
    if (!res.ok) {
      toast.error((await res.json()).error || "Could not adjust stock");
      return;
    }
    load();
  }

  async function openHistory(product: ProductRow) {
    setHistoryFor(product);
    setHistory(null);
    const res = await fetch(`/api/seller/inventory/${product.id}/history`);
    const data = await res.json();
    setHistory(data.logs ?? []);
  }

  return (
    <div className="animate-fade-in px-4 py-5 lg:px-10 lg:py-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-1 text-lg font-extrabold text-zinc-900 lg:text-2xl">Inventory</h1>
        <p className="mb-4 text-sm text-zinc-500">
          {counts.total} products · {counts.low} low stock · {counts.out} out of stock
        </p>

        <div className="mb-4 flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition",
                filter === f.value ? "border-brand-600 bg-brand-600 text-white" : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {!products && (
          <div className="space-y-2">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}

        {products && products.length === 0 && (
          <EmptyState icon={Boxes} title="Nothing here" description="No products match this filter." />
        )}

        {products && products.length > 0 && (
          <div className="space-y-2">
            {products.map((p) => (
              <div key={p.id} className="rounded-2xl border border-zinc-100 bg-white p-3 shadow-card">
                <div className="flex items-center gap-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-zinc-50">
                    {p.imageUrl ? (
                      <Image src={p.imageUrl} alt="" fill className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ImageOff className="h-4 w-4 text-zinc-300" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-zinc-900">{p.name}</p>
                    <p className="text-xs text-zinc-500">{p.sku ? `SKU: ${p.sku} · ` : ""}Total stock: {p.totalStock}</p>
                    <div className="mt-1 flex gap-1.5">
                      {p.isOut && <Badge tone="danger">Out of stock</Badge>}
                      {!p.isOut && p.isLow && <Badge tone="accent">Low stock</Badge>}
                      {!p.trackInventory && <Badge tone="neutral">Not tracked</Badge>}
                    </div>
                  </div>
                  <button onClick={() => openHistory(p)} className="text-zinc-400 hover:text-brand-600" aria-label="View history">
                    <History className="h-4 w-4" />
                  </button>
                </div>

                {p.variants.length === 0 ? (
                  <div className="mt-3 flex items-center justify-between rounded-xl border border-zinc-100 px-3 py-2">
                    <span className="text-xs font-medium text-zinc-500">Stock quantity</span>
                    <StepControl
                      value={p.stockQuantity}
                      busy={busyKey === p.id}
                      onChange={(delta) => adjust(p.id, null, delta)}
                    />
                  </div>
                ) : (
                  <div className="mt-3 space-y-1.5">
                    {p.variants.map((v) => (
                      <div key={v.id} className="flex items-center justify-between rounded-xl border border-zinc-100 px-3 py-2">
                        <span className="text-xs font-medium text-zinc-500">{v.type}: {v.value}</span>
                        <StepControl
                          value={v.stockQuantity}
                          busy={busyKey === v.id}
                          onChange={(delta) => adjust(p.id, v.id, delta)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {historyFor && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 lg:items-center" onClick={() => setHistoryFor(null)}>
          <div
            className="max-h-[80dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-4 lg:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-zinc-900">{historyFor.name} — stock history</h2>
              <button onClick={() => setHistoryFor(null)} className="text-zinc-400 hover:text-zinc-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            {!history && <Skeleton className="h-32 w-full" />}
            {history && history.length === 0 && <p className="py-8 text-center text-sm text-zinc-400">No stock changes yet.</p>}
            {history && history.length > 0 && (
              <div className="divide-y divide-zinc-100">
                {history.map((log) => (
                  <div key={log.id} className="flex items-center justify-between py-2.5 text-sm">
                    <div>
                      <p className="font-medium text-zinc-800">
                        {log.reason === "ORDER" ? "Order" : log.reason === "MANUAL" ? "Manual adjustment" : log.reason}
                        {log.variant && <span className="text-zinc-400"> · {log.variant.type}: {log.variant.value}</span>}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {new Date(log.createdAt).toLocaleString()}
                        {log.actor?.name ? ` · ${log.actor.name}` : ""}
                        {log.note ? ` · ${log.note}` : ""}
                      </p>
                    </div>
                    <span className={cn("font-bold", log.change > 0 ? "text-success-600" : "text-danger-600")}>
                      {log.change > 0 ? `+${log.change}` : log.change}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StepControl({ value, busy, onChange }: { value: number; busy: boolean; onChange: (delta: number) => void }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-zinc-200 px-1.5 py-1">
      <button
        disabled={busy || value <= 0}
        onClick={() => onChange(-1)}
        className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-100 disabled:opacity-30"
      >
        <Minus className="h-3 w-3" />
      </button>
      <span className="w-8 text-center text-sm font-bold">{value}</span>
      <button
        disabled={busy}
        onClick={() => onChange(1)}
        className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-100"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}
