"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import type { OrderStatusValue } from "@/components/OrderStatus";

const NEXT_ACTION: Partial<Record<OrderStatusValue, { label: string; status: OrderStatusValue; variant: "primary" }>> = {
  PENDING: { label: "Accept order", status: "CONFIRMED", variant: "primary" },
  CONFIRMED: { label: "Start preparing", status: "PREPARING", variant: "primary" },
  PREPARING: { label: "Mark ready", status: "READY", variant: "primary" },
  READY: { label: "Out for delivery", status: "OUT_FOR_DELIVERY", variant: "primary" },
  PICKED_UP: { label: "Mark out for delivery", status: "OUT_FOR_DELIVERY", variant: "primary" },
  OUT_FOR_DELIVERY: { label: "Mark delivered", status: "DELIVERED", variant: "primary" },
};

// READY has two possible next steps depending on whether a delivery
// partner is assigned — self-fulfillment skips straight to
// OUT_FOR_DELIVERY (unchanged default), an assigned partner is handed off
// via PICKED_UP first.
const READY_WITH_PARTNER = { label: "Mark picked up", status: "PICKED_UP" as OrderStatusValue, variant: "primary" as const };

export function SellerOrderActions({
  orderId,
  status,
  hasDeliveryPartner,
}: {
  orderId: string;
  status: OrderStatusValue;
  hasDeliveryPartner?: boolean;
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();

  async function updateStatus(newStatus: OrderStatusValue, reason?: string) {
    setLoading(newStatus);
    const res = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus, reason }),
    });
    setLoading(null);
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Could not update order");
      return;
    }
    toast.success("Order updated");
    router.refresh();
  }

  const next = status === "READY" && hasDeliveryPartner ? READY_WITH_PARTNER : NEXT_ACTION[status];
  const canReject = status === "PENDING" || status === "CONFIRMED";

  if (!next && !canReject) return null;

  return (
    <div className="flex gap-3">
      {canReject && (
        <Button
          variant="outline"
          fullWidth
          loading={loading === "REJECTED"}
          onClick={() => {
            if (!window.confirm("Reject this order?")) return;
            const reason = window.prompt("Reason for rejecting? (optional)") || undefined;
            updateStatus("REJECTED", reason);
          }}
        >
          Reject
        </Button>
      )}
      {next && (
        <Button fullWidth loading={loading === next.status} onClick={() => updateStatus(next.status)}>
          {next.label}
        </Button>
      )}
    </div>
  );
}
