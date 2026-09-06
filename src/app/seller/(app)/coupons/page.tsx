"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Tag, Plus, Ban, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency } from "@/lib/utils";

interface Coupon {
  id: string;
  code: string;
  type: "PERCENTAGE" | "FIXED";
  value: number;
  minOrderAmount: number;
  startDate: string;
  endDate: string;
  usageLimit: number | null;
  isActive: boolean;
  _count: { redemptions: number };
}

const emptyForm = {
  code: "",
  type: "PERCENTAGE" as "PERCENTAGE" | "FIXED",
  value: 10,
  minOrderAmount: 0,
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
  usageLimit: "",
};

export default function SellerCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);

  async function load() {
    const res = await fetch("/api/seller/coupons", { cache: "no-store" });
    const data = await res.json();
    setCoupons(data.coupons ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function createCoupon() {
    setCreating(true);
    const res = await fetch("/api/seller/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate + "T23:59:59").toISOString(),
        usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
      }),
    });
    setCreating(false);
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Could not create coupon");
      return;
    }
    toast.success("Coupon created");
    setForm(emptyForm);
    setShowForm(false);
    load();
  }

  async function toggleActive(coupon: Coupon) {
    const res = await fetch(`/api/seller/coupons/${coupon.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !coupon.isActive }),
    });
    if (!res.ok) {
      toast.error("Could not update coupon");
      return;
    }
    load();
  }

  async function removeCoupon(id: string) {
    if (!window.confirm("Delete this coupon?")) return;
    const res = await fetch(`/api/seller/coupons/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not delete coupon");
      return;
    }
    toast.success("Coupon deleted");
    load();
  }

  return (
    <div className="animate-fade-in px-4 py-5 lg:px-10 lg:py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-extrabold text-zinc-900 lg:text-2xl">Coupons</h1>
          <Button size="sm" onClick={() => setShowForm((s) => !s)}>
            <Plus className="h-4 w-4" /> New coupon
          </Button>
        </div>

        {showForm && (
          <div className="mb-5 space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-card">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Code"
                placeholder="WELCOME10"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as "PERCENTAGE" | "FIXED" }))}
                  className="h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 text-[15px]"
                >
                  <option value="PERCENTAGE">Percentage off</option>
                  <option value="FIXED">Fixed amount off</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label={form.type === "PERCENTAGE" ? "Percentage (%)" : "Amount (₹)"}
                type="number"
                value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: Number(e.target.value) }))}
              />
              <Input
                label="Minimum order (₹)"
                type="number"
                value={form.minOrderAmount}
                onChange={(e) => setForm((f) => ({ ...f, minOrderAmount: Number(e.target.value) }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Start date"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              />
              <Input
                label="End date"
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              />
            </div>
            <Input
              label="Usage limit (optional — blank = unlimited)"
              type="number"
              value={form.usageLimit}
              onChange={(e) => setForm((f) => ({ ...f, usageLimit: e.target.value }))}
            />
            <Button fullWidth loading={creating} onClick={createCoupon}>
              Create coupon
            </Button>
          </div>
        )}

        {!coupons && (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
          </div>
        )}

        {coupons && coupons.length === 0 && (
          <EmptyState icon={Tag} title="No coupons yet" description="Create a coupon to run a promotion or flash sale." />
        )}

        {coupons && coupons.length > 0 && (
          <div className="space-y-3">
            {coupons.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-2xl border border-zinc-100 bg-white p-4 shadow-card">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm font-bold text-zinc-900">{c.code}</p>
                    <Badge tone={c.isActive ? "success" : "neutral"}>{c.isActive ? "Active" : "Inactive"}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    {c.type === "PERCENTAGE" ? `${c.value}% off` : `${formatCurrency(c.value)} off`}
                    {c.minOrderAmount > 0 && ` · Min ${formatCurrency(c.minOrderAmount)}`}
                    {c.usageLimit && ` · ${c._count.redemptions}/${c.usageLimit} used`}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {new Date(c.startDate).toLocaleDateString()} – {new Date(c.endDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => toggleActive(c)}>
                    <Ban className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => removeCoupon(c.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
