import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withApiErrors } from "@/lib/api-utils";

const updateSchema = z.object({ isActive: z.boolean().optional(), name: z.string().trim().min(2).max(40).optional() });

export const PATCH = withApiErrors(async (req: NextRequest, { params }: { params: { id: string } }) => {
  await requireRole("ADMIN");
  const body = updateSchema.parse(await req.json());
  const category = await prisma.category.update({ where: { id: params.id }, data: body });
  return NextResponse.json({ category });
});

export const DELETE = withApiErrors(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  await requireRole("ADMIN");
  await prisma.category.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
});
