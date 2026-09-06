import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { withApiErrors, jsonError } from "@/lib/api-utils";
import { createNotification } from "@/lib/notify";

const STATUS_LABEL: Record<string, string> = {
  CONFIRMED: "confirmed",
  PREPARING: "being prepared",
  READY: "ready for pickup/delivery",
  OUT_FOR_DELIVERY: "out for delivery",
  DELIVERED: "delivered",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
};

export const GET = withApiErrors(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const user = await requireUser();
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      items: true,
      store: { select: { id: true, name: true, logoUrl: true, slug: true, phone: true, ownerId: true } },
      buyer: { select: { name: true, phone: true } },
      address: true,
    },
  });
  if (!order) return jsonError("Order not found", 404);

  const isBuyerOwner = order.buyerId === user.id;
  const isSellerOwner = order.store.ownerId === user.id;
  if (!isBuyerOwner && !isSellerOwner && user.role !== "ADMIN") return jsonError("Forbidden", 403);

  return NextResponse.json({ order });
});

// A buyer can still back out through CONFIRMED (before the seller has started
// preparing it); once PREPARING begins, only the 8-state forward path or a
// seller-initiated REJECTED applies.
const BUYER_CANCELLABLE_STATUSES = ["PENDING", "CONFIRMED"];

const STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "REJECTED"],
  CONFIRMED: ["PREPARING", "REJECTED"],
  PREPARING: ["READY"],
  READY: ["OUT_FOR_DELIVERY"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
};

const updateSchema = z.object({
  status: z.enum([
    "CONFIRMED",
    "PREPARING",
    "READY",
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
    include: { store: { select: { ownerId: true, name: true } }, items: true },
  });
  if (!order) return jsonError("Order not found", 404);

  const isSellerOwner = order.store.ownerId === user.id;
  const isBuyerOwner = order.buyerId === user.id;
  const isCancellingOrRejecting = status === "CANCELLED" || status === "REJECTED";

  if (status === "CANCELLED") {
    if (!isBuyerOwner) return jsonError("Only the buyer can cancel an order", 403);
    if (!BUYER_CANCELLABLE_STATUSES.includes(order.status)) {
      return jsonError("This order can no longer be cancelled", 400);
    }
  } else {
    if (!isSellerOwner && user.role !== "ADMIN") return jsonError("Forbidden", 403);
    if (status === "REJECTED") {
      const allowed = STATUS_TRANSITIONS[order.status]?.includes("REJECTED");
      if (!allowed) return jsonError("This order can no longer be rejected", 400);
    } else {
      const allowed = STATUS_TRANSITIONS[order.status] ?? [];
      if (!allowed.includes(status)) {
        return jsonError(`Cannot move order from ${order.status} to ${status}`, 400);
      }
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.order.update({
      where: { id: order.id },
      data: isCancellingOrRejecting
        ? { status, cancelledById: user.id, cancelReason: reason, cancelledAt: new Date() }
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

    return result;
  });

  if (status === "CANCELLED") {
    await createNotification({
      userId: order.store.ownerId,
      type: "ORDER_CANCELLED",
      title: "Order cancelled",
      body: `Order ${order.orderNumber} was cancelled by the buyer.${reason ? ` Reason: ${reason}` : ""}`,
      relatedOrderId: order.id,
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
    });
  }

  return NextResponse.json({ order: updated });
});
