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
});

export const PATCH = withApiErrors(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const user = await requireUser();
  const { status } = updateSchema.parse(await req.json());

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { store: { select: { ownerId: true, name: true } } },
  });
  if (!order) return jsonError("Order not found", 404);

  const isSellerOwner = order.store.ownerId === user.id;
  const isBuyerOwner = order.buyerId === user.id;

  if (status === "CANCELLED") {
    if (!isBuyerOwner) return jsonError("Only the buyer can cancel an order", 403);
    if (order.status !== "PENDING") return jsonError("This order can no longer be cancelled", 400);
  } else {
    if (!isSellerOwner && user.role !== "ADMIN") return jsonError("Forbidden", 403);
    const allowed = STATUS_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(status)) {
      return jsonError(`Cannot move order from ${order.status} to ${status}`, 400);
    }
  }

  const updated = await prisma.order.update({ where: { id: order.id }, data: { status } });

  if (status === "CANCELLED") {
    await createNotification({
      userId: order.store.ownerId,
      type: "ORDER_CANCELLED",
      title: "Order cancelled",
      body: `Order ${order.orderNumber} was cancelled by the buyer.`,
      relatedOrderId: order.id,
    });
  } else {
    await createNotification({
      userId: order.buyerId,
      type: status === "CONFIRMED" ? "ORDER_CONFIRMED" : "ORDER_STATUS_CHANGED",
      title: `Order ${STATUS_LABEL[status] ?? status.toLowerCase()}`,
      body: `Your order ${order.orderNumber} from ${order.store.name} is now ${STATUS_LABEL[status] ?? status.toLowerCase()}.`,
      relatedOrderId: order.id,
    });
  }

  return NextResponse.json({ order: updated });
});
