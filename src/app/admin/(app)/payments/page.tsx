"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { CreditCard, Undo2, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
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

const TABS = ["ALL", "PENDING", "PROCESSING", "PAID", "PARTIALLY_REFUNDED", "FAILED", "REFUNDED"] as const;

const STATUS_TONE: Record<string, "accent" | "success" | "danger" | "neutral"> = {
  PENDING: "accent",
  PROCESSING: "accent",
  PAID: "success",
  PARTIALLY_REFUNDED: "accent",
  FAILED: "danger",
  REFUNDED: "neutral",
};

const REFUNDABLE_STATUSES = new Set(["PAID", "PARTIALLY_REFUNDED"]);

export default function AdminPaymentsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("ALL");
  const [payments, setPayments] = useState<PaymentRow[] | null>(null);
  const [refundTarget, setRefundTarget] = useState<PaymentRow | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setPayments(null);
    const qs = tab === "ALL" ? "" : `?status=${tab}`;
    const res = await fetch(`/api/admin/payments${qs}`, { cache: "no-store" });
    const data = await res.json();
    setPayments(data.payments ?? []);
  }

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

  function openRefund(payment: PaymentRow) {
    setRefundTarget(payment);
    setRefundAmount(String(payment.amount));
    setRefundReason("");
  }

  async function submitRefund() {
    if (!refundTarget) return;
    const amount = Number(refundAmount);
    if (!(amount > 0)) {
      toast.error("Enter a valid refund amount");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/admin/refunds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId: refundTarget.id, amount, reason: refundReason || undefined }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Could not create refund");
      setSubmitting(false);
      return;
    }
    // A newly-created refund starts REQUESTED — mark it COMPLETED immediately
    // since there's no real gateway settlement to wait on in this sandbox.
    const completeRes = await fetch(`/api/admin/refunds/${data.refund.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "COMPLETED" }),
    });
    setSubmitting(false);
    if (!completeRes.ok) {
      toast.error("Refund created but could not be marked complete");
      setRefundTarget(null);
      load();
      return;
    }
    toast.success(`Refunded ${formatCurrency(amount)}`);
    setRefundTarget(null);
    load();
  }

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
            {t.replace("_", " ").charAt(0) + t.replace("_", " ").slice(1).toLowerCase()}
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
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-zinc-100 text-xs font-semibold uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Store</th>
                <th className="px-4 py-3">Buyer</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Gateway</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
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
                    <Badge tone={STATUS_TONE[p.status] ?? "neutral"}>{p.status.replace("_", " ")}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {REFUNDABLE_STATUSES.has(p.status) && (
                      <button
                        onClick={() => openRefund(p)}
                        className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
                      >
                        <Undo2 className="h-3.5 w-3.5" /> Refund
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {refundTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-zinc-900">Refund {refundTarget.order.orderNumber}</p>
              <button onClick={() => setRefundTarget(null)} aria-label="Close">
                <X className="h-4 w-4 text-zinc-400" />
              </button>
            </div>
            <Input
              label="Refund amount (₹)"
              type="number"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              max={refundTarget.amount}
            />
            <div className="mt-3">
              <Textarea label="Reason (optional)" rows={2} value={refundReason} onChange={(e) => setRefundReason(e.target.value)} />
            </div>
            <Button className="mt-4" fullWidth loading={submitting} onClick={submitRefund}>
              Confirm refund
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
