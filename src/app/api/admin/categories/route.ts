import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withApiErrors, jsonError } from "@/lib/api-utils";
import { slugify } from "@/lib/utils";

export const GET = withApiErrors(async () => {
  await requireRole("ADMIN");
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { stores: true } } },
  });
  return NextResponse.json({ categories });
});

const createSchema = z.object({ name: z.string().trim().min(2).max(40), icon: z.string().trim().max(4).optional() });

export const POST = withApiErrors(async (req: NextRequest) => {
  await requireRole("ADMIN");
  const body = createSchema.parse(await req.json());
  const slug = slugify(body.name);

  const existing = await prisma.category.findUnique({ where: { slug } });
  if (existing) return jsonError("A category with this name already exists", 409);

  const category = await prisma.category.create({ data: { name: body.name, slug, icon: body.icon } });
  return NextResponse.json({ category });
});
