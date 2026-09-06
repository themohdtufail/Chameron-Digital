"use client";

import { useEffect, useState } from "react";
import { CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface PaymentRow {
  id: string;
  method: string;
  status: string;
  amount: number;
  currency: string;
  gateway: string | null;
  createdAt: string;
  order: {
    orderNumber: string;
    total: number;
    store: { name: string };
    buyer: { name: string | null; phone: string };
  };
}

const TABS = ["ALL", "PENDING", "PROCESSING", "PAID", "FAILED", "REFUNDED"] as const;

const STATUS_TONE: Record<string, "accent" | "success" | "danger" | "neutral"> = {
  PENDING: "accent",
  PROCESSING: "accent",
  PAID: "success",
  FAILED: "danger",
  REFUNDED: "neutral",
};

export default function AdminPaymentsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("ALL");
  const [payments, setPayments] = useState<PaymentRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPayments(null);
    const qs = tab === "ALL" ? "" : `?status=${tab}`;
    fetch(`/api/admin/payments${qs}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setPayments(d.payments ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [tab]);

  return (
    <div>
      <h1 className="mb-4 flex items-center gap-2 text-xl font-extrabold text-zinc-900">
        <CreditCard className="h-5 w-5" /> Payments
      </h1>

      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition",
              tab === t ? "border-brand-600 bg-brand-600 text-white" : "border-zinc-200 text-zinc-600"
            )}
          >
            {t.charAt(0) + t.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {!payments ? (
        <div className="space-y-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : payments.length === 0 ? (
        <EmptyState icon={CreditCard} title="No payments" description="No payments in this category yet." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-card">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-zinc-100 text-xs font-semibold uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Store</th>
                <th className="px-4 py-3">Buyer</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Gateway</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-semibold text-zinc-900">{p.order.orderNumber}</td>
                  <td className="px-4 py-3 text-zinc-600">{p.order.store.name}</td>
                  <td className="px-4 py-3 text-zinc-600">{p.order.buyer.name ?? p.order.buyer.phone}</td>
                  <td className="px-4 py-3 text-zinc-600">{p.method}</td>
                  <td className="px-4 py-3 text-zinc-500">{p.gateway ?? "—"}</td>
                  <td className="px-4 py-3 font-semibold text-zinc-900">{formatCurrency(p.amount)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[p.status] ?? "neutral"}>{p.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
