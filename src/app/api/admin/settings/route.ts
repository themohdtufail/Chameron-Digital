import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withApiErrors } from "@/lib/api-utils";
import { writeAuditLog } from "@/lib/audit";
import { SETTINGS_CATALOG } from "@/lib/settings";

export const GET = withApiErrors(async () => {
  await requireRole("ADMIN");
  const rows = await prisma.platformSetting.findMany();
  const valueByKey = new Map(rows.map((r) => [r.key, r.value]));

  const settings = SETTINGS_CATALOG.map((s) => ({
    key: s.key,
    label: s.label,
    group: s.group,
    default: s.default,
    value: valueByKey.get(s.key) ?? s.default,
    isOverridden: valueByKey.has(s.key),
  }));

  return NextResponse.json({ settings });
});

const updateSchema = z.object({
  key: z.string().min(1),
  value: z.string().max(500),
});

export const PATCH = withApiErrors(async (req: NextRequest) => {
  const admin = await requireRole("ADMIN");
  const body = updateSchema.parse(await req.json());

  const known = SETTINGS_CATALOG.find((s) => s.key === body.key);
  if (!known) return NextResponse.json({ error: "Unknown setting key" }, { status: 400 });

  const setting = await prisma.platformSetting.upsert({
    where: { key: body.key },
    update: { value: body.value },
    create: { key: body.key, value: body.value, group: known.group },
  });

  await writeAuditLog({
    actorId: admin.id,
    action: "PLATFORM_SETTING_UPDATED",
    entityType: "PlatformSetting",
    entityId: setting.id,
    metadata: { key: body.key, value: body.value },
  });

  return NextResponse.json({ setting });
});
