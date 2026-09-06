import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withApiErrors, jsonError } from "@/lib/api-utils";
import { writeAuditLog } from "@/lib/audit";

export const GET = withApiErrors(async () => {
  await requireRole("ADMIN");
  const cities = await prisma.city.findMany({
    include: { areas: { orderBy: { name: "asc" } }, _count: { select: { stores: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ cities });
});

const createSchema = z.object({
  name: z.string().trim().min(2).max(60),
  state: z.string().trim().min(2).max(60),
});

export const POST = withApiErrors(async (req: NextRequest) => {
  const admin = await requireRole("ADMIN");
  const body = createSchema.parse(await req.json());

  const existing = await prisma.city.findUnique({ where: { name: body.name } });
  if (existing) return jsonError("A city with this name already exists", 409);

  const city = await prisma.city.create({ data: { name: body.name, state: body.state } });

  await writeAuditLog({ actorId: admin.id, action: "CITY_CREATED", entityType: "City", entityId: city.id });

  return NextResponse.json({ city });
});
