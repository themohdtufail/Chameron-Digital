import Link from "next/link";
import Image from "next/image";
import { ClipboardList, Store as StoreIcon } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { EmptyState } from "@/components/ui/EmptyState";
import { OrderStatusBadge, type OrderStatusValue } from "@/components/OrderStatus";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function BuyerOrdersPage() {
  const user = await getCurrentUser();
  const orders = await prisma.order.findMany({
    where: { buyerId: user!.id },
    include: { store: { select: { name: true, logoUrl: true } }, items: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="animate-fade-in">
      <div className="sticky top-0 z-30 border-b border-zinc-100 bg-white/95 px-4 py-4 backdrop-blur">
        <h1 className="text-lg font-extrabold text-zinc-900">My Orders</h1>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No orders yet"
          description="Your order history will show up here."
          action={
            <Link href="/buyer/home">
              <Button>Start shopping</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3 px-4 py-4">
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
