"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Trash2, Eye, EyeOff, ArrowUp, ArrowDown, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

interface CategoryRow {
  id: string;
  name: string;
  position: number;
  isHidden: boolean;
}

export default function SellerCategoriesPage() {
  const [categories, setCategories] = useState<CategoryRow[] | null>(null);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/seller/product-categories", { cache: "no-store" });
    const data = await res.json();
    setCategories((data.categories ?? []).sort((a: CategoryRow, b: CategoryRow) => a.position - b.position));
  }

  useEffect(() => {
    load();
  }, []);

  async function addCategory() {
    if (!newName.trim()) return;
    setAdding(true);
    const res = await fetch("/api/seller/product-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    setAdding(false);
    if (!res.ok) {
      toast.error((await res.json()).error || "Could not add category");
      return;
    }
    setNewName("");
    toast.success("Category added");
    load();
  }

  async function toggleHidden(cat: CategoryRow) {
    setBusyId(cat.id);
    await fetch(`/api/seller/product-categories/${cat.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isHidden: !cat.isHidden }),
    });
    setBusyId(null);
    load();
  }

  async function move(cat: CategoryRow, dir: -1 | 1) {
    if (!categories) return;
    const idx = categories.findIndex((c) => c.id === cat.id);
    const swapWith = categories[idx + dir];
    if (!swapWith) return;
    setBusyId(cat.id);
    await Promise.all([
      fetch(`/api/seller/product-categories/${cat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position: swapWith.position }),
      }),
      fetch(`/api/seller/product-categories/${swapWith.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position: cat.position }),
      }),
    ]);
    setBusyId(null);
    load();
  }

  async function remove(cat: CategoryRow) {
    if (!window.confirm(`Delete "${cat.name}"? Products in it will become uncategorized.`)) return;
    setBusyId(cat.id);
    await fetch(`/api/seller/product-categories/${cat.id}`, { method: "DELETE" });
    setBusyId(null);
    toast.success("Category deleted");
    load();
  }

  return (
    <div className="animate-fade-in px-4 py-5 lg:px-10 lg:py-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-4 text-lg font-extrabold text-zinc-900 lg:text-2xl">Product categories</h1>

        <div className="mb-4 flex gap-2">
          <Input
            placeholder="e.g. Men, Snacks, Accessories"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCategory()}
          />
          <Button onClick={addCategory} loading={adding}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>

        {!categories && (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        )}

        {categories && categories.length === 0 && (
          <EmptyState icon={LayoutGrid} title="No categories yet" description="Add a category to organize your product catalog." />
        )}

        {categories && categories.length > 0 && (
          <div className="space-y-2">
            {categories.map((cat, idx) => (
              <div key={cat.id} className="flex items-center gap-2 rounded-xl border border-zinc-100 bg-white p-3 shadow-card">
                <div className="flex flex-col">
                  <button disabled={idx === 0} onClick={() => move(cat, -1)} className="text-zinc-400 hover:text-brand-600 disabled:opacity-20">
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    disabled={idx === categories.length - 1}
                    onClick={() => move(cat, 1)}
                    className="text-zinc-400 hover:text-brand-600 disabled:opacity-20"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="flex-1 text-sm font-semibold text-zinc-900">{cat.name}</p>
                {cat.isHidden && <span className="text-xs font-semibold text-zinc-400">Hidden</span>}
                <button disabled={busyId === cat.id} onClick={() => toggleHidden(cat)} className="text-zinc-400 hover:text-brand-600">
                  {cat.isHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button disabled={busyId === cat.id} onClick={() => remove(cat)} className="text-zinc-400 hover:text-danger-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
