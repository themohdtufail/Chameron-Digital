import { ClipboardList } from "lucide-react";
import { prisma } from "@/lib/db";
import { OrderStatusBadge, type OrderStatusValue } from "@/components/OrderStatus";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    include: { store: { select: { name: true } }, buyer: { select: { name: true, phone: true } }, items: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <h1 className="mb-4 text-xl font-extrabold text-zinc-900">All orders</h1>

      {orders.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No orders yet" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-card">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-zinc-100 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Store</th>
                <th className="px-4 py-3">Buyer</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="px-4 py-3 font-semibold text-zinc-800">{order.orderNumber}</td>
                  <td className="px-4 py-3 text-zinc-600">{order.store.name}</td>
                  <td className="px-4 py-3 text-zinc-600">{order.buyer.name ?? order.buyer.phone}</td>
                  <td className="px-4 py-3 text-zinc-600">{order.items.length}</td>
                  <td className="px-4 py-3 font-semibold text-zinc-800">{formatCurrency(order.total)}</td>
                  <td className="px-4 py-3">
                    <OrderStatusBadge status={order.status as OrderStatusValue} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
