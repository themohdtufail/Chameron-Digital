import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withApiErrors, jsonError } from "@/lib/api-utils";
import { writeAuditLog } from "@/lib/audit";

const updateSchema = z.object({ isActive: z.boolean() });

export const PATCH = withApiErrors(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const admin = await requireRole("ADMIN");
  if (admin.id === params.id) return jsonError("You cannot deactivate your own account", 400);

  const body = updateSchema.parse(await req.json());
  const user = await prisma.user.update({ where: { id: params.id }, data: { isActive: body.isActive } });

  await writeAuditLog({
    actorId: admin.id,
    action: body.isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED",
    entityType: "User",
    entityId: user.id,
  });

  return NextResponse.json({ user: { id: user.id, isActive: user.isActive } });
});
