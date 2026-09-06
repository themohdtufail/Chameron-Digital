import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Phone, Store as StoreIcon } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { OrderStatusBadge, OrderStatusTimeline, type OrderStatusValue } from "@/components/OrderStatus";
import { DeliveryOrderActions } from "@/components/delivery/DeliveryOrderActions";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DeliveryOrderDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();

  const order = await prisma.order.findFirst({
    where: { id: params.id, deliveryPartnerId: user!.id },
    include: {
      items: true,
      store: { select: { name: true, phone: true, addressLine: true, area: true, city: true } },
    },
  });
  if (!order) notFound();

  return (
    <div className="animate-fade-in pb-28 lg:pb-16">
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-zinc-100 bg-white/95 px-4 py-4 backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:px-10 lg:pt-8 lg:backdrop-blur-none">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Link href="/delivery/deliveries">
            <ArrowLeft className="h-5 w-5 text-zinc-700" />
          </Link>
          <h1 className="text-lg font-extrabold text-zinc-900 lg:text-2xl">Order {order.orderNumber}</h1>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-5 px-4 py-5 lg:px-10 lg:py-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-500">{order.items.length} items · {formatCurrency(order.total)}</p>
          <OrderStatusBadge status={order.status as OrderStatusValue} />
        </div>

        <section className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-card">
          <OrderStatusTimeline status={order.status as OrderStatusValue} hasDeliveryPartner />
        </section>

        <section className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-card">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-zinc-900">
            <StoreIcon className="h-4 w-4 text-brand-600" /> Pickup from
          </h2>
          <p className="text-sm font-semibold text-zinc-800">{order.store.name}</p>
          <p className="mt-1 flex items-start gap-1.5 text-sm text-zinc-600">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {[order.store.addressLine, order.store.area, order.store.city].filter(Boolean).join(", ")}
          </p>
          <a
            href={`tel:${order.store.phone}`}
            className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-zinc-100 py-2.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 active:scale-95"
          >
            <Phone className="h-4 w-4 text-brand-600" /> Call store
          </a>
        </section>

        <section className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-card">
          <h2 className="mb-3 text-sm font-bold text-zinc-900">Deliver to</h2>
          <p className="text-sm font-semibold text-zinc-800">{order.customerName}</p>
          <p className="mt-1 flex items-start gap-1.5 text-sm text-zinc-600">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {order.addressSnapshot}
          </p>
          <a
            href={`tel:${order.customerPhone}`}
            className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-zinc-100 py-2.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 active:scale-95"
          >
            <Phone className="h-4 w-4 text-brand-600" /> Call customer
          </a>
        </section>

        {order.paymentMethod === "COD" && (
          <div className="rounded-2xl bg-accent-50 p-4 text-center text-sm font-bold text-accent-700">
            Collect {formatCurrency(order.total)} cash on delivery
          </div>
        )}

        <div className="hidden lg:block">
          <DeliveryOrderActions orderId={order.id} status={order.status as OrderStatusValue} />
        </div>
      </div>

      <div className="action-bar fixed inset-x-0 bottom-[64px] z-40 border-t border-zinc-100 p-4 lg:hidden">
        <DeliveryOrderActions orderId={order.id} status={order.status as OrderStatusValue} />
      </div>
    </div>
  );
}
