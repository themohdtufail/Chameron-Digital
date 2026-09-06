"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import type { OrderStatusValue } from "@/components/OrderStatus";

const NEXT_ACTION: Partial<Record<OrderStatusValue, { label: string; status: OrderStatusValue }>> = {
  PICKED_UP: { label: "Mark out for delivery", status: "OUT_FOR_DELIVERY" },
  OUT_FOR_DELIVERY: { label: "Mark delivered", status: "DELIVERED" },
};

export function DeliveryOrderActions({ orderId, status }: { orderId: string; status: OrderStatusValue }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const next = NEXT_ACTION[status];
  if (!next) return null;

  async function advance() {
    setLoading(true);
    const res = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next!.status }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Could not update delivery");
      return;
    }
    toast.success("Delivery updated");
    router.refresh();
  }

  return (
    <Button fullWidth loading={loading} onClick={advance}>
      {next.label}
    </Button>
  );
}
