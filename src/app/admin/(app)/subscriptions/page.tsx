"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";

interface PlanFeatures {
  maxProducts: number | null;
  ai: boolean;
  whatsappTemplates: boolean;
  advancedAnalytics: boolean;
}

interface Plan {
  id: string;
  key: string;
  name: string;
  priceMonthly: number;
  features: PlanFeatures;
}

interface SubscriptionRow {
  id: string;
  status: "TRIAL" | "ACTIVE" | "EXPIRED" | "CANCELLED";
  expiryDate: string;
  store: { name: string; slug: string };
  plan: { name: string; key: string };
}

const STATUS_TONE = { TRIAL: "accent", ACTIVE: "success", EXPIRED: "neutral", CANCELLED: "danger" } as const;

export default function AdminSubscriptionsPage() {
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[] | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  async function load() {
    const [plansRes, subsRes] = await Promise.all([
      fetch("/api/admin/subscription-plans"),
      fetch("/api/admin/subscriptions"),
    ]);
    setPlans((await plansRes.json()).plans ?? []);
    setSubscriptions((await subsRes.json()).subscriptions ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function savePlan(plan: Plan) {
    setSaving(plan.id);
    const res = await fetch(`/api/admin/subscription-plans/${plan.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceMonthly: plan.priceMonthly, features: plan.features }),
    });
    setSaving(null);
    if (!res.ok) {
      toast.error("Could not save plan");
      return;
    }
    toast.success(`${plan.name} updated`);
    load();
  }

  function updatePlan(id: string, patch: Partial<Plan> | { features: Partial<PlanFeatures> }) {
    setPlans((prev) =>
      prev?.map((p) =>
        p.id === id
          ? { ...p, ...patch, features: { ...p.features, ...(("features" in patch && patch.features) || {}) } }
          : p
      ) ?? null
    );
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-extrabold text-zinc-900">Subscriptions</h1>

      <h2 className="mb-2 text-sm font-bold text-zinc-700">Plans</h2>
      {!plans && (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
        </div>
      )}
      {plans && (
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.id} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-card">
              <p className="text-sm font-bold text-zinc-900">{plan.name}</p>
              <Input
                label="Price / month (₹)"
                type="number"
                value={plan.priceMonthly}
                onChange={(e) => updatePlan(plan.id, { priceMonthly: Number(e.target.value) })}
              />
              <Input
                label="Max products (blank = unlimited)"
                type="number"
                value={plan.features.maxProducts ?? ""}
                onChange={(e) =>
                  updatePlan(plan.id, { features: { maxProducts: e.target.value === "" ? null : Number(e.target.value) } })
                }
              />
              <div className="mt-2 space-y-1.5">
                {(["ai", "whatsappTemplates", "advancedAnalytics"] as const).map((key) => (
                  <label key={key} className="flex items-center justify-between text-xs font-medium text-zinc-600">
                    {key === "ai" ? "AI assistant" : key === "whatsappTemplates" ? "WhatsApp notifications" : "Advanced analytics"}
                    <input
                      type="checkbox"
                      checked={plan.features[key]}
                      onChange={(e) => updatePlan(plan.id, { features: { [key]: e.target.checked } })}
                      className="h-4 w-4 accent-brand-600"
                    />
                  </label>
                ))}
              </div>
              <Button size="sm" fullWidth loading={saving === plan.id} onClick={() => savePlan(plan)} className="mt-3">
                Save
              </Button>
            </div>
          ))}
        </div>
      )}

      <h2 className="mb-2 text-sm font-bold text-zinc-700">Seller subscriptions</h2>
      {!subscriptions && <Skeleton className="h-16 w-full" />}
      {subscriptions && subscriptions.length === 0 && (
        <p className="flex items-center gap-2 text-sm text-zinc-400">
          <CreditCard className="h-4 w-4" /> No subscriptions yet.
        </p>
      )}
      {subscriptions && subscriptions.length > 0 && (
        <div className="space-y-2">
          {subscriptions.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-3 shadow-card">
              <div>
                <p className="text-sm font-bold text-zinc-900">{s.store.name}</p>
                <p className="text-xs text-zinc-500">
                  {s.plan.name} · Expires {new Date(s.expiryDate).toLocaleDateString()}
                </p>
              </div>
              <Badge tone={STATUS_TONE[s.status]}>{s.status}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
