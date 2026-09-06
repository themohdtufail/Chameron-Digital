"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IndianRupee, ShoppingBag, XCircle, TrendingUp, Sparkles, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatCurrency, cn } from "@/lib/utils";

interface SeriesPoint {
  date: string;
  orders: number;
  revenue: number;
}

interface ProductStat {
  productId: string;
  name: string;
  views: number;
  cartAdds: number;
  purchases: number;
  conversion: number;
}

interface TopCustomer {
  name: string;
  orders: number;
  totalSpent: number;
}

interface AnalyticsData {
  series: SeriesPoint[];
  totals: { orders: number; revenue: number; cancelled: number; avgOrderValue: number };
  lowStockCount: number;
  pendingRequests: number;
  advancedAnalytics: boolean;
  productAnalytics: ProductStat[];
  customerAnalytics: { newCustomers: number; returningCustomers: number; topCustomers: TopCustomer[] };
}

const RANGES = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
];

export default function SellerAnalyticsPage() {
  const [range, setRange] = useState("7d");
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    setData(null);
    fetch(`/api/seller/analytics?range=${range}`)
      .then((r) => r.json())
      .then(setData);
  }, [range]);

  return (
    <div className="animate-fade-in px-4 py-5 lg:px-10 lg:py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-extrabold text-zinc-900 lg:text-2xl">Analytics</h1>
          <div className="flex gap-2">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition",
                  range === r.value ? "border-brand-600 bg-brand-600 text-white" : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {!data ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
              <StatCard icon={ShoppingBag} label="Orders" value={String(data.totals.orders)} tone="bg-brand-50 text-brand-600" />
              <StatCard icon={IndianRupee} label="Revenue" value={formatCurrency(data.totals.revenue)} tone="bg-success-50 text-success-600" />
              <StatCard icon={TrendingUp} label="Avg order value" value={formatCurrency(data.totals.avgOrderValue)} tone="bg-accent-50 text-accent-600" />
              <StatCard icon={XCircle} label="Cancelled" value={String(data.totals.cancelled)} tone="bg-danger-50 text-danger-600" />
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-2 lg:gap-5">
              <div className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-card">
                <p className="mb-3 text-sm font-bold text-zinc-900">Revenue</p>
                <BarChart points={data.series.map((s) => s.revenue)} labels={data.series.map(formatDayLabel)} formatValue={formatCurrency} color="#16a34a" />
              </div>
              <div className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-card">
                <p className="mb-3 text-sm font-bold text-zinc-900">Orders</p>
                <BarChart points={data.series.map((s) => s.orders)} labels={data.series.map(formatDayLabel)} color="#4f46e5" />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 lg:gap-5">
              <div className="rounded-2xl border border-accent-100 bg-accent-50 p-4">
                <p className="text-2xl font-extrabold text-accent-700">{data.lowStockCount}</p>
                <p className="text-xs font-semibold text-accent-700">Low-stock products</p>
              </div>
              <div className="rounded-2xl border border-brand-100 bg-brand-50 p-4">
                <p className="text-2xl font-extrabold text-brand-700">{data.pendingRequests}</p>
                <p className="text-xs font-semibold text-brand-700">Pending product requests</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-2 lg:gap-5">
              <div className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-card">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-bold text-zinc-900">Customers</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xl font-extrabold text-zinc-900">{data.customerAnalytics.newCustomers}</p>
                    <p className="text-xs text-zinc-500">New</p>
                  </div>
                  <div>
                    <p className="text-xl font-extrabold text-zinc-900">{data.customerAnalytics.returningCustomers}</p>
                    <p className="text-xs text-zinc-500">Returning</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-card">
                <p className="mb-3 text-sm font-bold text-zinc-900">Top customers</p>
                {!data.advancedAnalytics ? (
                  <UpsellNotice />
                ) : data.customerAnalytics.topCustomers.length === 0 ? (
                  <p className="text-sm text-zinc-400">No orders yet.</p>
                ) : (
                  <div className="space-y-2">
                    {data.customerAnalytics.topCustomers.map((c, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Users className="h-3.5 w-3.5 text-zinc-300" />
                          <span className="font-medium text-zinc-700">{c.name}</span>
                          <span className="text-xs text-zinc-400">{c.orders} orders</span>
                        </div>
                        <span className="font-semibold text-zinc-900">{formatCurrency(c.totalSpent)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-zinc-100 bg-white p-4 shadow-card">
              <p className="mb-3 text-sm font-bold text-zinc-900">Product performance</p>
              {!data.advancedAnalytics ? (
                <UpsellNotice />
              ) : data.productAnalytics.length === 0 ? (
                <p className="text-sm text-zinc-400">No product activity in this period yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-xs text-zinc-400">
                        <th className="pb-2 font-medium">Product</th>
                        <th className="pb-2 font-medium">Views</th>
                        <th className="pb-2 font-medium">Cart adds</th>
                        <th className="pb-2 font-medium">Purchases</th>
                        <th className="pb-2 font-medium">Conversion</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {data.productAnalytics.map((p) => (
                        <tr key={p.productId}>
                          <td className="py-2 font-medium text-zinc-800">{p.name}</td>
                          <td className="py-2 text-zinc-600">{p.views}</td>
                          <td className="py-2 text-zinc-600">{p.cartAdds}</td>
                          <td className="py-2 text-zinc-600">{p.purchases}</td>
                          <td className="py-2 text-zinc-600">{p.conversion}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function UpsellNotice() {
  return (
    <Link
      href="/seller/plans"
      className="flex items-center gap-2 rounded-xl bg-accent-50 px-3 py-2.5 text-xs font-semibold text-accent-700 hover:bg-accent-100"
    >
      <Sparkles className="h-3.5 w-3.5" /> Upgrade to Premium to unlock this
    </Link>
  );
}

function formatDayLabel(s: SeriesPoint) {
  return new Date(s.date).toLocaleDateString(undefined, { weekday: "short", day: "numeric" });
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof ShoppingBag;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-card">
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", tone)}>
        <Icon className="h-[18px] w-[18px]" />
      </div>
      <p className="mt-3 text-lg font-extrabold text-zinc-900">{value}</p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  );
}

function BarChart({
  points,
  labels,
  color,
  formatValue,
}: {
  points: number[];
  labels: string[];
  color: string;
  formatValue?: (n: number) => string;
}) {
  const width = 600;
  const height = 180;
  const padding = 24;
  const max = Math.max(1, ...points);
  const barWidth = (width - padding * 2) / points.length;

  if (points.every((p) => p === 0)) {
    return <p className="flex h-[180px] items-center justify-center text-sm text-zinc-400">No data for this period yet.</p>;
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img">
      {points.map((value, i) => {
        const barHeight = (value / max) * (height - padding * 2);
        const x = padding + i * barWidth + barWidth * 0.15;
        const y = height - padding - barHeight;
        const w = barWidth * 0.7;
        return (
          <g key={i}>
            <rect x={x} y={y} width={w} height={Math.max(barHeight, value > 0 ? 2 : 0)} rx={3} fill={color} opacity={0.85}>
              <title>
                {labels[i]}: {formatValue ? formatValue(value) : value}
              </title>
            </rect>
            {points.length <= 14 && (
              <text x={x + w / 2} y={height - 6} textAnchor="middle" fontSize="9" fill="#a1a1aa">
                {labels[i].split(" ")[0]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
