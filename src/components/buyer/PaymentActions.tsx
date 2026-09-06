"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";

/**
 * Sandbox online-payment step: no real gateway is configured, so the buyer
 * simulates the outcome directly (mirrors the OTP dev-mode banner pattern).
 * Swapping in a real gateway later replaces this with a redirect/widget —
 * the confirm API call underneath stays the same.
 */
export function PaymentActions({ paymentId }: { paymentId: string }) {
  const [loading, setLoading] = useState<"SUCCESS" | "FAILED" | null>(null);
  const router = useRouter();

  async function simulate(outcome: "SUCCESS" | "FAILED") {
    setLoading(outcome);
    try {
      const res = await fetch(`/api/payments/${paymentId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ simulate: outcome }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not confirm payment");
      toast[outcome === "SUCCESS" ? "success" : "error"](
        outcome === "SUCCESS" ? "Payment successful!" : "Payment failed"
      );
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-bold text-amber-900">Complete your payment</p>
      <p className="mt-1 text-xs text-amber-700">
        Sandbox mode — no real gateway is connected yet. Simulate an outcome to continue.
      </p>
      <div className="mt-3 flex gap-2">
        <Button size="sm" loading={loading === "SUCCESS"} onClick={() => simulate("SUCCESS")}>
          Simulate success
        </Button>
        <Button size="sm" variant="outline" loading={loading === "FAILED"} onClick={() => simulate("FAILED")}>
          Simulate failure
        </Button>
      </div>
    </div>
  );
}
