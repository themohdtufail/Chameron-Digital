import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { locationSchema } from "@/lib/validation";
import { withApiErrors } from "@/lib/api-utils";

export const GET = withApiErrors(async () => {
  const user = await requireUser();
  const locations = await prisma.location.findMany({
    where: { userId: user.id },
    orderBy: [{ isCurrent: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ locations });
});

export const POST = withApiErrors(async (req: NextRequest) => {
  const user = await requireUser();
  const body = locationSchema.parse(await req.json());

  if (body.isCurrent) {
    await prisma.location.updateMany({
      where: { userId: user.id, isCurrent: true },
      data: { isCurrent: false },
    });
  }

  const location = await prisma.location.create({
    data: { ...body, userId: user.id },
  });

  return NextResponse.json({ location });
});
