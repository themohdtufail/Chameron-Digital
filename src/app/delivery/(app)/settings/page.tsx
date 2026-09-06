"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Truck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LogoutButton } from "@/components/LogoutButton";

interface Profile {
  isAvailable: boolean;
  vehicleType: string | null;
  status: string;
}

export default function DeliverySettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [vehicleType, setVehicleType] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/delivery/profile")
      .then((r) => r.json())
      .then((d) => {
        setProfile(d.profile);
        setVehicleType(d.profile?.vehicleType ?? "");
      });
  }, []);

  async function toggleAvailable() {
    if (!profile) return;
    const next = !profile.isAvailable;
    setProfile({ ...profile, isAvailable: next });
    const res = await fetch("/api/delivery/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAvailable: next }),
    });
    if (!res.ok) {
      setProfile({ ...profile, isAvailable: !next });
      toast.error("Could not update availability");
      return;
    }
    toast.success(next ? "You're now available for deliveries" : "You're now marked unavailable");
  }

  async function saveVehicle() {
    setSaving(true);
    const res = await fetch("/api/delivery/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vehicleType: vehicleType || null }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("Could not save");
      return;
    }
    toast.success("Saved");
  }

  return (
    <div className="animate-fade-in px-4 py-5 lg:px-10 lg:py-8">
      <div className="mx-auto max-w-xl space-y-5">
        <h1 className="text-xl font-extrabold text-zinc-900 lg:text-2xl">Settings</h1>

        {profile && (
          <section className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-brand-600" />
                <p className="text-sm font-bold text-zinc-900">Available for deliveries</p>
              </div>
              <button
                onClick={toggleAvailable}
                className={`relative h-6 w-11 rounded-full transition ${profile.isAvailable ? "bg-brand-600" : "bg-zinc-200"}`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    profile.isAvailable ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              Turn this off when you&apos;re offline so sellers don&apos;t assign you new deliveries.
            </p>
          </section>
        )}

        <section className="space-y-3 rounded-2xl border border-zinc-100 bg-white p-4 shadow-card">
          <Input label="Vehicle type" placeholder="Bike, scooter, cycle..." value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} />
          <Button size="sm" loading={saving} onClick={saveVehicle}>
            Save
          </Button>
        </section>

        <LogoutButton redirectTo="/delivery/login" />
      </div>
    </div>
  );
}
