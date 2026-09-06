"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn, formatCurrency } from "@/lib/utils";

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

interface Subscription {
  id: string;
  status: "TRIAL" | "ACTIVE" | "EXPIRED" | "CANCELLED";
  expiryDate: string;
  plan: Plan;
}

const STATUS_LABEL: Record<Subscription["status"], string> = {
  TRIAL: "Trial",
  ACTIVE: "Active",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
};

export default function SellerPlansPage() {
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [productCount, setProductCount] = useState(0);
  const [switching, setSwitching] = useState<string | null>(null);

  async function load() {
    const [plansRes, subRes] = await Promise.all([
      fetch("/api/subscription-plans"),
      fetch("/api/seller/subscription"),
    ]);
    const plansData = await plansRes.json();
    const subData = await subRes.json();
    setPlans(plansData.plans ?? []);
    setSubscription(subData.subscription ?? null);
    setProductCount(subData.productCount ?? 0);
  }

  useEffect(() => {
    load();
  }, []);

  async function switchPlan(planKey: string) {
    setSwitching(planKey);
    const res = await fetch("/api/seller/subscription", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planKey }),
    });
    setSwitching(null);
    if (!res.ok) {
      toast.error("Could not switch plan");
      return;
    }
    toast.success(`Switched to ${planKey}`);
    load();
  }

  if (!plans) return <div className="p-6 text-center text-sm text-zinc-400">Loading plans…</div>;

  return (
    <div className="animate-fade-in px-4 py-5 lg:px-10 lg:py-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-xl font-extrabold text-zinc-900 lg:text-2xl">Plans &amp; billing</h1>

        {subscription && (
          <div className="mt-4 rounded-2xl border border-zinc-100 bg-white p-4 shadow-card">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-zinc-900">
                Current plan: {subscription.plan.name} · {STATUS_LABEL[subscription.status]}
              </p>
              <p className="text-xs text-zinc-400">
                {subscription.status === "EXPIRED" ? "Expired" : "Renews"} {new Date(subscription.expiryDate).toLocaleDateString()}
              </p>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              {productCount} product{productCount === 1 ? "" : "s"} used
              {subscription.plan.features.maxProducts !== null && ` of ${subscription.plan.features.maxProducts}`}
            </p>
          </div>
        )}

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = subscription?.plan.key === plan.key && subscription.status !== "EXPIRED";
            return (
              <div
                key={plan.id}
                className={cn(
                  "rounded-2xl border p-5 shadow-card",
                  isCurrent ? "border-brand-500 bg-brand-50" : "border-zinc-100 bg-white"
                )}
              >
                <div className="flex items-center gap-2">
                  {plan.key === "PREMIUM" && <Sparkles className="h-4 w-4 text-accent-500" />}
                  <h2 className="text-base font-extrabold text-zinc-900">{plan.name}</h2>
                </div>
                <p className="mt-1 text-2xl font-extrabold text-zinc-900">
                  {plan.priceMonthly === 0 ? "Free" : formatCurrency(plan.priceMonthly)}
                  {plan.priceMonthly > 0 && <span className="text-sm font-medium text-zinc-400">/mo</span>}
                </p>
                <ul className="mt-4 space-y-2 text-sm text-zinc-600">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-success-500" />
                    {plan.features.maxProducts === null ? "Unlimited products" : `Up to ${plan.features.maxProducts} products`}
                  </li>
                  {plan.features.ai && (
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-success-500" /> AI assistant
                    </li>
                  )}
                  {plan.features.whatsappTemplates && (
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-success-500" /> WhatsApp notifications
                    </li>
                  )}
                  {plan.features.advancedAnalytics && (
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-success-500" /> Advanced analytics
                    </li>
                  )}
                </ul>
                <Button
                  size="sm"
                  fullWidth
                  variant={isCurrent ? "outline" : "primary"}
                  disabled={isCurrent}
                  loading={switching === plan.key}
                  onClick={() => switchPlan(plan.key)}
                  className="mt-5"
                >
                  {isCurrent ? "Current plan" : "Switch to this plan"}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
