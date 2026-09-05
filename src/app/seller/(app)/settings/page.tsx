"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { FileUpload } from "@/components/seller/FileUpload";
import { LogoutButton } from "@/components/LogoutButton";

interface Category {
  id: string;
  name: string;
}

export default function SellerSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({
    name: "",
    categoryId: "",
    description: "",
    phone: "",
    email: "",
    addressLine: "",
    area: "",
    city: "",
    state: "",
    openingTime: "09:00",
    closingTime: "21:00",
    deliveryAvailable: true,
    deliveryFee: 0,
  });
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [storeRes, catRes] = await Promise.all([fetch("/api/seller/store"), fetch("/api/categories")]);
      const storeData = await storeRes.json();
      const catData = await catRes.json();
      setCategories(catData.categories ?? []);
      const s = storeData.store;
      if (s) {
        setForm({
          name: s.name ?? "",
          categoryId: s.categoryId ?? "",
          description: s.description ?? "",
          phone: s.phone ?? "",
          email: s.email ?? "",
          addressLine: s.addressLine ?? "",
          area: s.area ?? "",
          city: s.city ?? "",
          state: s.state ?? "",
          openingTime: s.openingTime ?? "09:00",
          closingTime: s.closingTime ?? "21:00",
          deliveryAvailable: s.deliveryAvailable,
          deliveryFee: s.deliveryFee ?? 0,
        });
        setLogoUrl(s.logoUrl);
        setCoverUrl(s.coverUrl);
      }
      setLoading(false);
    })();
  }, []);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/seller/store", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, logoUrl, coverUrl, categoryId: form.categoryId || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Could not save changes");
      toast.success("Store settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6 text-center text-sm text-zinc-400">Loading settings…</div>;

  return (
    <div className="animate-fade-in px-4 py-5">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-100">
          <SettingsIcon className="h-5 w-5 text-zinc-600" />
        </div>
        <h1 className="text-lg font-extrabold text-zinc-900">Store settings</h1>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FileUpload value={logoUrl} onChange={setLogoUrl} folder="stores" label="Store logo" />
          <FileUpload value={coverUrl} onChange={setCoverUrl} folder="stores" label="Cover image" />
        </div>

        <Input label="Store name" value={form.name} onChange={(e) => set("name", e.target.value)} />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">Category</label>
          <select
            value={form.categoryId}
            onChange={(e) => set("categoryId", e.target.value)}
            className="h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 text-[15px] outline-none focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100"
          >
            <option value="">Select a category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <Textarea label="Description" rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
        <Input label="Contact number" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        <Input label="Email" value={form.email} onChange={(e) => set("email", e.target.value)} />
        <Input label="Address" value={form.addressLine} onChange={(e) => set("addressLine", e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Area" value={form.area} onChange={(e) => set("area", e.target.value)} />
          <Input label="City" value={form.city} onChange={(e) => set("city", e.target.value)} />
        </div>
        <Input label="State" value={form.state} onChange={(e) => set("state", e.target.value)} />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Opening time"
            type="time"
            value={form.openingTime}
            onChange={(e) => set("openingTime", e.target.value)}
          />
          <Input
            label="Closing time"
            type="time"
            value={form.closingTime}
            onChange={(e) => set("closingTime", e.target.value)}
          />
        </div>

        <label className="flex items-center justify-between rounded-xl border border-zinc-200 px-3.5 py-3">
          <span className="text-sm font-medium text-zinc-700">Delivery available</span>
          <input
            type="checkbox"
            checked={form.deliveryAvailable}
            onChange={(e) => set("deliveryAvailable", e.target.checked)}
            className="h-5 w-5 accent-brand-600"
          />
        </label>

        <Input
          label="Delivery fee (₹)"
          type="number"
          value={form.deliveryFee}
          onChange={(e) => set("deliveryFee", Number(e.target.value))}
        />

        <Button size="lg" fullWidth loading={saving} onClick={save} className="mt-2">
          Save changes
        </Button>

        <div className="pt-4">
          <LogoutButton redirectTo="/seller/login" />
        </div>
      </div>
    </div>
  );
}
