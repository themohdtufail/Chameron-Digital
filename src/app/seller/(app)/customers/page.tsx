"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatCurrency } from "@/lib/utils";

interface Customer {
  id: string;
  name: string | null;
  phone: string;
  orders: number;
  totalSpent: number;
  lastOrderAt: string;
}

export default function SellerCustomersPage() {
  const [customers, setCustomers] = useState<Customer[] | null>(null);

  useEffect(() => {
    fetch("/api/seller/customers", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setCustomers(d.customers ?? []));
  }, []);

  return (
    <div className="animate-fade-in px-4 py-5 lg:px-10 lg:py-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-4 text-lg font-extrabold text-zinc-900 lg:text-2xl">Customers</h1>

        {!customers && (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}

        {customers && customers.length === 0 && (
          <EmptyState icon={Users} title="No customers yet" description="Your customers will show up here after their first order." />
        )}

        {customers && customers.length > 0 && (
          <div className="grid gap-2 lg:grid-cols-2 lg:gap-3">
            {customers.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-2xl border border-zinc-100 bg-white p-3.5 shadow-card">
                <div>
                  <p className="text-sm font-bold text-zinc-900">{c.name ?? "Customer"}</p>
                  <p className="text-xs text-zinc-500">{c.phone}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-zinc-800">{formatCurrency(c.totalSpent)}</p>
                  <p className="text-xs text-zinc-500">{c.orders} order{c.orders > 1 ? "s" : ""}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
