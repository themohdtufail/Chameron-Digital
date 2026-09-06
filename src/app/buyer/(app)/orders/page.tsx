import Link from "next/link";
import Image from "next/image";
import { ClipboardList, Store as StoreIcon } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { EmptyState } from "@/components/ui/EmptyState";
import { OrderStatusBadge, type OrderStatusValue } from "@/components/OrderStatus";
import { Button } from "@/components/ui/Button";
import { cn, formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TABS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const TAB_STATUSES: Record<string, OrderStatusValue[] | undefined> = {
  active: ["PENDING", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY"],
  completed: ["DELIVERED"],
  cancelled: ["CANCELLED", "REJECTED"],
};

export default async function BuyerOrdersPage({ searchParams }: { searchParams: { tab?: string } }) {
  const user = await getCurrentUser();
  const tab = searchParams.tab && TAB_STATUSES[searchParams.tab] ? searchParams.tab : "all";
  const statuses = TAB_STATUSES[tab];

  const orders = await prisma.order.findMany({
    where: { buyerId: user!.id, status: statuses ? { in: statuses } : undefined },
    include: { store: { select: { name: true, logoUrl: true } }, items: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="animate-fade-in">
      <div className="sticky top-0 z-30 space-y-3 border-b border-zinc-100 bg-white/95 px-4 py-4 backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:backdrop-blur-none">
        <div className="mx-auto max-w-2xl lg:px-8 lg:pt-4">
          <h1 className="mb-3 text-lg font-extrabold text-zinc-900 lg:text-2xl">My Orders</h1>
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {TABS.map((t) => (
              <Link
                key={t.value}
                href={t.value === "all" ? "/buyer/orders" : `/buyer/orders?tab=${t.value}`}
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition",
                  tab === t.value ? "border-brand-600 bg-brand-600 text-white" : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                )}
              >
                {t.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No orders here"
          description={tab === "all" ? "Your order history will show up here." : "Nothing in this category yet."}
          action={
            <Link href="/buyer/home">
              <Button>Start shopping</Button>
            </Link>
          }
        />
      ) : (
        <div className="mx-auto max-w-2xl space-y-3 px-4 py-4 lg:px-8 lg:py-6">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/buyer/order/${order.id}`}
              className="flex items-center gap-3 rounded-2xl border border-zinc-100 bg-white p-3 shadow-card transition active:scale-[0.99]"
            >
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-zinc-50">
                {order.store.logoUrl ? (
                  <Image src={order.store.logoUrl} alt="" fill className="object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <StoreIcon className="h-5 w-5 text-zinc-300" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-zinc-900">{order.store.name}</p>
                <p className="text-xs text-zinc-500">
                  {order.orderNumber} · {order.items.length} item{order.items.length > 1 ? "s" : ""}
                </p>
                <p className="mt-0.5 text-sm font-semibold text-zinc-800">{formatCurrency(order.total)}</p>
              </div>
              <OrderStatusBadge status={order.status as OrderStatusValue} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
