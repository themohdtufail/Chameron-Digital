import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withApiErrors, jsonError } from "@/lib/api-utils";
import { writeAuditLog } from "@/lib/audit";

export const GET = withApiErrors(async () => {
  await requireRole("ADMIN");
  const rules = await prisma.commissionRule.findMany({
    include: { category: { select: { name: true } }, store: { select: { name: true } } },
    orderBy: [{ scope: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ rules });
});

const createSchema = z
  .object({
    scope: z.enum(["GLOBAL", "CATEGORY", "STORE"]),
    categoryId: z.string().optional(),
    storeId: z.string().optional(),
    percentage: z.number().min(0).max(100),
  })
  .refine((v) => v.scope !== "CATEGORY" || v.categoryId, { message: "categoryId is required for a CATEGORY rule" })
  .refine((v) => v.scope !== "STORE" || v.storeId, { message: "storeId is required for a STORE rule" });

export const POST = withApiErrors(async (req: NextRequest) => {
  const admin = await requireRole("ADMIN");
  const body = createSchema.parse(await req.json());

  // Only one rule per (scope, target) — replace rather than accumulate.
  const existing = await prisma.commissionRule.findFirst({
    where: {
      scope: body.scope,
      categoryId: body.scope === "CATEGORY" ? body.categoryId : null,
      storeId: body.scope === "STORE" ? body.storeId : null,
    },
  });
  if (existing) return jsonError("A rule for this scope/target already exists. Edit or delete it instead.", 409);

  const rule = await prisma.commissionRule.create({
    data: {
      scope: body.scope,
      categoryId: body.scope === "CATEGORY" ? body.categoryId : undefined,
      storeId: body.scope === "STORE" ? body.storeId : undefined,
      percentage: body.percentage,
    },
  });

  await writeAuditLog({
    actorId: admin.id,
    action: "COMMISSION_RULE_CREATED",
    entityType: "CommissionRule",
    entityId: rule.id,
    metadata: { scope: body.scope, percentage: body.percentage },
  });

  return NextResponse.json({ rule });
});
