"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Truck } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { OrderStatusBadge, type OrderStatusValue } from "@/components/OrderStatus";
import { cn, formatCurrency } from "@/lib/utils";

interface OrderRow {
  id: string;
  orderNumber: string;
  status: OrderStatusValue;
  total: number;
  addressSnapshot: string;
  items: { id: string }[];
  store: { name: string; city: string; area: string | null };
}

const TABS = [
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
];

export default function DeliveryDeliveriesPage() {
  const [tab, setTab] = useState("active");
  const [orders, setOrders] = useState<OrderRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setOrders(null);
    fetch(`/api/delivery/orders?group=${tab}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setOrders(d.orders ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [tab]);

  return (
    <div className="animate-fade-in">
      <div className="sticky top-0 z-30 border-b border-zinc-100 bg-white/95 px-4 pb-3 pt-4 backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:px-10 lg:pt-8 lg:backdrop-blur-none">
        <div className="mx-auto max-w-5xl">
          <h1 className="mb-3 text-lg font-extrabold text-zinc-900 lg:text-2xl">Deliveries</h1>
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold transition",
                  tab === t.key ? "border-brand-600 bg-brand-600 text-white" : "border-zinc-200 text-zinc-600"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 py-4 lg:px-10 lg:py-6">
        <div className="mx-auto max-w-5xl">
          {!orders && (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          )}

          {orders && orders.length === 0 && (
            <EmptyState icon={Truck} title="No deliveries here" description="Assigned deliveries will show up here." />
          )}

          {orders && orders.length > 0 && (
            <div className="grid gap-3 lg:grid-cols-2">
              {orders.map((order) => (
                <Link
                  key={order.id}
                  href={`/delivery/deliveries/${order.id}`}
                  className="flex items-center justify-between rounded-2xl border border-zinc-100 bg-white p-3.5 shadow-card"
                >
                  <div>
                    <p className="text-sm font-bold text-zinc-900">{order.orderNumber}</p>
                    <p className="text-xs text-zinc-500">
                      {order.store.name} · {order.store.area ?? order.store.city}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-zinc-800">
                      {order.items.length} item{order.items.length > 1 ? "s" : ""} · {formatCurrency(order.total)}
                    </p>
                  </div>
                  <OrderStatusBadge status={order.status} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
