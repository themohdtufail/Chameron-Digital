import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Phone, User } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { OrderStatusBadge, OrderStatusTimeline, type OrderStatusValue } from "@/components/OrderStatus";
import { SellerOrderActions } from "@/components/seller/SellerOrderActions";
import { DeliveryPartnerPicker } from "@/components/seller/DeliveryPartnerPicker";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SellerOrderDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  const store = await prisma.store.findUnique({ where: { ownerId: user!.id } });
  if (!store) notFound();

  const order = await prisma.order.findFirst({
    where: { id: params.id, storeId: store.id },
    include: { items: true, buyer: true, deliveryPartner: { select: { name: true, phone: true } } },
  });
  if (!order) notFound();

  return (
    <div className="animate-fade-in pb-28 lg:pb-16">
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-zinc-100 bg-white/95 px-4 py-4 backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:px-10 lg:pt-8 lg:backdrop-blur-none">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Link href="/seller/orders">
            <ArrowLeft className="h-5 w-5 text-zinc-700" />
          </Link>
          <h1 className="text-lg font-extrabold text-zinc-900 lg:text-2xl">Order {order.orderNumber}</h1>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-5 px-4 py-5 lg:px-10 lg:py-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-500">Placed {order.createdAt.toLocaleString()}</p>
          <OrderStatusBadge status={order.status as OrderStatusValue} />
        </div>

        <section className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-card">
          <OrderStatusTimeline status={order.status as OrderStatusValue} hasDeliveryPartner={Boolean(order.deliveryPartnerId)} />
        </section>

        <section className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-card">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-zinc-900">
            <User className="h-4 w-4 text-brand-600" /> Customer
          </h2>
          <p className="text-sm font-semibold text-zinc-800">{order.customerName}</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-600">
            <Phone className="h-3.5 w-3.5" /> {order.customerPhone}
          </p>
          <p className="mt-1 flex items-start gap-1.5 text-sm text-zinc-600">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {order.addressSnapshot}
          </p>
          {order.notes && <p className="mt-2 text-xs text-zinc-400">Note: {order.notes}</p>}
        </section>

        <section className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-card">
          <h2 className="mb-3 text-sm font-bold text-zinc-900">Products</h2>
          <div className="divide-y divide-zinc-100">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <p className="font-medium text-zinc-800">
                    {item.productName} <span className="text-zinc-400">× {item.quantity}</span>
                  </p>
                  {item.variantLabel && <p className="text-xs text-zinc-500">{item.variantLabel}</p>}
                </div>
                <p className="font-semibold text-zinc-800">{formatCurrency(item.lineTotal)}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-1 border-t border-dashed border-zinc-200 pt-3 text-sm">
            <div className="flex justify-between text-zinc-500">
              <span>Subtotal</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-zinc-500">
              <span>Delivery charge</span>
              <span>{order.deliveryFee ? formatCurrency(order.deliveryFee) : "Free"}</span>
            </div>
            <div className="flex justify-between text-base font-extrabold text-zinc-900">
              <span>Amount</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Platform fee</span>
              <span>-{formatCurrency(order.platformFee)}</span>
            </div>
            <div className="flex justify-between font-semibold text-success-600">
              <span>You earn</span>
              <span>{formatCurrency(order.sellerEarning)}</span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Payment: {order.paymentMethod === "COD" ? "Cash on Delivery" : "Online"}
            </p>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                order.paymentStatus === "PAID"
                  ? "bg-emerald-100 text-emerald-700"
                  : order.paymentStatus === "FAILED"
                    ? "bg-danger-50 text-danger-600"
                    : "bg-zinc-100 text-zinc-600"
              }`}
            >
              {order.paymentStatus}
            </span>
          </div>
        </section>

        <DeliveryPartnerPicker orderId={order.id} status={order.status} assigned={order.deliveryPartner} />

        <div className="hidden lg:block">
          <SellerOrderActions
            orderId={order.id}
            status={order.status as OrderStatusValue}
            hasDeliveryPartner={Boolean(order.deliveryPartnerId)}
          />
        </div>
      </div>

      <div className="action-bar fixed inset-x-0 bottom-[64px] z-40 border-t border-zinc-100 p-4 lg:hidden">
        <SellerOrderActions
          orderId={order.id}
          status={order.status as OrderStatusValue}
          hasDeliveryPartner={Boolean(order.deliveryPartnerId)}
        />
      </div>
    </div>
  );
}
