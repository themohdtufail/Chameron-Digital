import { Store, Clock, Users, ShoppingBag, IndianRupee } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [totalStores, pendingStores, totalBuyers, totalOrders, salesAgg] = await Promise.all([
    prisma.store.count(),
    prisma.store.count({ where: { status: "PENDING" } }),
    prisma.user.count({ where: { role: "BUYER" } }),
    prisma.order.count(),
    prisma.order.aggregate({ where: { status: { in: ["CONFIRMED", "PREPARING", "COMPLETED"] } }, _sum: { total: true } }),
  ]);

  const cards = [
    { label: "Total Stores", value: totalStores, icon: Store, tone: "bg-brand-50 text-brand-600" },
    { label: "Pending Approvals", value: pendingStores, icon: Clock, tone: "bg-accent-50 text-accent-600" },
    { label: "Buyers", value: totalBuyers, icon: Users, tone: "bg-success-50 text-success-600" },
    { label: "Total Orders", value: totalOrders, icon: ShoppingBag, tone: "bg-brand-50 text-brand-600" },
    { label: "Platform Sales", value: formatCurrency(salesAgg._sum.total ?? 0), icon: IndianRupee, tone: "bg-success-50 text-success-600" },
  ];

  return (
    <div>
      <h1 className="mb-5 text-xl font-extrabold text-zinc-900">Platform overview</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-card">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.tone}`}>
              <c.icon className="h-5 w-5" />
            </div>
            <p className="mt-3 text-xl font-extrabold text-zinc-900">{c.value}</p>
            <p className="text-xs text-zinc-500">{c.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
