"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Percent, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { DEFAULT_COMMISSION_PERCENTAGE } from "@/lib/pricing";

interface Rule {
  id: string;
  scope: "GLOBAL" | "CATEGORY" | "STORE";
  percentage: number;
  category: { name: string } | null;
  store: { name: string } | null;
}

interface Category {
  id: string;
  name: string;
}

interface StoreOption {
  id: string;
  name: string;
}

export default function AdminCommissionsPage() {
  const [rules, setRules] = useState<Rule[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [scope, setScope] = useState<Rule["scope"]>("GLOBAL");
  const [targetId, setTargetId] = useState("");
  const [percentage, setPercentage] = useState(10);
  const [creating, setCreating] = useState(false);

  async function load() {
    const [rulesRes, catRes, storesRes] = await Promise.all([
      fetch("/api/admin/commission-rules"),
      fetch("/api/categories"),
      fetch("/api/admin/stores"),
    ]);
    setRules((await rulesRes.json()).rules ?? []);
    setCategories((await catRes.json()).categories ?? []);
    setStores(((await storesRes.json()).stores ?? []).map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })));
  }

  useEffect(() => {
    load();
  }, []);

  async function createRule() {
    setCreating(true);
    const res = await fetch("/api/admin/commission-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scope,
        percentage,
        categoryId: scope === "CATEGORY" ? targetId : undefined,
        storeId: scope === "STORE" ? targetId : undefined,
      }),
    });
    setCreating(false);
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Could not create rule");
      return;
    }
    toast.success("Commission rule created");
    setTargetId("");
    load();
  }

  async function removeRule(id: string) {
    if (!window.confirm("Delete this commission rule?")) return;
    const res = await fetch(`/api/admin/commission-rules/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not delete rule");
      return;
    }
    toast.success("Rule deleted");
    load();
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-extrabold text-zinc-900">Commission rules</h1>
      <p className="mb-4 text-sm text-zinc-500">
        Resolved store-specific &gt; category &gt; global at order creation. A store or category can only have one
        rule — creating a duplicate is rejected.
      </p>

      <div className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-card">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">Scope</label>
          <select
            value={scope}
            onChange={(e) => {
              setScope(e.target.value as Rule["scope"]);
              setTargetId("");
            }}
            className="h-11 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm"
          >
            <option value="GLOBAL">Global (default)</option>
            <option value="CATEGORY">Category</option>
            <option value="STORE">Store</option>
          </select>
        </div>

        {scope === "CATEGORY" && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">Category</label>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="h-11 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm"
            >
              <option value="">Select a category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {scope === "STORE" && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">Store</label>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="h-11 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm"
            >
              <option value="">Select a store</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="w-28">
          <Input label="Percentage" type="number" value={percentage} onChange={(e) => setPercentage(Number(e.target.value))} />
        </div>

        <Button
          loading={creating}
          disabled={scope !== "GLOBAL" && !targetId}
          onClick={createRule}
        >
          Add rule
        </Button>
      </div>

      {!rules && <Skeleton className="h-16 w-full" />}
      {rules && rules.length === 0 && (
        <EmptyState icon={Percent} title="No rules yet" description={`Orders default to ${DEFAULT_COMMISSION_PERCENTAGE}% commission.`} />
      )}
      {rules && rules.length > 0 && (
        <div className="space-y-2">
          {rules.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-3 shadow-card">
              <div className="flex items-center gap-2">
                <Badge tone={r.scope === "GLOBAL" ? "neutral" : r.scope === "CATEGORY" ? "accent" : "success"}>
                  {r.scope}
                </Badge>
                <p className="text-sm text-zinc-700">
                  {r.category?.name ?? r.store?.name ?? "All stores"} · {r.percentage}%
                </p>
              </div>
              <button onClick={() => removeRule(r.id)} className="text-zinc-400 hover:text-danger-500">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
