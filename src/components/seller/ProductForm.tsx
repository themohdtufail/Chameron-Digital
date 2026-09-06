"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Plus, Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { FileUpload } from "@/components/seller/FileUpload";
import { MultiImageUpload } from "@/components/seller/MultiImageUpload";

interface Variant {
  type: "SIZE" | "COLOR" | "MATERIAL";
  value: string;
  priceDelta: number;
  stockQuantity: number;
}

interface ProductCategoryOption {
  id: string;
  name: string;
}

export interface ProductFormValue {
  name: string;
  categoryId: string;
  description: string;
  sku: string;
  price: string;
  discountPrice: string;
  stockQuantity: string;
  lowStockThreshold: string;
  trackInventory: boolean;
  status: "AVAILABLE" | "OUT_OF_STOCK" | "HIDDEN";
  images: string[];
  videoUrl: string | null;
  variants: Variant[];
  specs: { key: string; value: string }[];
}

export const emptyProductForm: ProductFormValue = {
  name: "",
  categoryId: "",
  description: "",
  sku: "",
  price: "",
  discountPrice: "",
  stockQuantity: "0",
  lowStockThreshold: "5",
  trackInventory: true,
  status: "AVAILABLE",
  images: [],
  videoUrl: null,
  variants: [],
  specs: [],
};

