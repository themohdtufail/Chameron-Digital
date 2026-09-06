"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Truck, Check, X, Ban } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";

interface PartnerRow {
  id: string;
  vehicleType: string | null;
  isAvailable: boolean;
  status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
  user: { name: string | null; phone: string };
}

const TABS = ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"] as const;

const STATUS_TONE = { PENDING: "accent", APPROVED: "success", REJECTED: "danger", SUSPENDED: "neutral" } as const;

export default function AdminDeliveryPartnersPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("PENDING");
  const [partners, setPartners] = useState<PartnerRow[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setPartners(null);
    const res = await fetch(`/api/admin/delivery-partners?status=${tab}`, { cache: "no-store" });
    const data = await res.json();
    setPartners(data.partners ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function updateStatus(id: string, status: string) {
    setBusyId(id);
    const res = await fetch(`/api/admin/delivery-partners/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusyId(null);
    if (!res.ok) {
      toast.error("Could not update delivery partner");
      return;
    }
    toast.success(`Delivery partner ${status.toLowerCase()}`);
    load();
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-extrabold text-zinc-900">Delivery partners</h1>

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

      {!partners && (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {partners && partners.length === 0 && (
        <EmptyState icon={Truck} title="Nothing here" description="No delivery partners in this category yet." />
      )}

      {partners && partners.length > 0 && (
        <div className="space-y-3">
          {partners.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-card">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-50">
                <Truck className="h-5 w-5 text-zinc-300" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-zinc-900">{p.user.name ?? p.user.phone}</p>
                <p className="text-xs text-zinc-500">
                  {p.user.phone} · {p.vehicleType ?? "No vehicle listed"}
                </p>
                {p.status === "APPROVED" && (
                  <p className="text-xs text-zinc-400">{p.isAvailable ? "Available" : "Unavailable"}</p>
                )}
              </div>
              <Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge>
              <div className="flex shrink-0 gap-1.5">
                {p.status !== "APPROVED" && (
                  <Button size="sm" disabled={busyId === p.id} onClick={() => updateStatus(p.id, "APPROVED")}>
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                )}
                {p.status !== "REJECTED" && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === p.id}
                    onClick={() => updateStatus(p.id, "REJECTED")}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
                {p.status === "APPROVED" && (
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={busyId === p.id}
                    onClick={() => updateStatus(p.id, "SUSPENDED")}
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
