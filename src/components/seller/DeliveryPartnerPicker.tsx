"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Truck } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Partner {
  id: string;
  isAvailable: boolean;
  user: { id: string; name: string | null; phone: string };
}

interface Assigned {
  name: string | null;
  phone: string;
}

const TERMINAL = ["DELIVERED", "CANCELLED", "REJECTED"];

export function DeliveryPartnerPicker({
  orderId,
  status,
  assigned,
}: {
  orderId: string;
  status: string;
  assigned: Assigned | null;
}) {
  const [partners, setPartners] = useState<Partner[] | null>(null);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (TERMINAL.includes(status)) return;
    fetch("/api/seller/delivery-partners")
      .then((res) => res.json())
      .then((data) => setPartners(data.partners ?? []));
  }, [status]);

  if (TERMINAL.includes(status)) return null;

  async function assign(deliveryPartnerId: string | null) {
    setBusy(true);
    const res = await fetch(`/api/orders/${orderId}/delivery-partner`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deliveryPartnerId }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Could not update delivery partner");
      return;
    }
    toast.success(deliveryPartnerId ? "Delivery partner assigned" : "Delivery partner removed");
    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-card">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-zinc-900">
        <Truck className="h-4 w-4 text-brand-600" /> Delivery partner
      </h2>

      {assigned ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-600">
            {assigned.name ?? "Assigned"} · {assigned.phone}
          </p>
          <Button size="sm" variant="outline" loading={busy} onClick={() => assign(null)}>
            Unassign
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="h-10 flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-900 outline-none focus:border-brand-500 focus:bg-white"
          >
            <option value="">
              {partners === null ? "Loading…" : partners.length === 0 ? "No approved partners yet" : "Select a partner"}
            </option>
            {partners?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.user.name ?? p.user.phone} {p.isAvailable ? "" : "(busy)"}
              </option>
            ))}
          </select>
          <Button size="sm" disabled={!selected} loading={busy} onClick={() => assign(selected)}>
            Assign
          </Button>
        </div>
      )}
    </section>
  );
}
