import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withApiErrors } from "@/lib/api-utils";
import { writeAuditLog } from "@/lib/audit";
import { FEATURE_FLAG_CATALOG } from "@/lib/feature-flags";

export const GET = withApiErrors(async () => {
  await requireRole("ADMIN");
  const rows = await prisma.featureFlag.findMany();
  const rowByKey = new Map(rows.map((r) => [r.key, r]));

  const flags = FEATURE_FLAG_CATALOG.map((f) => ({
    key: f.key,
    label: f.label,
    description: f.description,
    isEnabled: rowByKey.get(f.key)?.isEnabled ?? true,
  }));

  return NextResponse.json({ flags });
});

const updateSchema = z.object({
  key: z.string().min(1),
  isEnabled: z.boolean(),
});

export const PATCH = withApiErrors(async (req: NextRequest) => {
  const admin = await requireRole("ADMIN");
  const body = updateSchema.parse(await req.json());

  const known = FEATURE_FLAG_CATALOG.find((f) => f.key === body.key);
  if (!known) return NextResponse.json({ error: "Unknown feature flag key" }, { status: 400 });

  const flag = await prisma.featureFlag.upsert({
    where: { key: body.key },
    update: { isEnabled: body.isEnabled },
    create: { key: body.key, isEnabled: body.isEnabled, description: known.description },
  });

  await writeAuditLog({
    actorId: admin.id,
    action: body.isEnabled ? "FEATURE_FLAG_ENABLED" : "FEATURE_FLAG_DISABLED",
    entityType: "FeatureFlag",
    entityId: flag.id,
    metadata: { key: body.key },
  });

  return NextResponse.json({ flag });
});
