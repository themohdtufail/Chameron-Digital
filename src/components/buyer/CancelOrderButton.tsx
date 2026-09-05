"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  return (
    <Button
      variant="outline"
      size="md"
      fullWidth
      loading={loading}
      onClick={async () => {
        if (!window.confirm("Cancel this order?")) return;
        setLoading(true);
        const res = await fetch(`/api/orders/${orderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "CANCELLED" }),
        });
        setLoading(false);
        if (!res.ok) {
          const data = await res.json();
          toast.error(data.error || "Could not cancel order");
          return;
        }
        toast.success("Order cancelled");
        router.refresh();
      }}
    >
      Cancel order
    </Button>
  );
}
