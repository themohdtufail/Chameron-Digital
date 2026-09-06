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
  OUT_FOR_DELIVERY: { label: "Mark delivered", status: "DELIVERED", variant: "primary" },
};

export function SellerOrderActions({ orderId, status }: { orderId: string; status: OrderStatusValue }) {
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

  const next = NEXT_ACTION[status];
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
