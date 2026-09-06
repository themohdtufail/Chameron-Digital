import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withApiErrors, jsonError } from "@/lib/api-utils";
import { writeAuditLog } from "@/lib/audit";

const updateSchema = z.object({ isActive: z.boolean() });

export const PATCH = withApiErrors(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const admin = await requireRole("ADMIN");
  const body = updateSchema.parse(await req.json());

  const city = await prisma.city.findUnique({ where: { id: params.id } });
  if (!city) return jsonError("City not found", 404);

  const updated = await prisma.city.update({ where: { id: city.id }, data: { isActive: body.isActive } });

  await writeAuditLog({
    actorId: admin.id,
    action: body.isActive ? "CITY_ACTIVATED" : "CITY_DEACTIVATED",
    entityType: "City",
    entityId: city.id,
  });

  return NextResponse.json({ city: updated });
});
