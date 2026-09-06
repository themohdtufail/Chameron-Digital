"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { MapPin, Plus } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";

interface Area {
  id: string;
  name: string;
}

interface CityRow {
  id: string;
  name: string;
  state: string;
  isActive: boolean;
  areas: Area[];
  _count: { stores: number };
}

export default function AdminCitiesPage() {
  const [cities, setCities] = useState<CityRow[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", state: "" });
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/cities", { cache: "no-store" });
    const data = await res.json();
    setCities(data.cities ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function createCity() {
    if (!form.name.trim() || !form.state.trim()) {
      toast.error("Enter both a city name and state");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/admin/cities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      toast.error(data.error ?? "Could not add city");
      return;
    }
    toast.success("City added");
    setForm({ name: "", state: "" });
    setShowForm(false);
    load();
  }

  async function toggleActive(city: CityRow) {
    setBusyId(city.id);
    const res = await fetch(`/api/admin/cities/${city.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !city.isActive }),
    });
    setBusyId(null);
    if (!res.ok) {
      toast.error("Could not update city");
      return;
    }
    toast.success(`${city.name} ${city.isActive ? "deactivated" : "activated"}`);
    load();
  }

  if (!cities) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-extrabold text-zinc-900">
          <MapPin className="h-5 w-5" /> Cities
        </h1>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" /> Add city
        </Button>
      </div>

      {showForm && (
        <div className="mb-4 flex items-end gap-2 rounded-2xl border border-zinc-200 bg-white p-4 shadow-card">
          <Input label="City name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
          <Button loading={saving} onClick={createCity}>
            Add
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {cities.map((c) => (
          <div key={c.id} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="flex items-center gap-2 text-sm font-bold text-zinc-900">
                  {c.name}
                  <Badge tone={c.isActive ? "success" : "neutral"}>{c.isActive ? "Active" : "Inactive"}</Badge>
                </p>
                <p className="text-xs text-zinc-500">
                  {c.state} · {c._count.stores} store{c._count.stores === 1 ? "" : "s"}
                  {c.areas.length > 0 && ` · ${c.areas.map((a) => a.name).join(", ")}`}
                </p>
              </div>
              <Button size="sm" variant={c.isActive ? "outline" : "primary"} disabled={busyId === c.id} onClick={() => toggleActive(c)}>
                {c.isActive ? "Deactivate" : "Activate"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
