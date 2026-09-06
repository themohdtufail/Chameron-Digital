"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Truck } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function DeliveryRegisterPage() {
  const router = useRouter();
  const [vehicleType, setVehicleType] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/delivery/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleType: vehicleType || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create profile");
      toast.success("Application submitted! Awaiting approval.");
      router.replace("/delivery/pending");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-[480px] bg-white px-6 pb-16 pt-8">
      <Logo markSize={40} />
      <div className="mt-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-50">
          <Truck className="h-5 w-5 text-accent-600" />
        </div>
        <div>
          <h1 className="text-lg font-extrabold text-zinc-900">Become a delivery partner</h1>
          <p className="text-sm text-zinc-500">A couple of details and you&apos;re set to apply.</p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <Input
          label="Vehicle type (optional)"
          placeholder="Bike, scooter, cycle..."
          value={vehicleType}
          onChange={(e) => setVehicleType(e.target.value)}
        />

        <Button size="lg" fullWidth loading={submitting} onClick={submit} className="mt-2">
          Submit application
        </Button>
      </div>
    </main>
  );
}
