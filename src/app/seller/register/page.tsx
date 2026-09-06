"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Store as StoreIcon } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { FileUpload } from "@/components/seller/FileUpload";

interface Category {
  id: string;
  name: string;
}

export default function SellerRegisterPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [submitting, setSubmitting] = useState(false);
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
  });
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [catRes, meRes] = await Promise.all([fetch("/api/categories"), fetch("/api/auth/me")]);
      const cats = await catRes.json();
      const me = await meRes.json();
      setCategories(cats.categories ?? []);
      setForm((f) => ({ ...f, phone: me.user?.phone ?? "", email: me.user?.email ?? "" }));
    })();
  }, []);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit() {
    if (!form.name.trim() || !form.city.trim() || !form.phone.trim()) {
      toast.error("Business name, phone and city are required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/seller/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, logoUrl, coverUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create store");
      toast.success("Store created! Awaiting approval.");
      router.replace("/seller/pending");
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
          <StoreIcon className="h-5 w-5 text-accent-600" />
        </div>
        <div>
          <h1 className="text-lg font-extrabold text-zinc-900">Create your digital store</h1>
          <p className="text-sm text-zinc-500">Tell us about your business to get started.</p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FileUpload value={logoUrl} onChange={setLogoUrl} folder="stores" label="Store logo" />
          <FileUpload value={coverUrl} onChange={setCoverUrl} folder="stores" label="Cover image" />
        </div>

        <Input label="Business name" value={form.name} onChange={(e) => set("name", e.target.value)} />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">Business category</label>
          <select
            value={form.categoryId}
            onChange={(e) => set("categoryId", e.target.value)}
            className="h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 text-[15px] text-zinc-900 outline-none focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100"
          >
            <option value="">Select a category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <Textarea
          label="About your business (optional)"
          rows={3}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
        />

        <Input label="Owner mobile number" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        <Input label="Email (optional)" value={form.email} onChange={(e) => set("email", e.target.value)} />

        <Input
          label="Store address"
          placeholder="Shop no, street, landmark"
          value={form.addressLine}
          onChange={(e) => set("addressLine", e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Area" value={form.area} onChange={(e) => set("area", e.target.value)} />
          <Input label="City" value={form.city} onChange={(e) => set("city", e.target.value)} />
        </div>
        <Input label="State" value={form.state} onChange={(e) => set("state", e.target.value)} />

        <Button size="lg" fullWidth loading={submitting} onClick={submit} className="mt-2">
          Create my store
        </Button>
      </div>
    </main>
  );
}
