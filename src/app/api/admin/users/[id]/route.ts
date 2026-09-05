import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withApiErrors, jsonError } from "@/lib/api-utils";

const updateSchema = z.object({ isActive: z.boolean() });

export const PATCH = withApiErrors(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const admin = await requireRole("ADMIN");
  if (admin.id === params.id) return jsonError("You cannot deactivate your own account", 400);

  const body = updateSchema.parse(await req.json());
  const user = await prisma.user.update({ where: { id: params.id }, data: { isActive: body.isActive } });
  return NextResponse.json({ user: { id: user.id, isActive: user.isActive } });
});
