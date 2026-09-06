"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import { Store as StoreIcon, Check, X, Ban } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";

interface StoreRow {
  id: string;
  name: string;
  city: string;
  logoUrl: string | null;
  status: "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "SUSPENDED";
  owner: { name: string | null; phone: string };
  category: { name: string } | null;
  _count: { products: number; orders: number };
}

const TABS = ["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED", "SUSPENDED"] as const;

const STATUS_TONE = {
  PENDING: "accent",
  UNDER_REVIEW: "accent",
  APPROVED: "success",
  REJECTED: "danger",
  SUSPENDED: "neutral",
} as const;

export default function AdminSellersPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("PENDING");
  const [stores, setStores] = useState<StoreRow[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setStores(null);
    const res = await fetch(`/api/admin/stores?status=${tab}`, { cache: "no-store" });
    const data = await res.json();
    setStores(data.stores ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function updateStatus(id: string, status: string) {
    setBusyId(id);
    const res = await fetch(`/api/admin/stores/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusyId(null);
    if (!res.ok) {
      toast.error("Could not update store");
      return;
    }
    toast.success(`Store ${status.toLowerCase()}`);
    load();
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-extrabold text-zinc-900">Sellers</h1>

      <div className="mb-4 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-semibold transition",
              tab === t ? "border-brand-600 bg-brand-600 text-white" : "border-zinc-200 text-zinc-600"
            )}
          >
            {t.charAt(0) + t.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {!stores && (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {stores && stores.length === 0 && (
        <EmptyState icon={StoreIcon} title="Nothing here" description="No stores in this category yet." />
      )}

      {stores && stores.length > 0 && (
        <div className="space-y-3">
          {stores.map((s) => (
            <div key={s.id} className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-card">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-zinc-50">
                {s.logoUrl ? (
                  <Image src={s.logoUrl} alt="" fill className="object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <StoreIcon className="h-5 w-5 text-zinc-300" />
                  </div>
                )}
              </div>
              <Link href={`/admin/sellers/${s.id}`} className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-zinc-900 hover:underline">{s.name}</p>
                <p className="text-xs text-zinc-500">
                  {s.owner.name ?? s.owner.phone} · {s.city} · {s.category?.name ?? "Uncategorized"}
                </p>
                <p className="text-xs text-zinc-400">
                  {s._count.products} products · {s._count.orders} orders
                </p>
              </Link>
              <Badge tone={STATUS_TONE[s.status]}>{s.status}</Badge>
              <div className="flex shrink-0 gap-1.5">
                {s.status === "PENDING" && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === s.id}
                    onClick={() => updateStatus(s.id, "UNDER_REVIEW")}
                  >
                    Review
                  </Button>
                )}
                {s.status !== "APPROVED" && (
                  <Button size="sm" disabled={busyId === s.id} onClick={() => updateStatus(s.id, "APPROVED")}>
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                )}
                {s.status !== "REJECTED" && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === s.id}
                    onClick={() => updateStatus(s.id, "REJECTED")}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
                {s.status === "APPROVED" && (
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={busyId === s.id}
                    onClick={() => updateStatus(s.id, "SUSPENDED")}
                  >
                    <Ban className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
