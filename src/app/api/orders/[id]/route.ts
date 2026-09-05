import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { withApiErrors, jsonError } from "@/lib/api-utils";

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
  PREPARING: ["COMPLETED"],
};

const updateSchema = z.object({
  status: z.enum(["CONFIRMED", "PREPARING", "COMPLETED", "REJECTED", "CANCELLED"]),
});

export const PATCH = withApiErrors(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const user = await requireUser();
  const { status } = updateSchema.parse(await req.json());

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { store: { select: { ownerId: true } } },
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
  return NextResponse.json({ order: updated });
});
