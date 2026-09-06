"use client";

import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency } from "@/lib/utils";

interface PayoutRow {
  id: string;
  amount: number;
  status: string;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
}

const STATUS_TONE: Record<string, "accent" | "success" | "danger" | "neutral"> = {
  PENDING: "accent",
  PROCESSING: "accent",
  PAID: "success",
  FAILED: "danger",
  ON_HOLD: "neutral",
};

export default function SellerPayoutsPage() {
  const [data, setData] = useState<{ totalEarned: number; outstanding: number; payouts: PayoutRow[] } | null>(null);

  useEffect(() => {
    fetch("/api/seller/payouts", { cache: "no-store" })
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-4 flex items-center gap-2 text-xl font-extrabold text-zinc-900">
        <Wallet className="h-5 w-5" /> Payouts
      </h1>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-card">
          <p className="text-lg font-extrabold text-zinc-900">{formatCurrency(data.totalEarned)}</p>
          <p className="text-xs text-zinc-500">Lifetime earnings</p>
        </div>
        <div className="rounded-2xl border border-accent-100 bg-accent-50 p-4">
          <p className="text-lg font-extrabold text-accent-800">{formatCurrency(data.outstanding)}</p>
          <p className="text-xs text-accent-700">Outstanding balance</p>
        </div>
      </div>

      {data.payouts.length === 0 ? (
        <EmptyState icon={Wallet} title="No payouts yet" description="Payouts recorded by the platform will appear here." />
      ) : (
        <div className="space-y-2">
          {data.payouts.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-xl border border-zinc-100 bg-white p-3.5 shadow-card">
              <div>
                <p className="text-sm font-semibold text-zinc-900">{formatCurrency(p.amount)}</p>
                <p className="text-xs text-zinc-500">
                  {new Date(p.periodStart).toLocaleDateString()} – {new Date(p.periodEnd).toLocaleDateString()}
                </p>
              </div>
              <Badge tone={STATUS_TONE[p.status] ?? "neutral"}>{p.status.replace("_", " ")}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