export function ProductForm({
  categories,
  initial,
  productId,
}: {
  categories: ProductCategoryOption[];
  initial: ProductFormValue;
  productId?: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState<ProductFormValue>(initial);
  const [saving, setSaving] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);

  function set<K extends keyof ProductFormValue>(key: K, value: ProductFormValue[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function addVariant() {
    set("variants", [...form.variants, { type: "SIZE", value: "", priceDelta: 0, stockQuantity: 0 }]);
  }
  function updateVariant(idx: number, patch: Partial<Variant>) {
    set(
      "variants",
      form.variants.map((v, i) => (i === idx ? { ...v, ...patch } : v))
    );
  }
  function removeVariant(idx: number) {
    set(
      "variants",
      form.variants.filter((_, i) => i !== idx)
    );
  }

  async function generateDescription() {
    if (!form.name.trim() || !form.price) {
      toast.error("Enter a product name and price first");
      return;
    }
    setGeneratingDescription(true);
    try {
      const category = categories.find((c) => c.id === form.categoryId)?.name;
      const attributes = Object.fromEntries(form.specs.filter((s) => s.key.trim()).map((s) => [s.key, s.value]));
      const res = await fetch("/api/seller/ai/product-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, category, price: Number(form.price), attributes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not generate description");
      set("description", data.text);
      toast.success("Description generated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setGeneratingDescription(false);
    }
  }

  function addSpec() {
    set("specs", [...form.specs, { key: "", value: "" }]);
  }
  function updateSpec(idx: number, patch: Partial<{ key: string; value: string }>) {
    set(
      "specs",
      form.specs.map((s, i) => (i === idx ? { ...s, ...patch } : s))
    );
  }
  function removeSpec(idx: number) {
    set(
      "specs",
      form.specs.filter((_, i) => i !== idx)
    );
  }

  async function submit() {
    if (!form.name.trim() || !form.price) {
      toast.error("Product name and price are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        categoryId: form.categoryId || null,
        description: form.description || undefined,
        sku: form.sku || null,
        price: Number(form.price),
        discountPrice: form.discountPrice ? Number(form.discountPrice) : null,
        stockQuantity: Number(form.stockQuantity || 0),
        lowStockThreshold: Number(form.lowStockThreshold || 0),
        trackInventory: form.trackInventory,
        status: form.status,
        videoUrl: form.videoUrl,
        images: form.images,
        variants: form.variants
          .filter((v) => v.value.trim())
          .map((v) => ({ ...v, priceDelta: Number(v.priceDelta) || 0, stockQuantity: Number(v.stockQuantity) || 0 })),
        specifications: Object.fromEntries(
          form.specs.filter((s) => s.key.trim()).map((s) => [s.key, s.value])
        ),
      };

      const res = await fetch(productId ? `/api/seller/products/${productId}` : "/api/seller/products", {
        method: productId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save product");
      toast.success(productId ? "Product updated" : "Product added");
      router.replace("/seller/products");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 pb-6">
      <MultiImageUpload images={form.images} onChange={(imgs) => set("images", imgs)} />
      <FileUpload
        value={form.videoUrl}
        onChange={(v) => set("videoUrl", v)}
        folder="products"
        label="Product video (optional)"
        accept="video/*"
        aspect="aspect-video"
        isVideo
      />

      <Input label="Product name" value={form.name} onChange={(e) => set("name", e.target.value)} />

      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-700">Category</label>
        <select
          value={form.categoryId}
          onChange={(e) => set("categoryId", e.target.value)}
          className="h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 text-[15px] outline-none focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100"
        >
          <option value="">No category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-sm font-medium text-zinc-700">Description</label>
          <button
            type="button"
            onClick={generateDescription}
            disabled={generatingDescription}
            className="flex items-center gap-1 text-xs font-semibold text-accent-600 hover:text-accent-700 disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" /> {generatingDescription ? "Generating…" : "Generate with AI"}
          </button>
        </div>
        <Textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input label="Price (₹)" type="number" value={form.price} onChange={(e) => set("price", e.target.value)} />
        <Input
          label="Discount price (₹)"
          type="number"
          value={form.discountPrice}
          onChange={(e) => set("discountPrice", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input label="SKU (optional)" value={form.sku} onChange={(e) => set("sku", e.target.value)} />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">Status</label>
          <select
            value={form.status}
            onChange={(e) => set("status", e.target.value as ProductFormValue["status"])}
            className="h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 text-[15px] outline-none focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100"
          >
            <option value="AVAILABLE">Available</option>
            <option value="OUT_OF_STOCK">Out of stock</option>
            <option value="HIDDEN">Hidden</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Stock quantity"
          type="number"
          value={form.stockQuantity}
          onChange={(e) => set("stockQuantity", e.target.value)}
        />
        <Input
          label="Low-stock threshold"
          type="number"
          value={form.lowStockThreshold}
          onChange={(e) => set("lowStockThreshold", e.target.value)}
        />
      </div>

      <label className="flex items-center justify-between rounded-xl border border-zinc-200 px-3.5 py-3">
        <span className="text-sm font-medium text-zinc-700">Track inventory for this product</span>
        <input
          type="checkbox"
          checked={form.trackInventory}
          onChange={(e) => set("trackInventory", e.target.checked)}
          className="h-5 w-5 accent-brand-600"
        />
      </label>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-800">Variants (Size, Color, Material)</p>
          <button onClick={addVariant} className="flex items-center gap-1 text-xs font-semibold text-brand-600">
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
        <div className="space-y-2">
          {form.variants.map((v, idx) => (
            <div key={idx} className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-2 rounded-xl border border-zinc-100 p-2">
              <select
                value={v.type}
                onChange={(e) => updateVariant(idx, { type: e.target.value as Variant["type"] })}
                className="h-9 rounded-lg border border-zinc-200 bg-zinc-50 px-2 text-xs"
              >
                <option value="SIZE">Size</option>
                <option value="COLOR">Color</option>
                <option value="MATERIAL">Material</option>
              </select>
              <input
                placeholder="Value (e.g. M, Red)"
                value={v.value}
                onChange={(e) => updateVariant(idx, { value: e.target.value })}
                className="h-9 rounded-lg border border-zinc-200 bg-zinc-50 px-2 text-xs"
              />
              <input
                placeholder="+₹"
                type="number"
                value={v.priceDelta}
                onChange={(e) => updateVariant(idx, { priceDelta: Number(e.target.value) })}
                className="h-9 w-16 rounded-lg border border-zinc-200 bg-zinc-50 px-2 text-xs"
              />
              <input
                placeholder="Stock"
                type="number"
                value={v.stockQuantity}
                onChange={(e) => updateVariant(idx, { stockQuantity: Number(e.target.value) })}
                className="h-9 w-16 rounded-lg border border-zinc-200 bg-zinc-50 px-2 text-xs"
              />
              <button onClick={() => removeVariant(idx)} className="text-zinc-400 hover:text-danger-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-800">Specifications</p>
          <button onClick={addSpec} className="flex items-center gap-1 text-xs font-semibold text-brand-600">
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
        <div className="space-y-2">
          {form.specs.map((s, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                placeholder="Attribute"
                value={s.key}
                onChange={(e) => updateSpec(idx, { key: e.target.value })}
                className="h-9 flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2 text-xs"
              />
              <input
                placeholder="Value"
                value={s.value}
                onChange={(e) => updateSpec(idx, { value: e.target.value })}
                className="h-9 flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2 text-xs"
              />
              <button onClick={() => removeSpec(idx)} className="text-zinc-400 hover:text-danger-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <Button size="lg" fullWidth loading={saving} onClick={submit}>
        {productId ? "Save changes" : "Add product"}
      </Button>
    </div>
  );
}
