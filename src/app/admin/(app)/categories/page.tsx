"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Trash2, Tag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

interface CategoryRow {
  id: string;
  name: string;
  icon: string | null;
  isActive: boolean;
  _count: { stores: number };
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryRow[] | null>(null);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/categories", { cache: "no-store" });
    const data = await res.json();
    setCategories(data.categories ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function addCategory() {
    if (!name.trim()) return;
    setSaving(true);
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, icon: icon || undefined }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error((await res.json()).error || "Could not add category");
      return;
    }
    setName("");
    setIcon("");
    toast.success("Category added");
    load();
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this category?")) return;
    const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not delete category");
      return;
    }
    toast.success("Category deleted");
    load();
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-extrabold text-zinc-900">Categories</h1>

      <div className="mb-5 flex gap-2 rounded-2xl border border-zinc-200 bg-white p-3 shadow-card">
        <Input placeholder="Category name" value={name} onChange={(e) => setName(e.target.value)} className="flex-1" />
        <Input placeholder="Emoji" value={icon} onChange={(e) => setIcon(e.target.value)} className="w-20" />
        <Button loading={saving} onClick={addCategory}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {!categories && (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      )}

      {categories && categories.length === 0 && (
        <EmptyState icon={Tag} title="No categories yet" description="Add your first business category above." />
      )}

      {categories && categories.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-3">
              <div className="flex items-center gap-2">
                <span>{c.icon ?? "🏬"}</span>
                <div>
                  <p className="text-sm font-semibold text-zinc-800">{c.name}</p>
                  <p className="text-xs text-zinc-400">{c._count.stores} stores</p>
                </div>
              </div>
              <button onClick={() => remove(c.id)} className="text-zinc-400 hover:text-danger-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
