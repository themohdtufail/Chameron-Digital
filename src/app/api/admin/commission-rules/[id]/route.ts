import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withApiErrors, jsonError } from "@/lib/api-utils";
import { writeAuditLog } from "@/lib/audit";

const updateSchema = z.object({ percentage: z.number().min(0).max(100) });

export const PATCH = withApiErrors(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const admin = await requireRole("ADMIN");
  const { percentage } = updateSchema.parse(await req.json());

  const rule = await prisma.commissionRule.findUnique({ where: { id: params.id } });
  if (!rule) return jsonError("Rule not found", 404);

  const updated = await prisma.commissionRule.update({ where: { id: rule.id }, data: { percentage } });

  await writeAuditLog({
    actorId: admin.id,
    action: "COMMISSION_RULE_UPDATED",
    entityType: "CommissionRule",
    entityId: rule.id,
    metadata: { percentage },
  });

  return NextResponse.json({ rule: updated });
});

export const DELETE = withApiErrors(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const admin = await requireRole("ADMIN");
  const rule = await prisma.commissionRule.findUnique({ where: { id: params.id } });
  if (!rule) return jsonError("Rule not found", 404);

  await prisma.commissionRule.delete({ where: { id: rule.id } });

  await writeAuditLog({
    actorId: admin.id,
    action: "COMMISSION_RULE_DELETED",
    entityType: "CommissionRule",
    entityId: rule.id,
  });

  return NextResponse.json({ success: true });
});
