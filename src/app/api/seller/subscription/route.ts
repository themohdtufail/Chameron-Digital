import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withApiErrors, jsonError } from "@/lib/api-utils";
import { isSubscriptionLive } from "@/lib/subscription";
import { writeAuditLog } from "@/lib/audit";

const SUBSCRIPTION_DAYS = 30;

export const GET = withApiErrors(async () => {
  const user = await requireRole("SELLER");
  const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
  if (!store) return jsonError("Store not found", 404);

  let subscription = await prisma.sellerSubscription.findUnique({
    where: { storeId: store.id },
    include: { plan: true },
  });

  if (subscription && !isSubscriptionLive(subscription) && (subscription.status === "ACTIVE" || subscription.status === "TRIAL")) {
    subscription = await prisma.sellerSubscription.update({
      where: { id: subscription.id },
      data: { status: "EXPIRED" },
      include: { plan: true },
    });
  }

  const productCount = await prisma.product.count({ where: { storeId: store.id } });

  return NextResponse.json({ subscription, productCount });
});

const switchSchema = z.object({ planKey: z.enum(["STARTER", "GROWTH", "PREMIUM"]) });

/** Immediate, no-proration plan switch — a real gateway would collect
 * payment first; no gateway credentials exist for recurring billing yet,
 * so this is a self-serve switch that starts a fresh 30-day cycle. */
export const PATCH = withApiErrors(async (req: NextRequest) => {
  const user = await requireRole("SELLER");
  const { planKey } = switchSchema.parse(await req.json());

  const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
  if (!store) return jsonError("Store not found", 404);

  const plan = await prisma.subscriptionPlan.findUnique({ where: { key: planKey } });
  if (!plan) return jsonError("Plan not found", 404);

  const now = new Date();
  const expiryDate = new Date(now.getTime() + SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000);

  const subscription = await prisma.sellerSubscription.upsert({
    where: { storeId: store.id },
    update: { planId: plan.id, status: "ACTIVE", startDate: now, expiryDate },
    create: { storeId: store.id, planId: plan.id, status: "ACTIVE", startDate: now, expiryDate },
    include: { plan: true },
  });

  await writeAuditLog({
    actorId: user.id,
    action: "SUBSCRIPTION_CHANGED",
    entityType: "SellerSubscription",
    entityId: subscription.id,
    metadata: { planKey },
  });

  return NextResponse.json({ subscription });
});
