"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Wallet, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency, cn } from "@/lib/utils";

interface Balance {
  storeId: string;
  storeName: string;
  storeSlug: string;
  totalEarned: number;
  outstanding: number;
}

interface PayoutRow {
  id: string;
  amount: number;
  status: string;
  periodStart: string;
  periodEnd: string;
  notes: string | null;
  createdAt: string;
  store: { name: string; slug: string };
  processedBy: { name: string | null } | null;
}

const STATUS_TONE: Record<string, "accent" | "success" | "danger" | "neutral"> = {
  PENDING: "accent",
  PROCESSING: "accent",
  PAID: "success",
  FAILED: "danger",
  ON_HOLD: "neutral",
};
const STATUSES = ["PENDING", "PROCESSING", "PAID", "FAILED", "ON_HOLD"] as const;

export default function AdminPayoutsPage() {
  const [balances, setBalances] = useState<Balance[] | null>(null);
  const [payouts, setPayouts] = useState<PayoutRow[] | null>(null);
  const [payTarget, setPayTarget] = useState<Balance | null>(null);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const [balRes, payRes] = await Promise.all([
      fetch("/api/admin/payouts/balances", { cache: "no-store" }),
      fetch("/api/admin/payouts", { cache: "no-store" }),
    ]);
    setBalances((await balRes.json()).balances ?? []);
    setPayouts((await payRes.json()).payouts ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  function openPayout(balance: Balance) {
    setPayTarget(balance);
    setAmount(String(balance.outstanding));
  }

  async function submitPayout() {
    if (!payTarget) return;
    const value = Number(amount);
    if (!(value > 0)) {
      toast.error("Enter a valid amount");
      return;
    }
    setSubmitting(true);
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const res = await fetch("/api/admin/payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeId: payTarget.storeId,
        amount: value,
        periodStart: periodStart.toISOString(),
        periodEnd: now.toISOString(),
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      toast.error(data.error ?? "Could not create payout");
      return;
    }
    toast.success("Payout recorded as pending");
    setPayTarget(null);
    load();
  }

  async function updateStatus(id: string, status: string) {
    setBusyId(id);
    const res = await fetch(`/api/admin/payouts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusyId(null);
    if (!res.ok) {
      toast.error("Could not update payout");
      return;
    }
    toast.success(`Payout marked ${status.replace("_", " ").toLowerCase()}`);
    load();
  }

  if (!balances || !payouts) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-4 flex items-center gap-2 text-xl font-extrabold text-zinc-900">
        <Wallet className="h-5 w-5" /> Seller payouts
      </h1>
      <p className="mb-4 text-sm text-zinc-500">
        A tracking ledger only — recording a payout here does not move real money. Mark it PAID once you&apos;ve sent it through your own banking channel.
      </p>

      <p className="mb-3 text-sm font-bold text-zinc-900">Outstanding balances</p>
      {balances.length === 0 ? (
        <EmptyState icon={Wallet} title="Nothing owed" description="Every store's earnings have been paid out." />
      ) : (
        <div className="mb-6 space-y-2">
          {balances.map((b) => (
            <div key={b.storeId} className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-card">
              <div>
                <p className="text-sm font-bold text-zinc-900">{b.storeName}</p>
                <p className="text-xs text-zinc-500">Lifetime earned: {formatCurrency(b.totalEarned)}</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-sm font-extrabold text-accent-700">{formatCurrency(b.outstanding)}</p>
                <Button size="sm" onClick={() => openPayout(b)}>
                  Record payout
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mb-3 text-sm font-bold text-zinc-900">Payout history</p>
      {payouts.length === 0 ? (
        <EmptyState icon={Wallet} title="No payouts yet" description="Recorded payouts will appear here." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-card">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-zinc-100 text-xs font-semibold uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3">Store</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Update</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {payouts.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-semibold text-zinc-900">{p.store.name}</td>
                  <td className="px-4 py-3 font-semibold text-zinc-900">{formatCurrency(p.amount)}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {new Date(p.periodStart).toLocaleDateString()} – {new Date(p.periodEnd).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[p.status] ?? "neutral"}>{p.status.replace("_", " ")}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {STATUSES.filter((s) => s !== p.status).map((s) => (
                        <button
                          key={s}
                          disabled={busyId === p.id}
                          onClick={() => updateStatus(p.id, s)}
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[11px] font-semibold text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
                          )}
                        >
                          {s.replace("_", " ")}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {payTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-zinc-900">Record payout for {payTarget.storeName}</p>
              <button onClick={() => setPayTarget(null)} aria-label="Close">
                <X className="h-4 w-4 text-zinc-400" />
              </button>
            </div>
            <Input label="Amount (₹)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} max={payTarget.outstanding} />
            <Button className="mt-4" fullWidth loading={submitting} onClick={submitPayout}>
              Record payout
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
