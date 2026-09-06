import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withApiErrors, jsonError } from "@/lib/api-utils";

const createSchema = z.object({ name: z.string().trim().min(2).max(60) });

export const POST = withApiErrors(async (req: NextRequest, { params }: { params: { id: string } }) => {
  await requireRole("ADMIN");
  const body = createSchema.parse(await req.json());

  const city = await prisma.city.findUnique({ where: { id: params.id } });
  if (!city) return jsonError("City not found", 404);

  const existing = await prisma.area.findUnique({ where: { cityId_name: { cityId: city.id, name: body.name } } });
  if (existing) return jsonError("This area already exists in this city", 409);

  const area = await prisma.area.create({ data: { cityId: city.id, name: body.name } });
  return NextResponse.json({ area });
});
