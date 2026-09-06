import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { withApiErrors, jsonError } from "@/lib/api-utils";
import { createNotification } from "@/lib/notify";
import { writeAuditLog } from "@/lib/audit";

const NOT_YET_ASSIGNABLE = new Set(["DELIVERED", "CANCELLED", "REJECTED"]);

const assignSchema = z.object({
  deliveryPartnerId: z.string().nullable(),
});

/** Seller (own store) or admin assigns/unassigns a delivery partner from
 * their pool of admin-approved partners — platform-wide, no geo-matching
 * in this pass (see decision #4 in the Phase 3 plan). */
export const PATCH = withApiErrors(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const user = await requireUser();
  const { deliveryPartnerId } = assignSchema.parse(await req.json());

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { store: { select: { ownerId: true } } },
  });
  if (!order) return jsonError("Order not found", 404);

  const isSellerOwner = order.store.ownerId === user.id;
  if (!isSellerOwner && user.role !== "ADMIN") return jsonError("Forbidden", 403);
  if (NOT_YET_ASSIGNABLE.has(order.status)) {
    return jsonError("This order can no longer be assigned a delivery partner", 400);
  }

  if (deliveryPartnerId) {
    const partner = await prisma.deliveryPartner.findUnique({
      where: { id: deliveryPartnerId },
      include: { user: { select: { id: true, name: true } } },
    });
    if (!partner || partner.status !== "APPROVED") {
      return jsonError("Delivery partner is not available", 400);
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { deliveryPartnerId: partner.userId, deliveryAssignedAt: new Date() },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "DELIVERY_PARTNER_ASSIGNED",
      entityType: "Order",
      entityId: order.id,
      metadata: { deliveryPartnerId: partner.userId },
    });

    await createNotification({
      userId: partner.userId,
      type: "DELIVERY_ASSIGNED",
      title: "New delivery assigned",
      body: `You've been assigned order ${order.orderNumber} for delivery.`,
      relatedOrderId: order.id,
    });

    return NextResponse.json({ order: updated });
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { deliveryPartnerId: null, deliveryAssignedAt: null },
  });

  await writeAuditLog({
    actorId: user.id,
    action: "DELIVERY_PARTNER_UNASSIGNED",
    entityType: "Order",
    entityId: order.id,
  });

  return NextResponse.json({ order: updated });
});
