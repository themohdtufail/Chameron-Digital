import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withApiErrors, jsonError } from "@/lib/api-utils";
import { writeAuditLog } from "@/lib/audit";

const updateSchema = z.object({
  name: z.string().trim().min(1).max(40).optional(),
  priceMonthly: z.number().min(0).max(1000000).optional(),
  features: z
    .object({
      maxProducts: z.number().int().min(0).nullable(),
      ai: z.boolean(),
      whatsappTemplates: z.boolean(),
      advancedAnalytics: z.boolean(),
    })
    .optional(),
});

export const PATCH = withApiErrors(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const admin = await requireRole("ADMIN");
  const body = updateSchema.parse(await req.json());

  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: params.id } });
  if (!plan) return jsonError("Plan not found", 404);

  const updated = await prisma.subscriptionPlan.update({
    where: { id: plan.id },
    data: {
      name: body.name,
      priceMonthly: body.priceMonthly,
      features: body.features,
    },
  });

  await writeAuditLog({
    actorId: admin.id,
    action: "SUBSCRIPTION_PLAN_UPDATED",
    entityType: "SubscriptionPlan",
    entityId: plan.id,
  });

  return NextResponse.json({ plan: updated });
});
