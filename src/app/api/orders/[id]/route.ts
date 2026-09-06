import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { withApiErrors, jsonError } from "@/lib/api-utils";
import { createNotification } from "@/lib/notify";
import { canTransition, type OrderStatus } from "@/lib/order-status";

const STATUS_LABEL: Record<string, string> = {
  CONFIRMED: "confirmed",
  PREPARING: "being prepared",
  READY: "ready for pickup/delivery",
  PICKED_UP: "picked up by the delivery partner",
  OUT_FOR_DELIVERY: "out for delivery",
  DELIVERED: "delivered",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
};

// Only these statuses have a seeded NotificationTemplate (matching the
// spec's named events); the rest keep the generic STATUS_LABEL-based
// message with no templateKey (createNotification falls back cleanly).
const TEMPLATE_KEY_BY_STATUS: Partial<Record<string, string>> = {
  CONFIRMED: "order_confirmed",
  PREPARING: "order_preparing",
  OUT_FOR_DELIVERY: "order_shipped",
  DELIVERED: "order_delivered",
};

export const GET = withApiErrors(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const user = await requireUser();
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      items: true,
      store: { select: { id: true, name: true, logoUrl: true, slug: true, phone: true, ownerId: true } },
      buyer: { select: { name: true, phone: true } },
      deliveryPartner: { select: { name: true, phone: true } },
      address: true,
    },
  });
  if (!order) return jsonError("Order not found", 404);

  const isBuyerOwner = order.buyerId === user.id;
  const isSellerOwner = order.store.ownerId === user.id;
  const isAssignedPartner = user.role === "DELIVERY_PARTNER" && order.deliveryPartnerId === user.id;
  if (!isBuyerOwner && !isSellerOwner && !isAssignedPartner && user.role !== "ADMIN") {
    return jsonError("Forbidden", 403);
  }

  return NextResponse.json({ order });
});

const updateSchema = z.object({
  status: z.enum([
    "CONFIRMED",
    "PREPARING",
    "READY",
    "PICKED_UP",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "REJECTED",
    "CANCELLED",
  ]),
  reason: z.string().trim().max(300).optional(),
});

export const PATCH = withApiErrors(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const user = await requireUser();
  const { status, reason } = updateSchema.parse(await req.json());

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { store: { select: { ownerId: true, name: true } }, items: true, payment: true },
  });
  if (!order) return jsonError("Order not found", 404);

  const isSellerOwner = order.store.ownerId === user.id;
  const isBuyerOwner = order.buyerId === user.id;
  const isAssignedPartner = user.role === "DELIVERY_PARTNER" && order.deliveryPartnerId === user.id;
  const isCancellingOrRejecting = status === "CANCELLED" || status === "REJECTED";

  if (!isBuyerOwner && !isSellerOwner && !isAssignedPartner && user.role !== "ADMIN") {
    return jsonError("Forbidden", 403);
  }

  const actor =
    isBuyerOwner && !isSellerOwner
      ? "BUYER"
      : user.role === "ADMIN"
        ? "ADMIN"
        : isAssignedPartner
          ? "DELIVERY_PARTNER"
          : "SELLER";
  const check = canTransition(order.status as OrderStatus, status, actor);
  if (!check.allowed) return jsonError(check.reason ?? "Forbidden", check.status ?? 400);

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.order.update({
      where: { id: order.id },
      data: isCancellingOrRejecting
        ? { status, cancelledById: user.id, cancelReason: reason, cancelledAt: new Date() }
        : status === "PICKED_UP"
          ? { status, pickedUpAt: new Date() }
          : { status },
    });

    if (isCancellingOrRejecting) {
      // Restore the stock reserved at checkout.
      for (const item of order.items) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stockQuantity: { increment: item.quantity } },
          });
        } else {
          await tx.product.update({
            where: { id: item.productId },
            data: { stockQuantity: { increment: item.quantity } },
          });
        }
        await tx.inventoryLog.create({
          data: {
            productId: item.productId,
            variantId: item.variantId,
            change: item.quantity,
            reason: "RETURN",
            orderId: order.id,
            actorId: user.id,
            note: `Order ${status.toLowerCase()}`,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: status,
          entityType: "Order",
          entityId: order.id,
          metadata: reason ? { reason } : undefined,
        },
      });
    }

    // COD is "paid" on successful delivery — reconciled here rather than at
    // order creation, matching real cash-on-delivery settlement.
    if (status === "DELIVERED" && order.paymentMethod === "COD" && order.payment?.status === "PENDING") {
      await tx.payment.update({
        where: { id: order.payment.id },
        data: { status: "PAID", paidAt: new Date() },
      });
      return tx.order.update({ where: { id: order.id }, data: { paymentStatus: "PAID" } });
    }

    return result;
  });

  if (status === "CANCELLED") {
    await createNotification({
      userId: order.store.ownerId,
      type: "ORDER_CANCELLED",
      title: "Order cancelled",
      body: `Order ${order.orderNumber} was cancelled by the buyer.${reason ? ` Reason: ${reason}` : ""}`,
      relatedOrderId: order.id,
      templateKey: "order_cancelled",
      vars: { orderNumber: order.orderNumber, reason: reason ? ` Reason: ${reason}` : "" },
    });
  } else {
    await createNotification({
      userId: order.buyerId,
      type: status === "CONFIRMED" ? "ORDER_CONFIRMED" : "ORDER_STATUS_CHANGED",
      title: `Order ${STATUS_LABEL[status] ?? status.toLowerCase()}`,
      body:
        status === "REJECTED"
          ? `Your order ${order.orderNumber} from ${order.store.name} was rejected.${reason ? ` Reason: ${reason}` : ""}`
          : `Your order ${order.orderNumber} from ${order.store.name} is now ${STATUS_LABEL[status] ?? status.toLowerCase()}.`,
      relatedOrderId: order.id,
      templateKey: TEMPLATE_KEY_BY_STATUS[status],
      vars: { orderNumber: order.orderNumber, storeName: order.store.name },
    });
  }

  return NextResponse.json({ order: updated });
});
