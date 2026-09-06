import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { OrderStatusBadge, OrderStatusTimeline, type OrderStatusValue } from "@/components/OrderStatus";
import { CancelOrderButton } from "@/components/buyer/CancelOrderButton";
import { ReviewForm } from "@/components/buyer/ReviewForm";
import { ReorderButton } from "@/components/buyer/ReorderButton";
import { ContactStoreButtons } from "@/components/buyer/ContactStoreButtons";
import { PaymentActions } from "@/components/buyer/PaymentActions";
import { formatCurrency } from "@/lib/utils";

const CANCELLABLE = ["PENDING", "CONFIRMED"];
const REORDERABLE = ["DELIVERED", "CANCELLED", "REJECTED"];

export const dynamic = "force-dynamic";

export default async function BuyerOrderDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  const order = await prisma.order.findFirst({
    where: { id: params.id, buyerId: user!.id },
    include: {
      items: true,
      payment: true,
      store: { select: { name: true, logoUrl: true, phone: true, slug: true } },
      deliveryPartner: { select: { name: true, phone: true } },
    },
  });

  if (!order) notFound();

  const existingReview =
    order.status === "DELIVERED" ? await prisma.review.findUnique({ where: { orderId: order.id } }) : null;

  return (
    <div className="animate-fade-in pb-10">
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-zinc-100 bg-white/95 px-4 py-4 backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:backdrop-blur-none">
        <div className="mx-auto flex max-w-2xl items-center gap-3 lg:px-8 lg:pt-4">
          <Link href="/buyer/orders">
            <ArrowLeft className="h-5 w-5 text-zinc-700" />
          </Link>
          <h1 className="text-lg font-extrabold text-zinc-900 lg:text-2xl">Order {order.orderNumber}</h1>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-5 px-4 py-5 lg:px-8 lg:py-6">
        {order.status === "PENDING" && (
          <div className="flex flex-col items-center rounded-2xl bg-brand-50 py-6 text-center">
            <CheckCircle2 className="h-8 w-8 text-brand-600" />
            <p className="mt-2 text-sm font-bold text-brand-800">Order placed successfully!</p>
            <p className="text-xs text-brand-600">The store will confirm your order shortly.</p>
          </div>
        )}

        <section className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-bold text-zinc-900">{order.store.name}</p>
            <OrderStatusBadge status={order.status as OrderStatusValue} />
          </div>
          <OrderStatusTimeline status={order.status as OrderStatusValue} hasDeliveryPartner={Boolean(order.deliveryPartnerId)} />
        </section>

        <section className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-card">
          <h2 className="mb-3 text-sm font-bold text-zinc-900">Items</h2>
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
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-success-600">
                <span>Loyalty discount ({order.loyaltyPointsRedeemed} pts)</span>
                <span>-{formatCurrency(order.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-extrabold text-zinc-900">
              <span>Total</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-card">
          <h2 className="mb-2 text-sm font-bold text-zinc-900">Delivery details</h2>
          <p className="flex items-start gap-2 text-sm text-zinc-600">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /> {order.addressSnapshot}
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            {order.customerName} · {order.customerPhone}
          </p>
          {order.notes && <p className="mt-2 text-xs text-zinc-400">Note: {order.notes}</p>}
        </section>

        {order.deliveryPartner && (
          <section className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-card">
            <h2 className="mb-2 text-sm font-bold text-zinc-900">Delivery partner</h2>
            <p className="text-sm text-zinc-600">
              {order.deliveryPartner.name ?? "Assigned"} · {order.deliveryPartner.phone}
            </p>
          </section>
        )}

        <section className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-card">
          <h2 className="mb-2 text-sm font-bold text-zinc-900">Payment</h2>
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-500">{order.paymentMethod === "COD" ? "Cash on Delivery" : "Online payment"}</span>
            <PaymentStatusPill status={order.payment?.status ?? order.paymentStatus} />
          </div>
          {order.payment?.status === "FAILED" && order.payment.failureReason && (
            <p className="mt-2 text-xs text-danger-600">{order.payment.failureReason}</p>
          )}
          {order.payment?.paidAt && (
            <p className="mt-2 text-xs text-zinc-400">Paid on {new Date(order.payment.paidAt).toLocaleString()}</p>
          )}
        </section>

        {order.paymentMethod === "ONLINE" &&
          order.payment &&
          (order.payment.status === "PENDING" || order.payment.status === "PROCESSING") && (
            <PaymentActions paymentId={order.payment.id} />
          )}

        <ContactStoreButtons phone={order.store.phone} storeName={order.store.name} orderNumber={order.orderNumber} />

        {CANCELLABLE.includes(order.status) && <CancelOrderButton orderId={order.id} />}
        {REORDERABLE.includes(order.status) && (
          <ReorderButton
            items={order.items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity }))}
          />
        )}
        {order.status === "DELIVERED" && !existingReview && <ReviewForm orderId={order.id} />}
      </div>
    </div>
  );
}

const PAYMENT_STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-zinc-100 text-zinc-600",
  PROCESSING: "bg-amber-100 text-amber-700",
  PAID: "bg-emerald-100 text-emerald-700",
  FAILED: "bg-danger-50 text-danger-600",
  REFUNDED: "bg-zinc-100 text-zinc-600",
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  PAID: "Paid",
  FAILED: "Failed",
  REFUNDED: "Refunded",
};

function PaymentStatusPill({ status }: { status: string }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${PAYMENT_STATUS_STYLES[status] ?? "bg-zinc-100 text-zinc-600"}`}>
      {PAYMENT_STATUS_LABEL[status] ?? status}
    </span>
  );
}
