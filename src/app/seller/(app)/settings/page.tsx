"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Settings as SettingsIcon, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { FileUpload } from "@/components/seller/FileUpload";
import { LogoutButton } from "@/components/LogoutButton";

interface Category {
  id: string;
  name: string;
}

interface DayHours {
  dayOfWeek: number;
  isClosed: boolean;
  openTime: string;
  closeTime: string;
}

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function defaultHours(openingTime: string, closingTime: string): DayHours[] {
  return Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    isClosed: false,
    openTime: openingTime,
    closeTime: closingTime,
  }));
}

export default function SellerSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [storeSlug, setStoreSlug] = useState("");
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
    minOrderAmount: 0,
    vacationMode: false,
  });
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [hours, setHours] = useState<DayHours[]>(defaultHours("09:00", "21:00"));

  useEffect(() => {
    (async () => {
      const [storeRes, catRes] = await Promise.all([fetch("/api/seller/store"), fetch("/api/categories")]);
      const storeData = await storeRes.json();
      const catData = await catRes.json();
      setCategories(catData.categories ?? []);
      const s = storeData.store;
      if (s) {
        setStoreSlug(s.slug ?? "");
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
          minOrderAmount: s.minOrderAmount ?? 0,
          vacationMode: s.vacationMode ?? false,
        });
        setLogoUrl(s.logoUrl);
        setCoverUrl(s.coverUrl);
        if (s.hours?.length) {
          setHours(
            defaultHours(s.openingTime ?? "09:00", s.closingTime ?? "21:00").map((d) => {
              const match = s.hours.find((h: DayHours) => h.dayOfWeek === d.dayOfWeek);
              return match
                ? { dayOfWeek: d.dayOfWeek, isClosed: match.isClosed, openTime: match.openTime ?? d.openTime, closeTime: match.closeTime ?? d.closeTime }
                : d;
            })
          );
        } else {
          setHours(defaultHours(s.openingTime ?? "09:00", s.closingTime ?? "21:00"));
        }
      }
      setLoading(false);
    })();
  }, []);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setDay(dayOfWeek: number, patch: Partial<DayHours>) {
    setHours((prev) => prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d)));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/seller/store", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, logoUrl, coverUrl, categoryId: form.categoryId || null, hours }),
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
    <div className="animate-fade-in px-4 py-5 lg:px-10 lg:py-8">
      <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-100">
          <SettingsIcon className="h-5 w-5 text-zinc-600" />
        </div>
        <h1 className="text-lg font-extrabold text-zinc-900 lg:text-2xl">Store settings</h1>
      </div>

      <div className="space-y-4">
        {storeSlug && (
          <a
            href={`/buyer/store/${storeSlug}?preview=1`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl border border-brand-200 bg-brand-50 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-100"
          >
            Preview store <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}

        <a
          href="/seller/verification"
          className="flex items-center justify-center gap-2 rounded-xl border border-zinc-200 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 lg:hidden"
        >
          Store verification
        </a>

        <a
          href="/seller/plans"
          className="flex items-center justify-center gap-2 rounded-xl border border-zinc-200 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 lg:hidden"
        >
          Plans &amp; billing
        </a>

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
            label="Default opening time"
            type="time"
            value={form.openingTime}
            onChange={(e) => set("openingTime", e.target.value)}
          />
          <Input
            label="Default closing time"
            type="time"
            value={form.closingTime}
            onChange={(e) => set("closingTime", e.target.value)}
          />
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-zinc-800">Opening hours by day</p>
          <div className="space-y-1.5 rounded-xl border border-zinc-200 p-3">
            {hours.map((d) => (
              <div key={d.dayOfWeek} className="grid grid-cols-[80px_1fr_1fr_auto] items-center gap-2">
                <span className="text-xs font-medium text-zinc-600">{DAY_LABELS[d.dayOfWeek].slice(0, 3)}</span>
                <input
                  type="time"
                  disabled={d.isClosed}
                  value={d.openTime}
                  onChange={(e) => setDay(d.dayOfWeek, { openTime: e.target.value })}
                  className="h-9 rounded-lg border border-zinc-200 bg-zinc-50 px-2 text-xs disabled:opacity-40"
                />
                <input
                  type="time"
                  disabled={d.isClosed}
                  value={d.closeTime}
                  onChange={(e) => setDay(d.dayOfWeek, { closeTime: e.target.value })}
                  className="h-9 rounded-lg border border-zinc-200 bg-zinc-50 px-2 text-xs disabled:opacity-40"
                />
                <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
                  <input
                    type="checkbox"
                    checked={d.isClosed}
                    onChange={(e) => setDay(d.dayOfWeek, { isClosed: e.target.checked })}
                    className="h-4 w-4 accent-brand-600"
                  />
                  Closed
                </label>
              </div>
            ))}
          </div>
        </div>

        <label className="flex items-center justify-between rounded-xl border border-zinc-200 px-3.5 py-3">
          <span className="text-sm font-medium text-zinc-700">Vacation mode (temporarily hide store from buyers)</span>
          <input
            type="checkbox"
            checked={form.vacationMode}
            onChange={(e) => set("vacationMode", e.target.checked)}
            className="h-5 w-5 accent-brand-600"
          />
        </label>

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

        <Input
          label="Minimum order amount (₹)"
          type="number"
          value={form.minOrderAmount}
          onChange={(e) => set("minOrderAmount", Number(e.target.value))}
        />

        <Button size="lg" fullWidth loading={saving} onClick={save} className="mt-2">
          Save changes
        </Button>

        <div className="pt-4">
          <LogoutButton redirectTo="/seller/login" />
        </div>
      </div>
      </div>
    </div>
  );
}
