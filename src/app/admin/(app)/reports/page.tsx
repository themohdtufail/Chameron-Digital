"use client";

import { useEffect, useState } from "react";
import { IndianRupee, ShoppingBag, Percent, Users, Truck, LifeBuoy, Store } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { BarChart } from "@/components/BarChart";
import { formatCurrency } from "@/lib/utils";

interface ReportData {
  period: { days: number };
  totals: {
    revenue: number;
    commission: number;
    sellerEarnings: number;
    orders: number;
    activeSellers: number;
    buyers: number;
    deliveryPartners: number;
    openTickets: number;
  };
  series: { date: string; revenue: number; orders: number }[];
  subscriptionBreakdown: { planName: string; count: number }[];
  topStoresByRevenue: { storeName: string; revenue: number }[];
}

function formatDayLabel(date: string) {
  return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function AdminReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);

  useEffect(() => {
    fetch("/api/admin/reports", { cache: "no-store" })
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const cards = [
    { label: `Revenue (${data.period.days}d)`, value: formatCurrency(data.totals.revenue), icon: IndianRupee, tone: "bg-success-50 text-success-600" },
    { label: "Commission earned", value: formatCurrency(data.totals.commission), icon: Percent, tone: "bg-accent-50 text-accent-600" },
    { label: "Orders", value: data.totals.orders, icon: ShoppingBag, tone: "bg-brand-50 text-brand-600" },
    { label: "Active sellers", value: data.totals.activeSellers, icon: Store, tone: "bg-brand-50 text-brand-600" },
    { label: "Buyers", value: data.totals.buyers, icon: Users, tone: "bg-accent-50 text-accent-600" },
    { label: "Delivery partners", value: data.totals.deliveryPartners, icon: Truck, tone: "bg-success-50 text-success-600" },
    { label: "Open tickets", value: data.totals.openTickets, icon: LifeBuoy, tone: "bg-danger-50 text-danger-600" },
  ];

  return (
    <div>
      <h1 className="mb-4 text-xl font-extrabold text-zinc-900">Platform reports</h1>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-card">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${c.tone}`}>
              <c.icon className="h-[18px] w-[18px]" />
            </div>
            <p className="mt-3 text-lg font-extrabold text-zinc-900">{c.value}</p>
            <p className="text-xs text-zinc-500">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-card">
          <p className="mb-3 text-sm font-bold text-zinc-900">Revenue, last {data.period.days} days</p>
          <BarChart
            points={data.series.map((s) => s.revenue)}
            labels={data.series.map((s) => formatDayLabel(s.date))}
            formatValue={formatCurrency}
            color="#16a34a"
          />
        </div>
        <div className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-card">
          <p className="mb-3 text-sm font-bold text-zinc-900">Orders, last {data.period.days} days</p>
          <BarChart points={data.series.map((s) => s.orders)} labels={data.series.map((s) => formatDayLabel(s.date))} color="#4f46e5" />
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-card">
          <p className="mb-3 text-sm font-bold text-zinc-900">Active subscriptions by plan</p>
          {data.subscriptionBreakdown.length === 0 ? (
            <p className="text-sm text-zinc-400">No active subscriptions.</p>
          ) : (
            <div className="space-y-2">
              {data.subscriptionBreakdown.map((s) => (
                <div key={s.planName} className="flex items-center justify-between text-sm">
                  <span className="text-zinc-700">{s.planName}</span>
                  <span className="font-semibold text-zinc-900">{s.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-card">
          <p className="mb-3 text-sm font-bold text-zinc-900">Top stores by revenue</p>
          {data.topStoresByRevenue.length === 0 ? (
            <p className="text-sm text-zinc-400">No orders in this period yet.</p>
          ) : (
            <div className="space-y-2">
              {data.topStoresByRevenue.map((s) => (
                <div key={s.storeName} className="flex items-center justify-between text-sm">
                  <span className="text-zinc-700">{s.storeName}</span>
                  <span className="font-semibold text-zinc-900">{formatCurrency(s.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
